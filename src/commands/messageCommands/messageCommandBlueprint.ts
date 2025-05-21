import type { AnyPluginData, GlobalPluginData, GuildPluginData } from "../../plugins/PluginData.ts";
import type { BasePluginType } from "../../plugins/pluginTypes.ts";
import type { CommandFn, MessageCommandSignatureOrArray, PluginCommandConfig } from "./messageCommandUtils.ts";

type CommandSource = "guild" | "dm";

export interface MessageCommandBlueprint<
  TPluginData extends AnyPluginData<any>,
  _TSignature extends MessageCommandSignatureOrArray<TPluginData["_pluginType"]>,
> {
  type: "message";

  trigger: string | string[];
  signature?: _TSignature;
  run: CommandFn<TPluginData, _TSignature>;
  config?: PluginCommandConfig;

  // Required permission name
  permission: string | null;

  // Restrict the source of the command. Defaults to guild messages only.
  source?: CommandSource | CommandSource[];

  // Locks to wait for before running the command, and to acquire for the duration of the command
  locks?: string | string[];

  // Command cooldown. Time is in milliseconds.
  cooldown?:
    | number
    | {
        amount: number;
        permission: string;
      };

  // Description of the command
  description?: string;

  // Usage information for the command
  usage?: string;
}

type CommandBlueprintCreator<TPluginData extends AnyPluginData<any>> = <
  TSignature extends MessageCommandSignatureOrArray<TPluginData>,
>(
  blueprint: Omit<MessageCommandBlueprint<TPluginData, TSignature>, "type">,
) => MessageCommandBlueprint<TPluginData, TSignature>;

function command<TPluginData extends AnyPluginData<BasePluginType>>(...args) {
  if (args.length === 1) {
    // (blueprint)
    // Return command blueprint with proper type
    return {
      ...args[0],
      type: "message",
    };
  }

  if (args.length === 0) {
    // No arguments, with TPluginType - return self
    return command as CommandBlueprintCreator<TPluginData>;
  }

  throw new Error(`No signature of command() takes ${args.length} arguments`);
}

/**
 * Helper function that creates a command blueprint for a guild command.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `guildCommand<TPluginType>()(blueprint)`
 */
export function guildPluginMessageCommand<TSignature extends MessageCommandSignatureOrArray<any>>(
  blueprint: Omit<MessageCommandBlueprint<GuildPluginData<any>, TSignature>, "type">,
): MessageCommandBlueprint<GuildPluginData<any>, TSignature>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function guildPluginMessageCommand<TPluginType extends BasePluginType>(): CommandBlueprintCreator<
  GuildPluginData<TPluginType>
>;

export function guildPluginMessageCommand(...args: any[]): any {
  return command<GuildPluginData<any>>(...args);
}

/**
 * Helper function that creates a command blueprint for a global command.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `globalCommand<TPluginType>()(blueprint)`
 */
export function globalPluginMessageCommand<TSignature extends MessageCommandSignatureOrArray<any>>(
  blueprint: Omit<MessageCommandBlueprint<GlobalPluginData<any>, TSignature>, "type">,
): MessageCommandBlueprint<GlobalPluginData<any>, TSignature>;
/**
 * Specify `TPluginType` for type hints and return self
 */
export function globalPluginMessageCommand<TPluginType extends BasePluginType>(): CommandBlueprintCreator<
  GlobalPluginData<TPluginType>
>;

export function globalPluginMessageCommand(...args: any[]): any {
  return command<GlobalPluginData<any>>(...args);
}
