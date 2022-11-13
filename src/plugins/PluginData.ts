import { PluginMessageCommandManager } from "../commands/messageCommands/PluginMessageCommandManager";
import { PluginConfigManager } from "../config/PluginConfigManager";
import { LockManager } from "../locks/LockManager";
import { CooldownManager } from "../cooldowns/CooldownManager";
import { PluginPublicInterface } from "./pluginUtils";
import { Knub } from "../Knub";
import { BasePluginType } from "./pluginTypes";
import { AnyPluginBlueprint } from "./PluginBlueprint";
import { GuildPluginEventManager } from "../events/GuildPluginEventManager";
import { GlobalPluginEventManager } from "../events/GlobalPluginEventManager";
import { Client, Guild } from "discord.js";
import { PluginSlashCommandManager } from "../commands/slashCommands/PluginSlashCommandManager";

export type HasPluginFn = <T extends AnyPluginBlueprint>(plugin: T) => boolean;
export type GetPluginFn = <T extends AnyPluginBlueprint>(plugin: T) => PluginPublicInterface<T>;

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
   * Whether the plugin has finished loading and has not been unloaded yet
   */
  loaded: boolean;

  pluginName: string;

  /**
   * The underlying d.js Client object
   */
  client: Client;

  config: PluginConfigManager<TPluginType>;
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

export type BeforeLoadPluginData<TPluginData extends BasePluginData<any>> = Omit<
  TPluginData,
  "hasPlugin" | "getPlugin"
>;
export type AfterUnloadPluginData<TPluginData extends BasePluginData<any>> = Omit<
  TPluginData,
  "hasPlugin" | "getPlugin"
>;

/**
 * PluginData for a guild context
 */
export type GuildPluginData<TPluginType extends BasePluginType> = BasePluginData<TPluginType> & {
  context: "guild";

  /**
   * The guild this plugin has been loaded for
   */
  guild: Guild;

  events: GuildPluginEventManager<GuildPluginData<TPluginType>>;
  messageCommands: PluginMessageCommandManager<GuildPluginData<TPluginType>>;
  slashCommands: PluginSlashCommandManager<GuildPluginData<TPluginType>>;
};

/**
 * PluginData for a global context
 */
export type GlobalPluginData<TPluginType extends BasePluginType> = BasePluginData<TPluginType> & {
  context: "global";

  events: GlobalPluginEventManager<GlobalPluginData<TPluginType>>;
  messageCommands: PluginMessageCommandManager<GlobalPluginData<TPluginType>>;
  slashCommands: PluginSlashCommandManager<GlobalPluginData<TPluginType>>;
};

export type AnyPluginData<TPluginType extends BasePluginType> =
  | GuildPluginData<TPluginType>
  | GlobalPluginData<TPluginType>;

export function isGuildPluginData<TPluginType extends BasePluginType>(
  pluginData: AnyPluginData<TPluginType>
): pluginData is GuildPluginData<TPluginType> {
  return pluginData.context === "guild";
}

export function isGlobalPluginData<TPluginType extends BasePluginType>(
  pluginData: AnyPluginData<TPluginType>
): pluginData is GlobalPluginData<TPluginType> {
  return pluginData.context === "global";
}
