import { CommandFn, PluginCommandConfig, TSignatureOrArray } from "./commandUtils";
import { BasePluginType } from "../plugins/pluginTypes";
import { AnyPluginData, GlobalPluginData, GuildPluginData } from "../plugins/PluginData";

type CommandSource = "guild" | "group" | "dm";

export interface CommandBlueprint<
  TPluginData extends AnyPluginData<any>,
  _TSignature extends TSignatureOrArray<TPluginData["_pluginType"]>
> {
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
  TSignature extends TSignatureOrArray<TPluginData>
>(
  blueprint: CommandBlueprint<TPluginData, TSignature>
) => CommandBlueprint<TPluginData, TSignature>;

function command<TPluginData extends AnyPluginData<BasePluginType>>(...args) {
  if (args.length === 1) {
    // (blueprint)
    // Return command blueprint
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return args[0];
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
export function typedGuildCommand<_TSignature extends TSignatureOrArray<any>>(
  blueprint: CommandBlueprint<GuildPluginData<any>, _TSignature>
): CommandBlueprint<GuildPluginData<any>, _TSignature>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function typedGuildCommand<TPluginType extends BasePluginType>(): CommandBlueprintCreator<
  GuildPluginData<TPluginType>
>;

export function typedGuildCommand(...args: any[]): any {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return command<GuildPluginData<any>>(...args);
}

/**
 * Helper function that creates a command blueprint for a global command.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `globalCommand<TPluginType>()(blueprint)`
 */
export function typedGlobalCommand<_TSignature extends TSignatureOrArray<any>>(
  blueprint: CommandBlueprint<GlobalPluginData<any>, _TSignature>
): CommandBlueprint<GlobalPluginData<any>, _TSignature>;
/**
 * Specify `TPluginType` for type hints and return self
 */
export function typedGlobalCommand<TPluginType extends BasePluginType>(): CommandBlueprintCreator<
  GlobalPluginData<TPluginType>
>;

export function typedGlobalCommand(...args: any[]): any {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return command<GlobalPluginData<any>>(...args);
}
