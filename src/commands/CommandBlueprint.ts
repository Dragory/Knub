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

type CommandBlueprintCreatorIdentity<TPluginData extends AnyPluginData<any>> = <
  TSignature extends TSignatureOrArray<TPluginData>
>(
  blueprint: CommandBlueprint<TPluginData, TSignature>
) => CommandBlueprint<TPluginData, TSignature>;

type CommandBlueprintCreatorWithoutSignature<TPluginData extends AnyPluginData<any>> = (
  // We can't replace CommandBlueprint<TPluginType, any> with a generic because it breaks type inference
  trigger: CommandBlueprint<TPluginData, any>["trigger"],
  run: CommandBlueprint<TPluginData, any>["run"]
) => CommandBlueprint<TPluginData, any>;

type CommandBlueprintCreatorWithoutOptions<TPluginData extends AnyPluginData<any>> = <
  TSignature extends TSignatureOrArray<TPluginData>
>(
  // We can't replace CommandBlueprint<TPluginType, TSignature> with a generic because it breaks type inference
  trigger: CommandBlueprint<TPluginData, TSignature>["trigger"],
  signature: CommandBlueprint<TPluginData, TSignature>["signature"],
  run: CommandBlueprint<TPluginData, TSignature>["run"]
) => CommandBlueprint<TPluginData, TSignature>;

type CommandBlueprintCreatorWithOptions<TPluginData extends AnyPluginData<any>> = <
  TSignature extends TSignatureOrArray<TPluginData>
>(
  // We can't replace CommandBlueprint<TPluginType, TSignature> with a generic because it breaks type inference
  trigger: CommandBlueprint<TPluginData, TSignature>["trigger"],
  signature: CommandBlueprint<TPluginData, TSignature>["signature"],
  options: Omit<CommandBlueprint<TPluginData, TSignature>, "trigger" | "signature" | "run">,
  run: CommandBlueprint<TPluginData, TSignature>["run"]
) => CommandBlueprint<TPluginData, TSignature>;

// prettier-ignore
type CommandBlueprintCreator<TPluginData extends AnyPluginData<any>> =
  & CommandBlueprintCreatorIdentity<TPluginData>
  & CommandBlueprintCreatorWithoutSignature<TPluginData>
  & CommandBlueprintCreatorWithoutOptions<TPluginData>
  & CommandBlueprintCreatorWithOptions<TPluginData>;

