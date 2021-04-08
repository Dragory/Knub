import { ConfigPreprocessorFn, ConfigValidatorFn, PluginOptions } from "../config/configTypes";
import { Awaitable } from "../utils";
import { AnyPluginData, GlobalPluginData, GuildPluginData } from "./PluginData";
import { CommandBlueprint } from "../commands/CommandBlueprint";
import { EventListenerBlueprint } from "../events/EventListenerBlueprint";
import { CustomOverrideMatcher } from "../config/configUtils";
import { BasePluginType } from "./pluginTypes";
import { GuildEvent, ValidEvent } from "../events/eventTypes";

/**
 * Each value in the public interface is a function that returns the actual
 * value that other plugins can access when using the interface.
 * This allows other plugins to be unaware of the pluginData object for the
 * plugin with the public interface.
 */
export interface PluginBlueprintPublicInterface<TPluginData extends AnyPluginData<any>> {
  [key: string]: (pluginData: TPluginData) => any;
}

// The actual interface that other plugins receive
export type ResolvedPluginBlueprintPublicInterface<T extends PluginBlueprintPublicInterface<any>> = {
  [P in keyof T]: ReturnType<T[P]>;
};

interface BasePluginBlueprint<TPluginData extends AnyPluginData<any>> {
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
   * The plugin's default options, including overrides
   */
  defaultOptions?: PluginOptions<TPluginData["_pluginType"]>;

  /**
   * Commands that are automatically registered on plugin load
   */
  commands?: Array<CommandBlueprint<TPluginData, any>>;

  /**
   * If this plugin includes any custom overrides, this function evaluates them
   */
  customOverrideMatcher?: CustomOverrideMatcher<TPluginData>;

  /**
   * Preprocesses the plugin's config after it's been merged with the default options
   * but before it's validated by `this.configValidator`.
   *
   * (Merge with default options) -> configPreprocessor -> configValidator
   */
  configPreprocessor?: ConfigPreprocessorFn<TPluginData["_pluginType"]>;

  /**
   * Validates the plugin's config after it's been merged with the default options
   * and run through `this.configPreprocessor`.
   *
   * (Merge with default options) -> configPreprocessor -> configValidator
   */
  configValidator?: ConfigValidatorFn<TPluginData["_pluginType"]>;

  /**
   * Public interface for this plugin
   */
  public?: PluginBlueprintPublicInterface<TPluginData>;

  onLoad?: (pluginData: TPluginData) => Awaitable<void>;
  onUnload?: (pluginData: TPluginData) => Awaitable<void>;
  onAfterLoad?: (pluginData: TPluginData) => Awaitable<void>;
  onBeforeUnload?: (pluginData: TPluginData) => Awaitable<void>;
}

/**
 * Blueprint for a plugin that can only be loaded in a guild context
 */
export interface GuildPluginBlueprint<TPluginData extends GuildPluginData<any>>
  extends BasePluginBlueprint<TPluginData> {
  /**
   * Names of other guild plugins that are required for this plugin to function. They will be loaded before this plugin.
   */
  dependencies?: Array<GuildPluginBlueprint<any>>;

  /**
   * Event listeners that are automatically registered on plugin load
   */
  events?: Array<AnyGuildEventListenerBlueprint<TPluginData>>;
}

/**
 * This is used in conjunction with arr[keyof arr] syntax in AnyGuildEventListenerBlueprint to create
 * a union type of event listener blueprints for each different guild event.
 *
 * We can't simply do EventListenerBlueprint<GuildPluginData<TPluginType>, GuildEvent>, because then adding
 * an event listener blueprint for a single event isn't valid in TS strict mode anymore, as technically that specific
 * event listener blueprint doesn't accept *every* GuildEvent, just the specific one.
 */
type GuildEventListenerBlueprintsHelper<TPluginData extends GuildPluginData<any>> = {
  [K in GuildEvent]: EventListenerBlueprint<TPluginData, K>;
};

