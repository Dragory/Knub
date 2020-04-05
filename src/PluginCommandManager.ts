import {
  CommandManager,
  findMatchingCommandResultHasError,
  IArgumentMap,
  ICommandConfig,
  ICommandDefinition,
  IMatchedCommand,
  IMatchedOptionMap,
  IParameter,
  isError,
  TFindMatchingCommandResult
} from "knub-command-manager";
import {
  getCommandSignature,
  getDefaultPrefix,
  CommandContext,
  CommandFn,
  CommandBlueprint,
  PluginCommandDefinition,
  CommandEventMiddleware
} from "./commandUtils";
// tslint:disable-next-line:no-submodule-imports
import { TTypeConverterFn } from "knub-command-manager/dist/types";
import { baseParameterTypes } from "./baseParameterTypes";
import { Client, Message } from "eris";
import { PluginData } from "./PluginData";
import { OnOpts } from "./PluginEventManager";
import {
  chainMiddleware,
  EventHandlerMeta,
  EventHandlerProps,
  EventMiddleware,
  ignoreBots,
  ignoreSelf,
  onlyPluginGuild
} from "./pluginEventMiddleware";
import cloneDeep from "lodash.clonedeep";
import { noop } from "./utils";

export interface PluginCommandManagerOpts<TContext> {
  prefix: string | RegExp;
  customArgumentTypes: {
    [key: string]: TTypeConverterFn<CommandContext>;
  };
}

function extractCommandArgValues(command: IMatchedCommand<any, any>) {
  const argValueMap = Object.entries(command.args).reduce((map, [key, arg]) => {
    map[key] = arg.value;
    return map;
  }, {});

  const optValueMap = Object.entries(command.opts).reduce((map, [key, opt]) => {
    map[key] = opt.value;
    return map;
  }, {});

  return { ...argValueMap, ...optValueMap };
}

/**
 * A module to manage and run commands for a single instance of a plugin
 */
export class PluginCommandManager {
  private pluginData: PluginData;
  private manager: CommandManager<CommandContext, unknown>;

  constructor(client: Client, opts: PluginCommandManagerOpts<CommandContext>) {
    this.manager = new CommandManager<CommandContext, unknown>({
      prefix: opts.prefix ?? getDefaultPrefix(client),
      types: {
        ...baseParameterTypes,
        ...opts.customArgumentTypes
      }
    });
  }

  public setPluginData(pluginData: PluginData) {
    if (this.pluginData) {
      throw new Error("Plugin data already set");
    }

    this.pluginData = pluginData;
  }

  public create(definition: CommandBlueprint, opts?: OnOpts): { id: number; middleware: CommandEventMiddleware } {
    const command = this.manager.add(definition.trigger, definition.parameters, definition.config);
    const matcherMiddleware: CommandEventMiddleware = async ([msg], props) => {
      // If the command no longer exists in the manager, don't continue
      if (!this.manager.get(command.id)) {
        return;
      }

      // Empty messages can't trigger commands
      if (msg.content == null || msg.content.trim() === "") {
        return;
      }

      const result = await this.manager.tryMatchingCommand(command, msg.content, {
        message: msg,
        pluginData: this.pluginData
      });

      if (isError(result)) {
        const usageLine = getCommandSignature(command);
        msg.channel.createMessage(`${result.error}\nUsage: \`${usageLine}\``);
        return;
      }

      props.command = result.command;
      props.args = extractCommandArgValues(result.command);

      return props.next();
    };

    return {
      id: command.id,
      middleware: matcherMiddleware
    };
  }

  public remove(id: number) {
    this.manager.remove(id);
  }

  public getAll(): PluginCommandDefinition[] {
    return this.manager.getAll();
  }
}
