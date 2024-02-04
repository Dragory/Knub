import { Client, Guild } from "discord.js";
import { Knub } from "../Knub";
import { PluginContextMenuCommandManager } from "../commands/contextMenuCommands/PluginContextMenuCommandManager";
import { PluginMessageCommandManager } from "../commands/messageCommands/PluginMessageCommandManager";
import { PluginSlashCommandManager } from "../commands/slashCommands/PluginSlashCommandManager";
import { PluginConfigManager } from "../config/PluginConfigManager";
import { CooldownManager } from "../cooldowns/CooldownManager";
import { GlobalPluginEventManager } from "../events/GlobalPluginEventManager";
import { GuildPluginEventManager } from "../events/GuildPluginEventManager";
import { LockManager } from "../locks/LockManager";
import { AnyPluginBlueprint } from "./PluginBlueprint";
import { BasePluginType } from "./pluginTypes";
import { PluginPublicInterface } from "./pluginUtils";

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

  /**
   * Whether the plugin has run its beforeInit() and afterInit() hooks
   */
  initialized: boolean;

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

  config: PluginConfigManager<GuildPluginData<TPluginType>>;
  events: GuildPluginEventManager<GuildPluginData<TPluginType>>;
  messageCommands: PluginMessageCommandManager<GuildPluginData<TPluginType>>;
  slashCommands: PluginSlashCommandManager<GuildPluginData<TPluginType>>;
  contextMenuCommands: PluginContextMenuCommandManager<GuildPluginData<TPluginType>>;
};
export type BeforeLoadGuildPluginDataMissingProps =
  | "hasPlugin"
  | "getPlugin"
  | "guild"
  | "events"
  | "messageCommands"
  | "slashCommands"
  | "contextMenuCommands";
export type BeforeLoadGuildPluginData<TPluginType extends BasePluginType> = Omit<
  GuildPluginData<TPluginType>,
  BeforeLoadGuildPluginDataMissingProps
> &
  Partial<Pick<GuildPluginData<TPluginType>, BeforeLoadGuildPluginDataMissingProps>>;

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
export type BeforeLoadGlobalPluginDataMissingProps =
  | "hasPlugin"
  | "getPlugin"
  | "events"
  | "messageCommands"
  | "slashCommands"
  | "contextMenuCommands";
export type BeforeLoadGlobalPluginData<TPluginType extends BasePluginType> = Omit<
  GlobalPluginData<TPluginType>,
  BeforeLoadGlobalPluginDataMissingProps
> &
  Partial<Pick<GlobalPluginData<TPluginType>, BeforeLoadGlobalPluginDataMissingProps>>;

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
