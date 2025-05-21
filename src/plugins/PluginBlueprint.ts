import type {
  MessageContextMenuCommandBlueprint,
  UserContextMenuCommandBlueprint,
} from "../commands/contextMenuCommands/contextMenuCommandBlueprint.ts";
import type { MessageCommandBlueprint } from "../commands/messageCommands/messageCommandBlueprint.ts";
import type {
  AnySlashCommandSignature,
  SlashCommandBlueprint,
} from "../commands/slashCommands/slashCommandBlueprint.ts";
import type { SlashGroupBlueprint } from "../commands/slashCommands/slashGroupBlueprint.ts";
import type { ConfigParserFn, CustomOverrideCriteriaFunctions, PluginOptions } from "../config/configTypes.ts";
import type { EventListenerBlueprint } from "../events/EventListenerBlueprint.ts";
import type { GuildEvent, ValidEvent } from "../events/eventTypes.ts";
import type { Awaitable } from "../utils.ts";
import type { AnyPluginData, GlobalPluginData, GuildPluginData } from "./PluginData.ts";
import type { BasePluginType } from "./pluginTypes.ts";

export interface BasePluginBlueprint<TPluginData extends AnyPluginData<any>, TPublicInterface> {
  /**
   * **[Required]** Internal name for the plugin
   */
  name: string;

  /**
   * The plugin's default options, including overrides
   */
  defaultOptions?: PluginOptions<TPluginData["_pluginType"]>;

  /**
   * Parses the plugin's config from untrusted input, returning the correct type for the config or throwing an error
   */
  configParser: ConfigParserFn<TPluginData["_pluginType"]["config"]>;

  messageCommands?: Array<MessageCommandBlueprint<TPluginData, any>>;

  slashCommands?: Array<
    SlashCommandBlueprint<TPluginData, AnySlashCommandSignature> | SlashGroupBlueprint<TPluginData>
  >;

  contextMenuCommands?: Array<
    MessageContextMenuCommandBlueprint<TPluginData> | UserContextMenuCommandBlueprint<TPluginData>
  >;

  /**
   * If this plugin includes any custom overrides, this function evaluates them
   */
  customOverrideCriteriaFunctions?: CustomOverrideCriteriaFunctions<TPluginData>;

  /**
   * Public interface for this plugin
   */
  public?: (pluginData: TPluginData) => TPublicInterface;

  /**
   * This hook is called before the plugin is loaded.
   *
   * Guarantees:
   * 1. Other plugins can't yet interact with this plugin's public interface
   * 2. `PluginData.hasPlugin()` and `PluginData.getPlugin()` are unavailable
   */
  beforeLoad?: (pluginData: TPluginData) => Awaitable<void>;

  /**
   * This hook is called after each plugin's pluginData has been set up,
   * but before any event listeners or commands are loaded.
   *
   * Guarantees:
   * 1. Other plugins are able to interact with this plugin's public interfaces
   *     - If you need to set up dependencies for your public interface, do it in the `beforeLoad()` hook
   * 2. Commands and event handlers have NOT been registered yet
   */
  beforeStart?: (pluginData: TPluginData) => Awaitable<void>;
  /**
   * This hook is called after the plugin has been loaded.
   *
   * Guarantees:
   * 1. Commands and event handlers are already registered
   *     * If you need to set up dependencies for your commands or event handlers, do it in the `beforeStart()` hook
   * 2. Other plugins are able to interact with this plugin's public interfaces
   */
  afterLoad?: (pluginData: TPluginData) => Awaitable<void>;
  /**
   * This hook is called before the plugin is unloaded.
   *
   * Guarantees:
   * 1. Commands and event handlers are still registered.
   *     * If you need to unload dependencies for your commands or event handlers, do it in the `afterUnload()` hook
   * 2. Other plugins are still able to interact with this plugin's public interfaces
   *     * If you want to unload your public interface's dependencies, do it in the `afterUnload()` hook
   */
  beforeUnload?: (pluginData: TPluginData) => Awaitable<void>;

