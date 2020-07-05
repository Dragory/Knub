import { CommandFn, PluginCommandConfig, TSignatureOrArray } from "./commandUtils";
import { BasePluginType } from "../plugins/pluginTypes";

type CommandSource = "guild" | "group" | "dm";

export interface CommandBlueprint<
  TPluginType extends BasePluginType,
  _TSignature extends TSignatureOrArray<TPluginType>
> {
  trigger: string | string[];
  signature?: _TSignature;
  run: CommandFn<TPluginType, _TSignature>;
  config?: PluginCommandConfig;

  // Required permission name
  permission?: string;

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

type CommandBlueprintCreatorIdentity<TPluginType extends BasePluginType> = <
  TSignature extends TSignatureOrArray<TPluginType>
>(
  blueprint: CommandBlueprint<TPluginType, TSignature>
) => CommandBlueprint<TPluginType, TSignature>;

type CommandBlueprintCreatorWithoutSignature<TPluginType extends BasePluginType> = (
  // We can't replace CommandBlueprint<TPluginType, any> with a generic because it breaks type inference
  trigger: CommandBlueprint<TPluginType, any>["trigger"],
  run: CommandBlueprint<TPluginType, any>["run"]
) => CommandBlueprint<TPluginType, any>;

type CommandBlueprintCreatorWithoutOptions<TPluginType extends BasePluginType> = <
  TSignature extends TSignatureOrArray<TPluginType>
>(
  // We can't replace CommandBlueprint<TPluginType, TSignature> with a generic because it breaks type inference
  trigger: CommandBlueprint<TPluginType, TSignature>["trigger"],
  signature: CommandBlueprint<TPluginType, TSignature>["signature"],
  run: CommandBlueprint<TPluginType, TSignature>["run"]
) => CommandBlueprint<TPluginType, TSignature>;

type CommandBlueprintCreatorWithOptions<TPluginType extends BasePluginType> = <
  TSignature extends TSignatureOrArray<TPluginType>
>(
  // We can't replace CommandBlueprint<TPluginType, TSignature> with a generic because it breaks type inference
  trigger: CommandBlueprint<TPluginType, TSignature>["trigger"],
  signature: CommandBlueprint<TPluginType, TSignature>["signature"],
  options: Omit<CommandBlueprint<TPluginType, TSignature>, "trigger" | "signature" | "run">,
  run: CommandBlueprint<TPluginType, TSignature>["run"]
) => CommandBlueprint<TPluginType, TSignature>;

// prettier-ignore
type CommandBlueprintCreator<TPluginType extends BasePluginType> =
  & CommandBlueprintCreatorIdentity<TPluginType>
  & CommandBlueprintCreatorWithoutSignature<TPluginType>
  & CommandBlueprintCreatorWithoutOptions<TPluginType>
  & CommandBlueprintCreatorWithOptions<TPluginType>;

/**
 * Helper function that creates a command blueprint.
 *
 * To specify `TPluginType` for additional type hints, use: `command<TPluginType>()(blueprint)`
 */
export function command<_TSignature extends TSignatureOrArray<any>>(
  blueprint: CommandBlueprint<any, _TSignature>
): CommandBlueprint<any, _TSignature>;

/**
 * Helper function that creates a command blueprint.
 *
 * To specify `TPluginType` for additional type hints, use: `command<TPluginType>()(trigger, run)`
 */
export function command(
  // We can't replace CommandBlueprint<BasePluginType, any> with a generic because it breaks type inference
  trigger: CommandBlueprint<any, {}>["trigger"],
  run: CommandBlueprint<any, {}>["run"]
): CommandBlueprint<any, {}>;

/**
 * Helper function that creates a command blueprint.
 * Used for type inference between `signature` and the arguments for `run()`.
 *
 * To specify `TPluginType` for additional type hints, use: `command<TPluginType>()(trigger, signature, run)`
 */
export function command<_TSignature extends TSignatureOrArray<any>>(
  // We can't replace CommandBlueprint<BasePluginType, _TSignature> with a generic because it breaks type inference
  trigger: CommandBlueprint<any, _TSignature>["trigger"],
  signature: CommandBlueprint<any, _TSignature>["signature"],
  run: CommandBlueprint<any, _TSignature>["run"]
): CommandBlueprint<any, _TSignature>;

/**
 * Helper function that creates a command blueprint.
 * Used for type inference between `signature` and the arguments for `run()`.
 *
 * To specify `TPluginType` for additional type hints, use: `command<TPluginType>()(trigger, signature, options, run)`
 */
export function command<_TSignature extends TSignatureOrArray<any>>(
  // We can't replace CommandBlueprint<BasePluginType, _TSignature> with a generic because it breaks type inference
  trigger: CommandBlueprint<any, _TSignature>["trigger"],
  signature: CommandBlueprint<any, _TSignature>["signature"],
  options: Omit<CommandBlueprint<any, _TSignature>, "trigger" | "signature" | "run">,
  run: CommandBlueprint<any, _TSignature>["run"]
): CommandBlueprint<any, _TSignature>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function command<TPluginType extends BasePluginType>(): CommandBlueprintCreator<TPluginType>;

/**
 * Implementation of the various overloads above
 */
export function command(...args) {
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
    };
  } else if (args.length === 3) {
    // (trigger, signature, run)
    // Return command blueprint
    return {
      trigger: args[0],
      signature: args[1],
      run: args[2],
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
    return command as CommandBlueprintCreator<BasePluginType>;
  }

  throw new Error(`No signature of command() takes ${args.length} arguments`);
}
