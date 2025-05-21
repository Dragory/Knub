import { ChannelType, type Client, type Message } from "discord.js";
import {
  type ICommandConfig as MessageCommandConfig,
  type ICommandDefinition as MessageCommandDefinition,
  type TOption as MessageCommandOption,
  type IParameter as MessageCommandParameter,
  type TSafeSignature as MessageCommandSafeSignature,
  type TSignature as MessageCommandSignature,
  toSafeSignature as toMessageCommandSafeSignature,
} from "knub-command-manager";
import { hasPermission } from "../../helpers.ts";
import type { Lock } from "../../locks/LockManager.ts";
import type { AnyPluginData, GuildPluginData } from "../../plugins/PluginData.ts";
import type { BasePluginType } from "../../plugins/pluginTypes.ts";
import { GuildMessage } from "../../types.ts";
import type { Awaitable } from "../../utils.ts";
import type { MessageCommandBlueprint } from "./messageCommandBlueprint.ts";

export type MessageCommandSignatureOrArray<TPluginData extends AnyPluginData<any>> =
  | MessageCommandSignature<CommandContext<TPluginData>>
  | Array<MessageCommandSignature<CommandContext<TPluginData>>>;

export function getDefaultMessageCommandPrefix(client: Client): RegExp {
  return new RegExp(`<@!?${client.user!.id}> `);
}

export type ContextualCommandMessage<TPluginData extends AnyPluginData<any>> = TPluginData extends GuildPluginData<any>
  ? Message<true>
  : Message;

export interface MessageCommandMeta<TPluginData extends AnyPluginData<any>, TArguments> {
  args: TArguments;
  message: ContextualCommandMessage<TPluginData>;
  command: MessageCommandDefinition<any, any>;
  pluginData: TPluginData;
  lock?: Lock;
}

/**
 * Command signatures are objects where each property contains a parameter/option object.
 * Each parameter/option object in turn contains a `type` function. ArgsFromSignature maps the signature object
 * to the return types of said type functions. For example, if the signature had a "name" property with a type function
 * that returns a string, ArgsFromSignature would return `{ name: string }`.
 */
type MessageCommandArgsFromSignature<T extends MessageCommandSignature<any>> = {
  [K in keyof T]: T[K] extends MessageCommandParameter<any> | MessageCommandOption<any>
    ? ParameterOrOptionType<T[K]>
    : never;
};

/**
 * Higher level wrapper for ArgsFromSignature that also supports multiple signatures,
 * returning a union type of possible sets of arguments.
 */
export type ArgsFromSignatureOrArray<T extends MessageCommandSignatureOrArray<any>> = ArgsFromSignatureUnion<
  SignatureToArray<T>[number]
>;

// Needed to distribute the union type properly
// See https://github.com/microsoft/TypeScript/issues/28339#issuecomment-463577347
type ArgsFromSignatureUnion<T extends MessageCommandSignature<any>> = T extends any
  ? MessageCommandArgsFromSignature<T>
  : never;

type SignatureToArray<T> = T extends any[] ? T : [T];

type PromiseType<T> = T extends PromiseLike<infer U> ? U : T;

type ParameterOrOptionType<T extends MessageCommandParameter<any> | MessageCommandOption<any>> =
  T extends MessageCommandParameter<any>
    ? T["rest"] extends true
      ? Array<PromiseType<ReturnType<T["type"]>>>
      : PromiseType<ReturnType<T["type"]>>
    : PromiseType<ReturnType<T["type"]>>;

export type CommandFn<
  TPluginData extends AnyPluginData<any>,
  _TSignature extends MessageCommandSignatureOrArray<TPluginData>,
> = (meta: MessageCommandMeta<TPluginData, ArgsFromSignatureOrArray<_TSignature>>) => Awaitable<void>;

export interface CommandContext<TPluginData extends AnyPluginData<any>> {
  message: Message;
  pluginData: TPluginData;
  lock?: Lock;
}

export interface CommandExtraData<TPluginData extends AnyPluginData<any>> {
  blueprint: MessageCommandBlueprint<TPluginData, any>;
  _lock?: Lock;
}

export type PluginCommandDefinition = MessageCommandDefinition<CommandContext<any>, CommandExtraData<any>>;
export type PluginCommandConfig = MessageCommandConfig<CommandContext<any>, CommandExtraData<any>>;