function command<TPluginData extends AnyPluginData<BasePluginType>>(...args) {
  if (args.length === 1) {
    // (blueprint)
    // Return command blueprint
    return args[0];
  }
  if (args.length === 2) {
    // (trigger, run)
    // Return command blueprint
    return {
      trigger: args[0],
      run: args[1],
      permission: null,
    };
  } else if (args.length === 3) {
    // (trigger, signature, run)
    // Return command blueprint
    return {
      trigger: args[0],
      signature: args[1],
      run: args[2],
      permission: null,
    };
  } else if (args.length === 4) {
    // (trigger, signature, options, run)
    // Return command blueprint
    return {
      ...args[2],
      trigger: args[0],
      signature: args[1],
      run: args[3],
    };
  } else if (args.length === 0) {
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
export function guildCommand<_TSignature extends TSignatureOrArray<any>>(
  blueprint: CommandBlueprint<GuildPluginData<any>, _TSignature>
): CommandBlueprint<GuildPluginData<any>, _TSignature>;

/**
 * Helper function that creates a command blueprint for a guild command.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `guildCommand<TPluginType>()(trigger, run)`
 */
export function guildCommand(
  // We can't replace CommandBlueprint<BasePluginType, any> with a generic because it breaks type inference
  trigger: CommandBlueprint<GuildPluginData<any>, {}>["trigger"],
  run: CommandBlueprint<GuildPluginData<any>, {}>["run"]
): CommandBlueprint<GuildPluginData<any>, {}>;

/**
 * Helper function that creates a command blueprint for a guild command.
 * Used for type inference between `signature` and the arguments for `run()`.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `guildCommand<TPluginType>()(trigger, signature, run)`
 */
export function guildCommand<_TSignature extends TSignatureOrArray<any>>(
  // We can't replace CommandBlueprint<BasePluginType, _TSignature> with a generic because it breaks type inference
  trigger: CommandBlueprint<GuildPluginData<any>, _TSignature>["trigger"],
  signature: CommandBlueprint<GuildPluginData<any>, _TSignature>["signature"],
  run: CommandBlueprint<GuildPluginData<any>, _TSignature>["run"]
): CommandBlueprint<GuildPluginData<any>, _TSignature>;

/**
 * Helper function that creates a command blueprint for a guild command.
 * Used for type inference between `signature` and the arguments for `run()`.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `guildCommand<TPluginType>()(trigger, signature, options, run)`
 */
export function guildCommand<_TSignature extends TSignatureOrArray<any>>(
  // We can't replace CommandBlueprint<BasePluginType, _TSignature> with a generic because it breaks type inference
  trigger: CommandBlueprint<GuildPluginData<any>, _TSignature>["trigger"],
  signature: CommandBlueprint<GuildPluginData<any>, _TSignature>["signature"],
  options: Omit<CommandBlueprint<GuildPluginData<any>, _TSignature>, "trigger" | "signature" | "run">,
  run: CommandBlueprint<GuildPluginData<any>, _TSignature>["run"]
): CommandBlueprint<GuildPluginData<any>, _TSignature>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function guildCommand<TPluginData extends AnyPluginData<any>>(): CommandBlueprintCreator<TPluginData>;

export function guildCommand(...args) {
  return command<GuildPluginData<any>>(...args);
}

/**
 * Helper function that creates a command blueprint for a global command.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `globalCommand<TPluginType>()(blueprint)`
 */
export function globalCommand<_TSignature extends TSignatureOrArray<any>>(
  blueprint: CommandBlueprint<GlobalPluginData<any>, _TSignature>
): CommandBlueprint<GlobalPluginData<any>, _TSignature>;

/**
 * Helper function that creates a command blueprint for a global command.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `globalCommand<TPluginType>()(trigger, run)`
 */
export function globalCommand(
  // We can't replace CommandBlueprint<BasePluginType, any> with a generic because it breaks type inference
  trigger: CommandBlueprint<GlobalPluginData<any>, {}>["trigger"],
  run: CommandBlueprint<GlobalPluginData<any>, {}>["run"]
): CommandBlueprint<GlobalPluginData<any>, {}>;

/**
 * Helper function that creates a command blueprint for a global command.
 * Used for type inference between `signature` and the arguments for `run()`.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `globalCommand<TPluginType>()(trigger, signature, run)`
 */
export function globalCommand<_TSignature extends TSignatureOrArray<any>>(
  // We can't replace CommandBlueprint<BasePluginType, _TSignature> with a generic because it breaks type inference
  trigger: CommandBlueprint<GlobalPluginData<any>, _TSignature>["trigger"],
  signature: CommandBlueprint<GlobalPluginData<any>, _TSignature>["signature"],
  run: CommandBlueprint<GlobalPluginData<any>, _TSignature>["run"]
): CommandBlueprint<GlobalPluginData<any>, _TSignature>;

/**
 * Helper function that creates a command blueprint for a global command.
 * Used for type inference between `signature` and the arguments for `run()`.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `globalCommand<TPluginType>()(trigger, signature, options, run)`
 */
export function globalCommand<_TSignature extends TSignatureOrArray<any>>(
  // We can't replace CommandBlueprint<BasePluginType, _TSignature> with a generic because it breaks type inference
  trigger: CommandBlueprint<GlobalPluginData<any>, _TSignature>["trigger"],
  signature: CommandBlueprint<GlobalPluginData<any>, _TSignature>["signature"],
  options: Omit<CommandBlueprint<GlobalPluginData<any>, _TSignature>, "trigger" | "signature" | "run">,
  run: CommandBlueprint<GlobalPluginData<any>, _TSignature>["run"]
): CommandBlueprint<GlobalPluginData<any>, _TSignature>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function globalCommand<TPluginData extends AnyPluginData<any>>(): CommandBlueprintCreator<TPluginData>;

export function globalCommand(...args) {
  return command<GlobalPluginData<any>>(...args);
}
