import { performance } from "node:perf_hooks";
import type { Client, Message } from "discord.js";
import { CommandManager, type IMatchedCommand, isError } from "knub-command-manager";
import type { AnyPluginData } from "../../plugins/PluginData.ts";
import type { MessageCommandBlueprint } from "./messageCommandBlueprint.ts";
import {
  type CommandContext,
  type CommandExtraData,
  type CommandFn,
  type ContextualCommandMessage,
  type MessageCommandMeta,
  type MessageCommandSignatureOrArray,
  type PluginCommandDefinition,
  checkCommandCooldown,
  checkCommandLocks,
  checkCommandPermission,
  getDefaultMessageCommandPrefix,
  getMessageCommandSignature,
  restrictCommandSource,
} from "./messageCommandUtils.ts";

export interface PluginCommandManagerOpts {
  prefix?: string | RegExp;
}

/**
 * A module to manage and run commands for a single instance of a plugin
 */
export class PluginMessageCommandManager<TPluginData extends AnyPluginData<any>> {
  private pluginData: TPluginData | undefined;
  private manager: CommandManager<CommandContext<TPluginData>, CommandExtraData<TPluginData>>;
  private handlers: Map<number, CommandFn<TPluginData, any>>;
  private commandAddedListeners: Set<CommandLifecycleListener<TPluginData>> = new Set();
  private commandDeletedListeners: Set<CommandRemovedListener<TPluginData>> = new Set();
  private runningHandlers: Set<Promise<void>> = new Set();

  constructor(client: Client, opts: PluginCommandManagerOpts = {}) {
    this.manager = new CommandManager<CommandContext<TPluginData>, CommandExtraData<TPluginData>>({
      prefix: opts.prefix ?? getDefaultMessageCommandPrefix(client),
    });

    this.handlers = new Map<number, CommandFn<TPluginData, any>>();
  }

  public setPluginData(pluginData: TPluginData): void {
    if (this.pluginData) {
      throw new Error("Plugin data already set");
    }

    this.pluginData = pluginData;
  }

  public add<TSignature extends MessageCommandSignatureOrArray<TPluginData["_pluginType"]>>(
    blueprint: MessageCommandBlueprint<TPluginData, TSignature>,
  ): void {
    const existingCommand = this.findCommandByBlueprint(blueprint);
    if (existingCommand) {
      this.remove(existingCommand.id, "replaced");
    }

    const preFilters = Array.from(blueprint.config?.preFilters ?? []);
    preFilters.unshift(restrictCommandSource, checkCommandPermission);

    const postFilters = Array.from(blueprint.config?.postFilters ?? []);
    postFilters.unshift(checkCommandCooldown, checkCommandLocks);

    const config = {
      ...blueprint.config,
      preFilters,
      postFilters,
      extra: {
        blueprint,
      },
    };

    const command = this.manager.add(blueprint.trigger, blueprint.signature, config);
    this.handlers.set(command.id, blueprint.run);

    this.emitCommandAdded({
      blueprint,
      command,
      pluginData: this.pluginData!,
    });
  }

  public remove(id: number, reason: CommandRemovalReason = "manual"): void {
    const command = this.manager.get(id);
    if (!command) {
      return;
    }

    this.manager.remove(id);
    this.handlers.delete(id);

    this.emitCommandDeleted({
      blueprint: command.config!.extra?.blueprint as MessageCommandBlueprint<TPluginData, any>,
      command,
      pluginData: this.pluginData!,
      reason,
    });
  }

  public getAll(): PluginCommandDefinition[] {
    return this.manager.getAll();
  }

  public removeByTrigger(trigger: string): boolean {
    const command = this.findCommandByTrigger(trigger);
    if (!command) {
      return false;
    }

    this.remove(command.id, "manual");
    return true;
  }

  public onCommandAdded(listener: CommandLifecycleListener<TPluginData>): () => void {
    this.commandAddedListeners.add(listener);
    return () => {
      this.commandAddedListeners.delete(listener);
    };
  }

  public onCommandDeleted(listener: CommandRemovedListener<TPluginData>): () => void {
    this.commandDeletedListeners.add(listener);
    return () => {
      this.commandDeletedListeners.delete(listener);
    };
  }

  private addRunningHandler(awaitable: any): void {
    const promise = Promise.resolve(awaitable).finally(() => {
      this.runningHandlers.delete(promise);
    });
    this.runningHandlers.add(promise);
  }

