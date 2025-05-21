import type { Client, Guild } from "discord.js";
import type { Knub } from "../Knub.ts";
import type { PluginContextMenuCommandManager } from "../commands/contextMenuCommands/PluginContextMenuCommandManager.ts";
import type { PluginMessageCommandManager } from "../commands/messageCommands/PluginMessageCommandManager.ts";
import type { PluginSlashCommandManager } from "../commands/slashCommands/PluginSlashCommandManager.ts";
import type { PluginConfigManager } from "../config/PluginConfigManager.ts";
import type { CooldownManager } from "../cooldowns/CooldownManager.ts";
import type { GlobalPluginEventManager } from "../events/GlobalPluginEventManager.ts";
import type { GuildPluginEventManager } from "../events/GuildPluginEventManager.ts";
import type { LockManager } from "../locks/LockManager.ts";
import type { BasePluginBlueprint } from "./PluginBlueprint.ts";
import type { BasePluginType } from "./pluginTypes.ts";
import type { PluginPublicInterface } from "./pluginUtils.ts";

export type HasPluginFn = <T extends BasePluginBlueprint<any, unknown>>(plugin: T) => boolean;
export type GetPluginFn = <T extends BasePluginBlueprint<any, unknown>>(plugin: T) => PluginPublicInterface<T>;

/**
 * PluginData for an unknown context.
 * The properties defined here will be present in all PluginData objects, regardless of context.
 */
export type BasePluginData<TPluginType extends BasePluginType> = {
  /**
   * Fake property used for typing purposes
   */
  _pluginType: TPluginType;

  /**
   * Whether the plugin has been loaded and is available to be interacted with by other plugins
   */
  loaded: boolean;

  pluginName: string;

  /**
   * The underlying d.js Client object
   */
  client: Client;

  locks: LockManager;
  cooldowns: CooldownManager;

  /**
   * Check whether a specific other plugin has been loaded for this context
   */
  hasPlugin: HasPluginFn;

  /**
   * Get the public interface for another plugin in this context
   */
  getPlugin: GetPluginFn;

  /**
   * Check whether a specific global plugin has been loaded
   */
  hasGlobalPlugin: HasPluginFn;

  /**
   * Get the public interface for a loaded global plugin
   */
  getGlobalPlugin: GetPluginFn;

  /**
   * Whether this plugin was loaded as a dependency, as opposed to being enabled explicitly.
   * Plugins that are only loaded as a dependency do not have their commands or events registered.
   */
  loadedAsDependency: boolean;

  /**
   * Get the active Knub instance
   */
  getKnubInstance: () => Knub;

  /**
   * The full config for the plugin's context. Use `config` property for plugin config values.
   */
  fullConfig: any;

  /**
   * The plugin's current state
   */
  state: TPluginType["state"];
};

/**
 * PluginData for a guild context
 */
export type GuildPluginData<TPluginType extends BasePluginType> = BasePluginData<TPluginType> & {
  context: "guild";

  /**
   * The guild this plugin has been loaded for
   */
  guild: Guild;

  config: PluginConfigManager<GuildPluginData<TPluginType>>;
  events: GuildPluginEventManager<GuildPluginData<TPluginType>>;
  messageCommands: PluginMessageCommandManager<GuildPluginData<TPluginType>>;
  slashCommands: PluginSlashCommandManager<GuildPluginData<TPluginType>>;
  contextMenuCommands: PluginContextMenuCommandManager<GuildPluginData<TPluginType>>;
};

/**
 * PluginData for a global context
 */
export type GlobalPluginData<TPluginType extends BasePluginType> = BasePluginData<TPluginType> & {
  context: "global";

  config: PluginConfigManager<GlobalPluginData<TPluginType>>;
  events: GlobalPluginEventManager<GlobalPluginData<TPluginType>>;
  messageCommands: PluginMessageCommandManager<GlobalPluginData<TPluginType>>;
  slashCommands: PluginSlashCommandManager<GlobalPluginData<TPluginType>>;
  contextMenuCommands: PluginContextMenuCommandManager<GlobalPluginData<TPluginType>>;
};

export type AnyPluginData<TPluginType extends BasePluginType> =
  | GuildPluginData<TPluginType>
  | GlobalPluginData<TPluginType>;

export function isGuildPluginData<TPluginType extends BasePluginType>(
  pluginData: AnyPluginData<TPluginType> | BasePluginData<TPluginType>,
): pluginData is GuildPluginData<TPluginType> {
  return "context" in pluginData && pluginData.context === "guild";
}

export function isGlobalPluginData<TPluginType extends BasePluginType>(
  pluginData: AnyPluginData<TPluginType> | BasePluginData<TPluginType>,
): pluginData is GlobalPluginData<TPluginType> {
  return "context" in pluginData && pluginData.context === "global";
}
