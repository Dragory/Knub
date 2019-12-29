import { Client, Guild, GuildChannel, TextChannel, Message, PrivateChannel, VoiceChannel } from "eris";
import { getChannelId, getRoleId, getUserId } from "./utils";
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
  isSwitchOption
} from "knub-command-manager";
import escapeStringRegex from "escape-string-regexp";
import { Plugin } from "./Plugin";
import { Lock } from "./LockManager";

export function getDefaultPrefix(client: Client): RegExp {
  return new RegExp(`<@!?${client.user.id}> `);
}

export interface ICommandExtraData {
  requiredPermission?: string;
  allowDMs?: boolean;
  locks?: string | string[];
  cooldown?: number;
  cooldownPermission?: string;
  info?: any;
  _lock?: Lock;
}

export interface ICommandContext {
  message: Message;
  bot: Client;
  plugin: Plugin<any>;
}

export interface IPluginCommandDefinition extends ICommandDefinition<ICommandContext, ICommandExtraData> {}
export interface IPluginCommandConfig extends ICommandConfig<ICommandContext, ICommandExtraData> {}
export interface IPluginCommandManager extends CommandManager<ICommandContext, ICommandExtraData> {}

export interface ICustomArgumentTypesMap {
  [key: string]: TTypeConverterFn<ICommandContext>;
}

export interface ICommandHandlerArgsArg {
  [key: string]: any;
}

export type TCommandHandler = (
  msg: Message,
  argsToPass: ICommandHandlerArgsArg,
  command: ICommandDefinition<ICommandContext, ICommandExtraData>
) => void | Promise<void>;

export function createCommandTriggerRegexp(src: string | RegExp): RegExp {
  return typeof src === "string" ? new RegExp(escapeStringRegex(src), "i") : src;
}

/**
 * Returns a readable command signature string for the given command.
 * Trigger is passed as a string instead of using the "triggers" property of the command to allow choosing which
 * trigger of potentially multiple ones to show and in what format.
 */
export function getCommandSignature(
  command: ICommandDefinition<ICommandContext, ICommandExtraData>,
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