  public async waitForRunningHandlers(timeout: number): Promise<void> {
    const { promise, resolve, reject } = Promise.withResolvers<void>();

    // Basically Promise.race(), but we remove the timeout as soon as the main promise resolves so tests don't hang
    Promise.all(Array.from(this.runningHandlers))
      .then(() => resolve())
      .catch((err) => reject(err));
    const timeoutId = setTimeout(() => resolve(), timeout);
    promise.finally(() => clearTimeout(timeoutId));

    return promise;
  }

  public async runFromMessage(msg: Message): Promise<void> {
    if (msg.content == null || msg.content.trim() === "") {
      return;
    }

    const command = await this.manager.findMatchingCommand(msg.content, {
      message: msg,
      pluginData: this.pluginData!,
    });

    if (!command) {
      return;
    }

    if (isError(command)) {
      const usageLine = getMessageCommandSignature(command.command);
      void msg.reply(`${command.error}\nUsage: \`${usageLine}\``);
      return;
    }

    const extraMeta: Partial<MessageCommandMeta<TPluginData, any>> = {};
    if (command.config!.extra?._lock) {
      extraMeta.lock = command.config!.extra._lock;
    }

    await this.runCommand(msg as ContextualCommandMessage<TPluginData>, command, extraMeta);
  }

  private async runCommand(
    msg: ContextualCommandMessage<TPluginData>,
    matchedCommand: IMatchedCommand<CommandContext<TPluginData>, CommandExtraData<TPluginData>>,
    extraMeta?: Partial<MessageCommandMeta<TPluginData, any>>,
  ): Promise<void> {
    const handler = this.handlers.get(matchedCommand.id);
    if (!handler) {
      throw new Error(`Command handler for command ${matchedCommand.id} does not exist`);
    }

    const valueMap = Object.entries(matchedCommand.values).reduce((map, [key, matched]) => {
      map[key] = matched.value;
      return map;
    }, {});

    const meta: MessageCommandMeta<TPluginData, any> = {
      ...extraMeta,
      args: valueMap,
      message: msg as any,
      pluginData: this.pluginData!,
      command: matchedCommand,
    };

    const startTime = performance.now();
    this.addRunningHandler(handler(meta));
    await handler(meta);
    const commandName =
      typeof matchedCommand.originalTriggers[0] === "string"
        ? matchedCommand.originalTriggers[0]
        : matchedCommand.originalTriggers[0].source;
    this.pluginData!.getKnubInstance().profiler.addDataPoint(`command:${commandName}`, performance.now() - startTime);
  }

  private emitCommandAdded(event: CommandLifecycleEvent<TPluginData>): void {
    for (const listener of this.commandAddedListeners) {
      try {
        this.addRunningHandler(listener(event));
      } catch (e) {
        throw e;
      }
    }
  }

  private emitCommandDeleted(event: CommandRemovedEvent<TPluginData>): void {
    for (const listener of this.commandDeletedListeners) {
      try {
        this.addRunningHandler(listener(event));
      } catch (e) {
        throw e;
      }
    }
  }

  private findCommandByBlueprint(
    blueprint: MessageCommandBlueprint<TPluginData, any>,
  ): PluginCommandDefinition | undefined {
    return this.manager
      .getAll()
      .find((cmd) => triggersEqual(getBlueprintTriggers(cmd.config!.extra?.blueprint), getBlueprintTriggers(blueprint)));
  }

  private findCommandByTrigger(trigger: string): PluginCommandDefinition | undefined {
    return this.manager
      .getAll()
      .find((cmd) => getBlueprintTriggers(cmd.config!.extra?.blueprint).includes(trigger));
  }
}

export type CommandRemovalReason = "manual" | "replaced";

export interface CommandLifecycleEvent<TPluginData extends AnyPluginData<any>> {
  command: PluginCommandDefinition;
  blueprint: MessageCommandBlueprint<TPluginData, any>;
  pluginData: TPluginData;
}

export interface CommandRemovedEvent<TPluginData extends AnyPluginData<any>>
  extends CommandLifecycleEvent<TPluginData> {
  reason: CommandRemovalReason;
}

export type CommandLifecycleListener<TPluginData extends AnyPluginData<any>> = (
  event: CommandLifecycleEvent<TPluginData>,
) => void;

export type CommandRemovedListener<TPluginData extends AnyPluginData<any>> = (
  event: CommandRemovedEvent<TPluginData>,
) => void;

function getBlueprintTriggers(
  blueprint?: MessageCommandBlueprint<any, any>,
): string[] {
  if (!blueprint) {
    return [];
  }

  return Array.isArray(blueprint.trigger) ? blueprint.trigger : [blueprint.trigger];
}

function triggersEqual(first: string[], second: string[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((trigger, index) => second[index] === trigger);
}
