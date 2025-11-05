import type { GuildMember, GuildTextBasedChannel, Message, Snowflake } from "discord.js";
import type { BaseConfig } from "./config/configTypes.ts";
import type { LockManager } from "./locks/LockManager.ts";
import type {
  AnyGlobalPluginBlueprint,
  AnyGuildPluginBlueprint,
  GlobalPluginBlueprint,
  GuildPluginBlueprint,
} from "./plugins/PluginBlueprint.ts";
import type { GlobalPluginData, GuildPluginData } from "./plugins/PluginData.ts";
import type { BasePluginType } from "./plugins/pluginTypes.ts";
import type { Awaitable } from "./utils.ts";

export type GuildPluginMap = Map<string, AnyGuildPluginBlueprint>;
export type GlobalPluginMap = Map<string, AnyGlobalPluginBlueprint>;

export type LogFn = (level, ...args) => void;

export interface KnubOptions {
  /**
   * If enabled, plugin slash commands are automatically registered with Discord on bot start-up.
   * Defaults to `true`.
   */
  autoRegisterApplicationCommands?: boolean;
  getConfig: (id: string) => Awaitable<any>;
  getEnabledGuildPlugins?: (ctx: GuildContext, plugins: GuildPluginMap) => Awaitable<string[]>;
  canLoadGuild: (guildId: string) => Awaitable<boolean>;
  concurrentGuildLoadLimit: number;
  pluginUnloadEventTimeoutMs: number;
  logFn?: LogFn;

  [key: string]: any;
}

export interface KnubArgs {
  guildPlugins: Array<AnyGuildPluginBlueprint>;
  globalPlugins: Array<AnyGlobalPluginBlueprint>;
  options: Partial<KnubOptions>;
}

export interface LoadedGuildPlugin<TPluginType extends BasePluginType> {
  blueprint: GuildPluginBlueprint<GuildPluginData<TPluginType>, unknown>;
  pluginData: GuildPluginData<TPluginType>;
  onlyLoadedAsDependency: boolean;
}

export interface LoadedGlobalPlugin<TPluginType extends BasePluginType> {
  blueprint: GlobalPluginBlueprint<GlobalPluginData<TPluginType>, unknown>;
  pluginData: GlobalPluginData<TPluginType>;
}

export type AnyLoadedPlugin<TPluginType extends BasePluginType> =
  | LoadedGuildPlugin<TPluginType>
  | LoadedGlobalPlugin<TPluginType>;

interface BaseContext {
  config: BaseConfig;
  locks: LockManager;
}

export interface GuildContext extends BaseContext {
  guildId: Snowflake;
  loadedPlugins: Map<string, LoadedGuildPlugin<any>>;
}

export interface GlobalContext extends BaseContext {
  loadedPlugins: Map<string, LoadedGlobalPlugin<any>>;
}

export type AnyContext = GuildContext | GlobalContext;

export interface GuildMessage extends Message {
  channel: GuildTextBasedChannel;
  member: GuildMember;
}
