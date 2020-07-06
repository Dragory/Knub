import { Client, Guild } from "eris";
import { PluginEventManager } from "../events/PluginEventManager";
import { PluginCommandManager } from "../commands/PluginCommandManager";
import { PluginConfigManager } from "../config/PluginConfigManager";
import { LockManager } from "../locks/LockManager";
import { CooldownManager } from "../cooldowns/CooldownManager";
import { PluginPublicInterface } from "./pluginUtils";
import { Knub } from "../Knub";
import { BasePluginType } from "./pluginTypes";
import { PluginBlueprint } from "./PluginBlueprint";

export type HasPluginFn = <T extends PluginBlueprint<any>>(plugin: T) => boolean;
export type GetPluginFn = <T extends PluginBlueprint<any>>(plugin: T) => PluginPublicInterface<T>;

/**
 * Instance-specific data and helpers for plugins
 */
export interface PluginData<TPluginType extends BasePluginType> {
  /**
   * The underlying Eris Client object
   */
  client: Client;

  /**
   * The guild this plugin has been loaded for
   */
  guild: Guild;

  config: PluginConfigManager<TPluginType>;
  events: PluginEventManager<TPluginType>;
  commands: PluginCommandManager<TPluginType>;
  locks: LockManager;
  cooldowns: CooldownManager;

  /**
   * Check whether a specific other plugin has been loaded for this guild
   */
  hasPlugin: HasPluginFn;

  /**
   * Get the public interface for another plugin
   */
  getPlugin: GetPluginFn;

  /**
   * The full guild config. Use `config` property for plugin config values.
   */
  guildConfig: any;

  /**
   * Get the active Knub instance
   */
  getKnubInstance: () => Knub;

  /**
   * The plugin's current state
   */
  state: TPluginType["state"];
}