/**
 * Returns a readable command signature string for the given command.
 * Trigger is passed as a string instead of using the "triggers" property of the command to allow choosing which
 * trigger of potentially multiple ones to show and in what format.
 */
export function getMessageCommandSignature(
  command: PluginCommandDefinition,
  overrideTrigger?: string,
  overrideSignature?: MessageCommandSignature<any>,
): string {
  const signature: MessageCommandSafeSignature<any> = toMessageCommandSafeSignature(
    overrideSignature || command.signatures[0] || {},
  );
  const signatureEntries = Object.entries(signature);
  const parameters = signatureEntries.filter(([_, param]) => param.option !== true) as Array<
    [string, MessageCommandParameter<any>]
  >;
  const options = signatureEntries.filter(([_, opt]) => opt.option === true) as Array<
    [string, MessageCommandOption<any>]
  >;

  const paramStrings = parameters.map(([name, param]) => {
    return param.required ? `<${name}>` : `[${name}]`;
  });
  const optStrings = options.map(([name, _opt]) => {
    return `[-${name}]`;
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

  const usageLine = `${String(prefix)}${trigger} ${paramStrings.join(" ")} ${optStrings.join(" ")}`
    .replace(/\s+/g, " ")
    .trim();

  return usageLine;
}

/**
 * Command pre-filter to restrict the command to the plugin's guilds, unless
 * allowed for DMs
 */
export function restrictCommandSource(cmd: PluginCommandDefinition, context: CommandContext<any>): boolean {
  let source = cmd.config!.extra?.blueprint.source ?? "guild";
  if (!Array.isArray(source)) source = [source];

  if (context.message.channel.type === ChannelType.DM && source.includes("dm")) {
    return true;
  }

  if (context.message.channel.type !== ChannelType.DM && source.includes("guild")) {
    return true;
  }

  return false;
}

/**
 * Command pre-filter to restrict the command by specifying a required
 * permission
 */
export async function checkCommandPermission<
  TPluginType extends BasePluginType,
  TPluginData extends AnyPluginData<TPluginType>,
>(cmd: PluginCommandDefinition, context: CommandContext<TPluginData>): Promise<boolean> {
  const permission = cmd.config!.extra?.blueprint.permission;

  // No permission defined, default to "no permission"
  // If types are checked, this condition should never be true, but it's a safeguard
  if (permission === undefined) return false;

  // If permission isn't set to a `null`, check it matches
  if (permission) {
    const config = await context.pluginData.config.getForMessage(context.message);
    if (!hasPermission(config, permission)) {
      return false;
    }
  }

  return true;
}

/**
 * Command post-filter to check if the command's on cooldown and, if not, to put
 * it on cooldown
 */
export async function checkCommandCooldown<
  TPluginType extends BasePluginType,
  TPluginData extends AnyPluginData<TPluginType>,
>(cmd: PluginCommandDefinition, context: CommandContext<TPluginData>): Promise<boolean> {
  if (cmd.config!.extra?.blueprint.cooldown) {
    const cdKey = `${cmd.id}-${context.message.author.id}`;

    const cdValue =
      typeof cmd.config!.extra.blueprint.cooldown === "object"
        ? cmd.config!.extra.blueprint.cooldown.amount
        : cmd.config!.extra.blueprint.cooldown;
    const cdPermission =
      typeof cmd.config!.extra.blueprint.cooldown === "object" ? cmd.config!.extra.blueprint.cooldown.permission : null;

    let cdApplies = true;
    if (cdPermission) {
      const config = await context.pluginData.config.getForMessage(context.message);
      cdApplies = hasPermission(config, cdPermission);
    }

    if (cdApplies && context.pluginData.cooldowns.isOnCooldown(cdKey)) {
      // We're on cooldown
      return false;
    }

    context.pluginData.cooldowns.setCooldown(cdKey, cdValue);
  }

  return true;
}

/**
 * Command post-filter to wait for and trigger any locks the command has, and to
 * interrupt command execution if the lock gets interrupted before it
 */
export async function checkCommandLocks<
  TPluginType extends BasePluginType,
  TPluginData extends AnyPluginData<TPluginType>,
>(cmd: PluginCommandDefinition, context: CommandContext<TPluginData>): Promise<boolean> {
  if (!cmd.config?.extra?.blueprint.locks) {
    return true;
  }

  const lock = await context.pluginData.locks.acquire(cmd.config.extra.blueprint.locks);
  cmd.config.extra._lock = lock;
  return !lock.interrupted;
}
