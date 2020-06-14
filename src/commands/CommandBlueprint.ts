import { CommandFn, PluginCommandConfig, TSignatureOrArray } from "./commandUtils";
import { BasePluginType } from "../plugins/pluginTypes";

type CommandSource = "guild" | "group" | "dm";

export interface CommandBlueprint<
  TPluginType extends BasePluginType,
  _TSignature extends TSignatureOrArray<TPluginType>
> {
  trigger: string;
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

/**
 * Helper function that creates a command blueprint.
 */
export function command<TPluginType extends BasePluginType>(
  // We can't replace CommandBlueprint<TPluginType, any> with a generic because it breaks type inference
  trigger: CommandBlueprint<TPluginType, any>["trigger"],
  run: CommandBlueprint<TPluginType, any>["run"]
): CommandBlueprint<TPluginType, any>;

/**
 * Helper function that creates a command blueprint.
 * Used for type inference between `signature` and the arguments for `run()`.
 */
export function command<TPluginType extends BasePluginType, _TSignature extends TSignatureOrArray<any>>(
  // We can't replace CommandBlueprint<TPluginType, _TSignature> with a generic because it breaks type inference
  trigger: CommandBlueprint<TPluginType, _TSignature>["trigger"],
  signature: CommandBlueprint<TPluginType, _TSignature>["signature"],
  run: CommandBlueprint<TPluginType, _TSignature>["run"]
): CommandBlueprint<TPluginType, _TSignature>;

/**
 * Helper function that creates a command blueprint.
 * Used for type inference between `signature` and the arguments for `run()`.
 */
export function command<TPluginType extends BasePluginType, _TSignature extends TSignatureOrArray<any>>(
  // We can't replace CommandBlueprint<TPluginType, _TSignature> with a generic because it breaks type inference
  trigger: CommandBlueprint<TPluginType, _TSignature>["trigger"],
  signature: CommandBlueprint<TPluginType, _TSignature>["signature"],
  options: Omit<CommandBlueprint<TPluginType, _TSignature>, "trigger" | "signature" | "run">,
  run: CommandBlueprint<TPluginType, _TSignature>["run"]
): CommandBlueprint<TPluginType, _TSignature>;

/**
 * Implementation of the various overloads above
 */
export function command(...args): CommandBlueprint<any, any> {
  if (args.length === 2) {
    // (trigger, run)
    return {
      trigger: args[0],
      run: args[1],
    };
  } else if (args.length === 3) {
    // (trigger, signature, run)
    return {
      trigger: args[0],
      signature: args[1],
      run: args[2],
    };
  } else if (args.length === 4) {
    // (trigger, signature, options, run)
    return {
      ...args[2],
      trigger: args[0],
      signature: args[1],
      run: args[3],
    };
  }
}
