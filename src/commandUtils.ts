import { Client, Guild, GuildChannel, TextChannel, Message, PrivateChannel, VoiceChannel } from "eris";
import { Awaitable, getChannelId, getRoleId, getUserId, noop } from "./utils";
import { disableCodeBlocks } from "./helpers";
import { logger } from "./logger";
import {
  ICommandConfig,
  ICommandDefinition,
  CommandManager,
  TOption,
  IMatchedCommand,
  IParameter,
  TTypeConverterFn,
  TSignature,
  isSwitchOption,
  TFindMatchingCommandResult
} from "knub-command-manager";
import escapeStringRegex from "escape-string-regexp";
import { Plugin } from "./Plugin";
import { Lock } from "./LockManager";
import { PluginData } from "./PluginData";
import { hasPermission } from "./pluginUtils";
import { EventHandlerProps, EventMiddleware } from "./pluginEventMiddleware";

export function getDefaultPrefix(client: Client): RegExp {
  return new RegExp(`<@!?${client.user.id}> `);
}

export interface CommandContext {
  message: Message;
  pluginData: PluginData;
}

export type PluginCommandConfig = ICommandConfig<CommandContext, unknown>;
export type PluginCommandDefinition = ICommandDefinition<CommandContext, unknown>;

export type CommandFn = (msg: Message, args: any, props: EventHandlerProps) => Awaitable<void>;

export interface CommandBlueprint {
  trigger: string;
  parameters?: IParameter[];
  config?: PluginCommandConfig;
}

export interface ICustomArgumentTypesMap {
  [key: string]: TTypeConverterFn<CommandContext>;
}

interface CommandEventHandlerProps extends EventHandlerProps {
  command: TFindMatchingCommandResult<CommandContext, unknown>;
  args: { [key: string]: any };
  error?: string;
}

interface CommandFnProps extends CommandEventHandlerProps {
  command: IMatchedCommand<CommandContext, unknown>;
  args: { [key: string]: any };
}

export type CommandEventMiddleware = EventMiddleware<any, CommandEventHandlerProps>;

/**
 * Wrapper for command handlers that converts event handler args (for "messageCreate")
 * to a cleaner set of arguments used for command handlers
 */
export function eventArgsToCommandArgs(targetFn) {
  return function([msg], props) {
    return targetFn.call(this, msg, props.args, props);
  };
}

/**
 * Returns a readable command signature string for the given command.
 * Trigger is passed as a string instead of using the "triggers" property of the command to allow choosing which
 * trigger of potentially multiple ones to show and in what format.
 */
export function getCommandSignature(
  command: PluginCommandDefinition,
  overrideTrigger?: string,
  overrideSignature?: TSignature
) {
  const signature = overrideSignature || command.signatures[0];
  const paramStrings = signature.map(param => {
    return param.required ? `<${param.name}>` : `[${param.name}]`;
  });
  const optStrings = (command.options || []).map(opt => {
    const required = isSwitchOption(opt) ? false : opt.required;
    return required ? `<-${opt.name}>` : `[-${opt.name}]`;
  });

  const prefix =
    command.originalPrefix != null
      ? typeof command.originalPrefix === "string"
        ? command.originalPrefix
        : command.originalPrefix.source
      : null;

  const trigger =
    overrideTrigger != null
      ? overrideTrigger
      : typeof command.originalTriggers[0] === "string"
      ? command.originalTriggers[0]
      : command.originalTriggers[0].source;

  const usageLine = `${prefix}${trigger} ${paramStrings.join(" ")} ${optStrings.join(" ")}`.replace(/\s+/g, " ").trim();

  return usageLine;
}