  /**
   * This hook is called after the plugin has been unloaded.
   *
   * Guarantees:
   * 1. Other plugins can no longer interact with this plugin's public interface
   * 2. `PluginData.hasPlugin()` and `PluginData.getPlugin()` are unavailable
   */
  afterUnload?: (pluginData: TPluginData) => Awaitable<void>;
}

/**
 * Blueprint for a plugin that can only be loaded in a guild context
 */
export interface GuildPluginBlueprint<TPluginData extends GuildPluginData<any>, TPublicInterface>
  extends BasePluginBlueprint<TPluginData, TPublicInterface> {
  /**
   * Function that returns other plugins that are required for this plugin to function.
   * They will be loaded before this plugin.
   */
  dependencies?: () => Array<GuildPluginBlueprint<any, any>> | Promise<Array<GuildPluginBlueprint<any, any>>>;

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
export interface GlobalPluginBlueprint<TPluginData extends GlobalPluginData<any>, TPublicInterface>
  extends BasePluginBlueprint<TPluginData, TPublicInterface> {
  /**
   * Function that returns other plugins that are required for this plugin to function.
   * They will be loaded before this plugin.
   */
  dependencies?: () => Array<GlobalPluginBlueprint<any, any>> | Promise<Array<GlobalPluginBlueprint<any, any>>>;

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

export type AnyGuildPluginBlueprint = GuildPluginBlueprint<GuildPluginData<any>, any>;
export type AnyGlobalPluginBlueprint = GlobalPluginBlueprint<GlobalPluginData<any>, any>;
export type AnyPluginBlueprint = AnyGuildPluginBlueprint | AnyGlobalPluginBlueprint;

function pluginCreator(...args) {
  if (args.length === 1) {
    // (blueprint)
    // Return blueprint
    return args[0];
  }

  if (args.length === 0) {
    // No arguments, with TPluginType - return self
    return pluginCreator;
  }

  throw new Error(`No signature of plugin() takes ${args.length} arguments`);
}

export type GuildPluginBlueprintCreator<TPluginData extends GuildPluginData<any>> = <TPublicInterface>(
  blueprint: GuildPluginBlueprint<TPluginData, TPublicInterface>,
) => GuildPluginBlueprint<TPluginData, TPublicInterface>;

/**
 * Helper function that creates a plugin blueprint for a guild plugin.
 *
 * To specify `TPluginType` for additional type hints, use: `guildPlugin<TPluginType>()(blueprint)`
 */
export function guildPlugin<TPluginData extends GuildPluginData<any>, TPublicInterface>(
  blueprint: GuildPluginBlueprint<TPluginData, TPublicInterface>,
): GuildPluginBlueprint<TPluginData, TPublicInterface>;

/**
 * Helper function with no arguments. Specify `TPluginType` for type hints and return self.
 */
export function guildPlugin<TPluginType extends BasePluginType>(): GuildPluginBlueprintCreator<
  GuildPluginData<TPluginType>
>;

export function guildPlugin(...args: any[]): any {
  return pluginCreator(...args);
}

export type GlobalPluginBlueprintCreator<TPluginData extends GlobalPluginData<any>> = <TPublicInterface>(
  blueprint: GlobalPluginBlueprint<TPluginData, TPublicInterface>,
) => GlobalPluginBlueprint<TPluginData, TPublicInterface>;

/**
 * Helper function that creates a plugin blueprint for a global plugin.
 *
 * To specify `TPluginType` for additional type hints, use: `globalPlugin<TPluginType>()(blueprint)`
 */
export function globalPlugin<TPluginData extends GlobalPluginData<any>, TPublicInterface>(
  blueprint: GlobalPluginBlueprint<TPluginData, TPublicInterface>,
): GlobalPluginBlueprint<TPluginData, TPublicInterface>;

/**
 * Helper function with no arguments. Specify `TPluginType` for type hints and return self
 */
export function globalPlugin<TPluginType extends BasePluginType>(): GlobalPluginBlueprintCreator<
  GlobalPluginData<TPluginType>
>;

export function globalPlugin(...args: any[]): any {
  return pluginCreator(...args);
}

export type GetPluginBlueprintPluginDataType<TBlueprint extends BasePluginBlueprint<any, any>> =
  TBlueprint extends BasePluginBlueprint<infer R, any> ? R : never;
