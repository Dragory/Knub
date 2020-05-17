import {
  CommandManager,
  findMatchingCommandResultHasError,
  IArgumentMap,
  ICommandDefinition,
  IMatchedOptionMap,
  TTypeConverterFn,
} from "knub-command-manager";
import {
  checkCommandCooldown,
  checkCommandLocks,
  checkCommandPermission,
  CommandContext,
  CommandFn,
  CommandMeta,
  getCommandSignature,
  getDefaultPrefix,
  ICommandExtraData,
  PluginCommandDefinition,
  restrictCommandSource,
} from "./commandUtils";
import { baseArgumentTypes } from "./baseArgumentTypes";
import { Client, Message } from "eris";
import { PluginData } from "../plugins/PluginData";
import { CommandBlueprint } from "./CommandBlueprint";
import { BasePluginType } from "../plugins/pluginTypes";

export interface PluginCommandManagerOpts<TCommandContext> {
  prefix?: string | RegExp;
  customArgumentTypes?: {
    [key: string]: TTypeConverterFn<TCommandContext>;
  };
}

/**
 * A module to manage and run commands for a single instance of a plugin
 */
export class PluginCommandManager<TPluginType extends BasePluginType> {
  private pluginData: PluginData<TPluginType>;
  private manager: CommandManager<CommandContext<TPluginType>, ICommandExtraData<TPluginType>>;
  private handlers: Map<number, CommandFn<TPluginType>>;

  constructor(client: Client, opts: PluginCommandManagerOpts<CommandContext<TPluginType>> = {}) {
    this.manager = new CommandManager<CommandContext<TPluginType>, ICommandExtraData<TPluginType>>({
      prefix: opts.prefix ?? getDefaultPrefix(client),
      types: {
        ...baseArgumentTypes,
        ...opts.customArgumentTypes,
      },
    });

    this.handlers = new Map();
  }

  public setPluginData(pluginData: PluginData<TPluginType>) {
    if (this.pluginData) {
      throw new Error("Plugin data already set");
    }

    this.pluginData = pluginData;
  }

  public add(blueprint: CommandBlueprint<TPluginType>) {
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

    const command = this.manager.add(blueprint.trigger, blueprint.parameters, config);
    this.handlers.set(command.id, blueprint.run);
  }

  public remove(id: number) {
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
      pluginData: this.pluginData,
    });

    if (!command) {
      return;
    }

    if (findMatchingCommandResultHasError(command)) {
      const usageLine = getCommandSignature(command.command);
      msg.channel.createMessage(`${command.error}\nUsage: \`${usageLine}\``);
      return;
    }

    const extraMeta: Partial<CommandMeta<TPluginType>> = {};
    if (command.config.extra?._lock) {
      extraMeta.lock = command.config.extra._lock;
    }

    await this.runCommand(msg, command, command.args, command.opts, extraMeta);
  }

  private async runCommand(
    msg: Message,
    command: ICommandDefinition<CommandContext<TPluginType>, ICommandExtraData<TPluginType>>,
    args: IArgumentMap = {},
    opts: IMatchedOptionMap = {},
    extraMeta?: Partial<CommandMeta<TPluginType>>
  ): Promise<void> {
    const handler = this.handlers.get(command.id);

    const argValueMap = Object.entries(args).reduce((map, [key, arg]) => {
      map[key] = arg.value;
      return map;
    }, {});

    const optValueMap = Object.entries(opts).reduce((map, [key, opt]) => {
      map[key] = opt.value;
      return map;
    }, {});

    const finalArgs = { ...argValueMap, ...optValueMap };
    const meta: CommandMeta<TPluginType> = {
      ...extraMeta,
      message: msg,
      pluginData: this.pluginData,
      command,
    };

    await handler(finalArgs, meta);
  }
}
