import { ConfigParserFn, CustomOverrideCriteriaFunctions, PluginOptions } from "../config/configTypes";
import { Awaitable } from "../utils";
import {
  AfterUnloadPluginData,
  AnyPluginData,
  BeforeLoadPluginData,
  GlobalPluginData,
  GuildPluginData
} from "./PluginData";
import { MessageCommandBlueprint } from "../commands/messageCommands/messageCommandBlueprint";
import { EventListenerBlueprint } from "../events/EventListenerBlueprint";
import { BasePluginType } from "./pluginTypes";
import { GuildEvent, ValidEvent } from "../events/eventTypes";
import { AnySlashCommandSignature, SlashCommandBlueprint } from "../commands/slashCommands/slashCommandBlueprint";
import { SlashGroupBlueprint } from "../commands/slashCommands/slashGroupBlueprint";

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
   * Parses the plugin's config from untrusted input, returning the correct type for the config or throwing an error
   */
  configParser: ConfigParserFn<TPluginData["_pluginType"]["config"]>;

  messageCommands?: Array<MessageCommandBlueprint<TPluginData, any>>;

  /**
   * Commands that are automatically registered on plugin load
   */
  slashCommands?: Array<SlashCommandBlueprint<TPluginData, AnySlashCommandSignature> | SlashGroupBlueprint<TPluginData>>;

  /**
   * If this plugin includes any custom overrides, this function evaluates them
   */
  customOverrideCriteriaFunctions?: CustomOverrideCriteriaFunctions<TPluginData>;

  /**
   * Public interface for this plugin
   */
  public?: PluginBlueprintPublicInterface<TPluginData>;

  /**
   * This function is called before the plugin is loaded.
   * At this point, there are two guarantees:
   *
   * 1. Other plugins haven't yet interacted with this plugin
   * 2. Other plugins can't interact with this plugin during this function
   *
   * Similarly, `PluginData.hasPlugin()` and `PluginData.getPlugin()` are unavailable.
   */
  beforeLoad?: (pluginData: BeforeLoadPluginData<TPluginData>) => Awaitable<void>;
  /**
   * This function is called after the plugin has been loaded.
   * At this point, make sure to consider the following:
   *
   * 1. Commands and event handlers are already registered.
   *    If you need to set up dependencies for them, do it in `beforeLoad()`.
   * 2. Other plugins are able to interact with this plugin's public interfaces
   */
  afterLoad?: (pluginData: TPluginData) => Awaitable<void>;
  /**
   * This function is called before the plugin is unloaded.
   * At this point, make sure to consider the following:
   *
   * 1. Commands and event handlers are still registered.
   *    If you need to unload their dependencies, do it in `afterUnload()`.
   * 2. Other plugins are still able to interact with this plugin's public interfaces
   */
  beforeUnload?: (pluginData: TPluginData) => Awaitable<void>;
  /**
   * This function is called after the plugin has been unloaded.
   * At this point, it is guaranteed that other plugins can't interact with this plugin anymore.
   * Similarly, `PluginData.hasPlugin()` and `PluginData.getPlugin()` are unavailable.
   */
  afterUnload?: (pluginData: AfterUnloadPluginData<TPluginData>) => Awaitable<void>;
}

/**
 * Blueprint for a plugin that can only be loaded in a guild context
 */
export interface GuildPluginBlueprint<TPluginData extends GuildPluginData<any>>
  extends BasePluginBlueprint<TPluginData> {
  /**
   * Function that returns other plugins that are required for this plugin to function.
   * They will be loaded before this plugin.
   */
  dependencies?: () => Array<GuildPluginBlueprint<any>> | Promise<Array<GuildPluginBlueprint<any>>>;

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

export type AnyGuildEventListenerBlueprint<TPluginData extends GuildPluginData<any>> =
  GuildEventListenerBlueprintsHelper<TPluginData>[keyof GuildEventListenerBlueprintsHelper<TPluginData>];

/**
 * Blueprint for a plugin that can only be loaded in a global context
 */
export interface GlobalPluginBlueprint<TPluginData extends GlobalPluginData<any>>
  extends BasePluginBlueprint<TPluginData> {
  /**
   * Function that returns other plugins that are required for this plugin to function.
   * They will be loaded before this plugin.
   */
  dependencies?: () => Array<GlobalPluginBlueprint<any>> | Promise<Array<GlobalPluginBlueprint<any>>>;

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

export type AnyGlobalEventListenerBlueprint<TPluginData extends GlobalPluginData<any>> =
  GlobalEventListenerBlueprintsHelper<TPluginData>[keyof GlobalEventListenerBlueprintsHelper<TPluginData>];

export type AnyPluginBlueprint = GuildPluginBlueprint<any> | GlobalPluginBlueprint<any>;

type PluginBlueprintCreator<TBaseBlueprint extends AnyPluginBlueprint> = <TBlueprint extends TBaseBlueprint>(
  blueprint: TBlueprint
) => TBlueprint;

function plugin<TBlueprint extends AnyPluginBlueprint>(...args) {
  if (args.length === 1) {
    // (blueprint)
    // Return blueprint
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
export function guildPlugin<TBlueprint extends GuildPluginBlueprint<GuildPluginData<any>>>(
  blueprint: TBlueprint
): TBlueprint;

/**
 * Helper function with no arguments. Specify `TPluginType` for type hints and return self.
 */
export function guildPlugin<TPluginType extends BasePluginType>(): PluginBlueprintCreator<
  GuildPluginBlueprint<GuildPluginData<TPluginType>>
>;

export function guildPlugin(...args: any[]): any {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-argument
  return plugin<GuildPluginBlueprint<any>>(...args);
}

/**
 * Helper function that creates a plugin blueprint for a global plugin.
 *
 * To specify `TPluginType` for additional type hints, use: `globalPlugin<TPluginType>()(blueprint)`
 */
export function globalPlugin<TBlueprint extends GlobalPluginBlueprint<GlobalPluginData<any>>>(
  blueprint: TBlueprint
): TBlueprint;

/**
 * Helper function with no arguments. Specify `TPluginType` for type hints and return self
 */
export function globalPlugin<TPluginType extends BasePluginType>(): PluginBlueprintCreator<
  GlobalPluginBlueprint<GlobalPluginData<TPluginType>>
>;

export function globalPlugin(...args: any[]): any {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-argument
  return plugin<GlobalPluginBlueprint<any>>(...args);
}