export type AnyGuildEventListenerBlueprint<
  TPluginData extends GuildPluginData<any>
> = GuildEventListenerBlueprintsHelper<TPluginData>[keyof GuildEventListenerBlueprintsHelper<TPluginData>];

/**
 * Blueprint for a plugin that can only be loaded in a global context
 */
export interface GlobalPluginBlueprint<TPluginData extends GlobalPluginData<any>>
  extends BasePluginBlueprint<TPluginData> {
  /**
   * Names of other global plugins that are required for this plugin to function.
   * They will be loaded before this plugin.
   */
  dependencies?: Array<GlobalPluginBlueprint<any>>;

  /**
   * Event listeners that are automatically registered on plugin load
   */
  events?: Array<AnyGlobalEventListenerBlueprint<TPluginData>>;
}

/**
 * This is used in conjunction with arr[keyof arr] syntax in AnyGlobalEventListenerBlueprint to create
 * a union type of event listener blueprints for each different global event (i.e. each ValidEvent).
 *
 * We can't simply do EventListenerBlueprint<GlobalPluginData<TPluginType>, ValidEvent>, because then adding
 * an event listener blueprint for a single event isn't valid in TS strict mode anymore, as technically that specific
 * event listener blueprint doesn't accept *every* ValidEvent, just the specific one.
 */
type GlobalEventListenerBlueprintsHelper<TPluginData extends GlobalPluginData<any>> = {
  [K in ValidEvent]: EventListenerBlueprint<TPluginData, K>;
};

export type AnyGlobalEventListenerBlueprint<
  TPluginData extends GlobalPluginData<any>
> = GlobalEventListenerBlueprintsHelper<TPluginData>[keyof GlobalEventListenerBlueprintsHelper<TPluginData>];

export type AnyPluginBlueprint = GuildPluginBlueprint<any> | GlobalPluginBlueprint<any>;

type PluginBlueprintCreator<TBaseBlueprint extends AnyPluginBlueprint> = <TBlueprint extends TBaseBlueprint>(
  blueprint: TBlueprint
) => TBlueprint;

function plugin<TBlueprint extends AnyPluginBlueprint>(...args) {
  if (args.length === 1) {
    // (blueprint)
    // Return blueprint
    return args[0];
  }

  if (args.length === 0) {
    // No arguments, with TPluginType - return self
    return plugin as PluginBlueprintCreator<TBlueprint>;
  }

  throw new Error(`No signature of plugin() takes ${args.length} arguments`);
}

/**
 * Helper function that creates a plugin blueprint for a guild plugin.
 *
 * To specify `TPluginType` for additional type hints, use: `guildPlugin<TPluginType>()(blueprint)`
 */
export function typedGuildPlugin<TBlueprint extends GuildPluginBlueprint<GuildPluginData<any>>>(
  blueprint: TBlueprint
): TBlueprint;

/**
 * Helper function with no arguments. Specify `TPluginType` for type hints and return self.
 */
export function typedGuildPlugin<TPluginType extends BasePluginType>(): PluginBlueprintCreator<
  GuildPluginBlueprint<GuildPluginData<TPluginType>>
>;

export function typedGuildPlugin(...args) {
  return plugin<GuildPluginBlueprint<any>>(...args);
}

/**
 * Helper function that creates a plugin blueprint for a global plugin.
 *
 * To specify `TPluginType` for additional type hints, use: `globalPlugin<TPluginType>()(blueprint)`
 */
export function typedGlobalPlugin<TBlueprint extends GlobalPluginBlueprint<GlobalPluginData<any>>>(
  blueprint: TBlueprint
): TBlueprint;

/**
 * Helper function with no arguments. Specify `TPluginType` for type hints and return self
 */
export function typedGlobalPlugin<TPluginType extends BasePluginType>(): PluginBlueprintCreator<
  GlobalPluginBlueprint<GlobalPluginData<TPluginType>>
>;

export function typedGlobalPlugin(...args) {
  return plugin<GlobalPluginBlueprint<any>>(...args);
}
