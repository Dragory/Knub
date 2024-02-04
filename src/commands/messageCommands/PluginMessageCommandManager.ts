import { Client, Message } from "discord.js";
import { CommandManager, IMatchedCommand, isError } from "knub-command-manager";
import { performance } from "perf_hooks";
import { AnyPluginData } from "../../plugins/PluginData";
import { MessageCommandBlueprint } from "./messageCommandBlueprint";
import {
  CommandContext,
  CommandExtraData,
  CommandFn,
  ContextualCommandMessage,
  MessageCommandMeta,
  MessageCommandSignatureOrArray,
  PluginCommandDefinition,
  checkCommandCooldown,
  checkCommandLocks,
  checkCommandPermission,
  getDefaultMessageCommandPrefix,
  getMessageCommandSignature,
  restrictCommandSource,
} from "./messageCommandUtils";

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
  }

  public remove(id: number): void {
    this.manager.remove(id);
    this.handlers.delete(id);
  }

  public getAll(): PluginCommandDefinition[] {
    return this.manager.getAll();
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
      void msg.channel.send(`${command.error}\nUsage: \`${usageLine}\``);
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
    await handler(meta);
    const commandName =
      typeof matchedCommand.originalTriggers[0] === "string"
        ? matchedCommand.originalTriggers[0]
        : matchedCommand.originalTriggers[0].source;
    this.pluginData!.getKnubInstance().profiler.addDataPoint(`command:${commandName}`, performance.now() - startTime);
  }
}
