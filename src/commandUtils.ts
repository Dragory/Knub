import { Client, Guild, GuildChannel, TextChannel, Message, PrivateChannel, VoiceChannel } from "eris";
import { getChannelId, getRoleId, getUserId } from "./utils";
import { disableCodeBlocks } from "./helpers";
import { logger } from "./logger";
import {
  CommandConfig,
  CommandDefinition,
  CommandManager,
  CommandOption,
  FindMatchingCommandError,
  MatchedCommand,
  Parameter,
  TypeConverterFn
} from "knub-command-manager";
import escapeStringRegex from "escape-string-regexp";
import { Plugin } from "./Plugin";
import { Lock } from "./LockManager";

export function getDefaultPrefix(client: Client) {
  return `/<@!?${client.user.id}> /`;
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

export interface IKnubPluginCommandDefinition extends CommandDefinition<ICommandContext, ICommandExtraData> {}
export interface IKnubPluginCommandConfig extends CommandConfig<ICommandContext, ICommandExtraData> {}
export interface IKnubPluginCommandManager extends CommandManager<ICommandContext, ICommandExtraData> {}

export interface ICustomArgumentTypesMap {
  [key: string]: TypeConverterFn<ICommandContext>;
}

export interface ICommandHandlerArgsArg {
  [key: string]: any;
}

export type TCommandHandler = (msg: Message, argsToPass: ICommandHandlerArgsArg, command) => void | Promise<void>;

export function createCommandTriggerRegexp(src: string | RegExp): RegExp {
  return typeof src === "string" ? new RegExp(escapeStringRegex(src), "i") : src;
}

export function isCommandMatchError<TContext, TConfigExtra>(
  result: MatchedCommand<TContext, TConfigExtra> | FindMatchingCommandError<TContext, TConfigExtra> | null
): result is FindMatchingCommandError<TContext, TConfigExtra> {
  return result.error != null;
}

/**
 * Returns a readable command signature string for the given command.
 * Trigger is passed as a string instead of using the "triggers" property of the command to allow choosing which
 * trigger of potentially multiple ones to show and in what format.
 */
export function getCommandSignature(
  prefix: string,
  trigger: string,
  command: CommandDefinition<ICommandContext, ICommandExtraData>
) {
  const paramStrings = (command.parameters || []).map(param => {
    return param.required ? `<${param.name}>` : `[${param.name}]`;
  });
  const optStrings = (command.options || []).map(opt => {
    return `[--${opt.name}]`;
  });

  const usageLine = `${prefix}${trigger} ${paramStrings.join(" ")} ${optStrings.join(" ")}`.replace(/\s+/g, " ").trim();

  return usageLine;
}
