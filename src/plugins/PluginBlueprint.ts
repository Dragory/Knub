import { ConfigPreprocessorFn, ConfigValidatorFn, PluginOptions } from "../config/configTypes";
import { Awaitable } from "../utils";
import { PluginData } from "./PluginData";
import { CommandBlueprint } from "../commands/CommandBlueprint";
import { EventListenerBlueprint } from "../events/EventListenerBlueprint";
import { CustomOverrideMatcher } from "../config/configUtils";
import { BasePluginType } from "./pluginTypes";

/**
 * Each value in the public interface is a function that returns the actual
 * value that other plugins can access when using the interface.
 * This allows other plugins to be unaware of the pluginData object for the
 * plugin with the public interface.
 */
export interface PluginBlueprintPublicInterface<TPluginType extends BasePluginType> {
  [key: string]: (pluginData: PluginData<TPluginType>) => any;
}

// The actual interface that other plugins receive
export type ResolvedPluginBlueprintPublicInterface<T extends PluginBlueprintPublicInterface<any>> = {
  [P in keyof T]: ReturnType<T[P]>;
};

export interface PluginBlueprint<TPluginType extends BasePluginType> {
  /**
   * **[Required]** Internal name for the plugin
   */
  name: string;

  /**
   * Arbitrary info about the plugin, e.g. description.
   * This property is mainly here to set a convention, as it's not actually used in Knub itself.
   */
  info?: any;

  /**
   * Names of other plugins that are required for this plugin to function. They will be loaded before this plugin.
   */
  dependencies?: Array<PluginBlueprint<any>>;

  /**
   * The plugin's default options, including overrides
   */
  defaultOptions?: PluginOptions<TPluginType>;

  /**
   * Commands that are automatically registered on plugin load
   */
  commands?: Array<CommandBlueprint<TPluginType, any>>;

  /**
   * Event listeners that are automatically registered on plugin load
   */
  events?: Array<EventListenerBlueprint<TPluginType>>;

  /**
   * If this plugin includes any custom overrides, this function evaluates them
   */
  customOverrideMatcher?: CustomOverrideMatcher<TPluginType>;

  /**
   * Preprocesses the plugin's config after it's been merged with the default options
   * but before it's validated by `this.configValidator`.
   *
   * (Merge with default options) -> configPreprocessor -> configValidator
   */
  configPreprocessor?: ConfigPreprocessorFn<TPluginType>;

  /**
   * Validates the plugin's config after it's been merged with the default options
   * and run through `this.configPreprocessor`.
   *
   * (Merge with default options) -> configPreprocessor -> configValidator
   */
  configValidator?: ConfigValidatorFn<TPluginType>;

  /**
   * Public interface for this plugin
   */
  public?: PluginBlueprintPublicInterface<TPluginType>;

  onLoad?: (pluginData: PluginData<TPluginType>) => Awaitable<void>;
  onUnload?: (pluginData: PluginData<TPluginType>) => Awaitable<void>;
}

type PluginBlueprintCreatorIdentity<TPluginType extends BasePluginType> = (
  blueprint: PluginBlueprint<TPluginType>
) => PluginBlueprint<TPluginType>;

type PluginBlueprintCreatorWithName<TPluginType extends BasePluginType> = (
  name: string,
  blueprint: Omit<PluginBlueprint<TPluginType>, "name">
) => PluginBlueprint<TPluginType>;

type PluginBlueprintCreator<TPluginType extends BasePluginType> = PluginBlueprintCreatorIdentity<TPluginType> &
  PluginBlueprintCreatorWithName<TPluginType>;

/**
 * Helper function that creates a plugin blueprint.
 *
 * To specify `TPluginType` for additional type hints, use: `plugin<TPluginType>()(blueprint)`
 */
export function plugin(blueprint: PluginBlueprint<BasePluginType>): PluginBlueprint<BasePluginType>;

/**
 * Helper function that creates a plugin blueprint.
 *
 * To specify `TPluginType` for additional type hints, use: `plugin<TPluginType>()(name, blueprint)`
 */
export function plugin(
  name: string,
  blueprint: Omit<PluginBlueprint<BasePluginType>, "name">
): PluginBlueprint<BasePluginType>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function plugin<TPluginType extends BasePluginType>(): PluginBlueprintCreator<TPluginType>;

export function plugin(...args) {
  if (args.length === 1) {
    // (blueprint)
    // Return blueprint
    return args[0];
  } else if (args.length === 2) {
    // (name, blueprint)
    // Return blueprint
    return {
      ...args[1],
      name: args[0],
    };
  } else if (args.length === 0) {
    // No arguments, with TPluginType - return self
    return plugin as PluginBlueprintCreator<any>;
  }

  throw new Error(`No signature of plugin() takes ${args.length} arguments`);
}
