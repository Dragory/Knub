import { TextableChannel } from "eris";
import { BaseConfig } from "./config/configTypes";
import { LockManager } from "./locks/LockManager";
import { GlobalPluginBlueprint, GuildPluginBlueprint } from "./plugins/PluginBlueprint";
import { GlobalPluginData, GuildPluginData } from "./plugins/PluginData";
import { Awaitable } from "./utils";
import { BasePluginType } from "./plugins/pluginTypes";

type StatusMessageFn = (channel: TextableChannel, body: string) => void;

export type GuildPluginMap = Map<string, GuildPluginBlueprint<any>>;
export type GlobalPluginMap = Map<string, GlobalPluginBlueprint<any>>;

export type LogFn = (level, ...args) => void;

export interface KnubOptions<TGuildConfig extends BaseConfig<any>, TGlobalConfig extends BaseConfig<any>> {
  autoInitGuilds?: boolean;
  getConfig: (id: string) => Awaitable<any>;
  getEnabledGuildPlugins?: (ctx: GuildContext<TGuildConfig>, plugins: GuildPluginMap) => Awaitable<string[]>;
  canLoadGuild: (guildId: string) => Awaitable<boolean>;
  logFn?: LogFn;
  sendErrorMessageFn: StatusMessageFn;
  sendSuccessMessageFn: StatusMessageFn;
  [key: string]: any;
}

export interface KnubArgs<TGuildConfig extends BaseConfig<any>, TGlobalConfig extends BaseConfig<any>> {
  guildPlugins: Array<GuildPluginBlueprint<any>>;
  globalPlugins: Array<GlobalPluginBlueprint<any>>;
  options: Partial<KnubOptions<TGuildConfig, TGlobalConfig>>;
}

export interface LoadedGuildPlugin<TPluginType extends BasePluginType> {
  blueprint: GuildPluginBlueprint<GuildPluginData<TPluginType>>;
  pluginData: GuildPluginData<TPluginType>;
}

export interface LoadedGlobalPlugin<TPluginType extends BasePluginType> {
  blueprint: GlobalPluginBlueprint<GlobalPluginData<TPluginType>>;
  pluginData: GlobalPluginData<TPluginType>;
}

interface BaseContext<TConfig extends BaseConfig<any>> {
  config: TConfig;
  locks: LockManager;
}

export interface GuildContext<TGuildConfig extends BaseConfig<any>> extends BaseContext<TGuildConfig> {
  guildId: string;
  loadedPlugins: Map<string, LoadedGuildPlugin<any>>;
}

export interface GlobalContext<TGlobalConfig extends BaseConfig<any>> extends BaseContext<TGlobalConfig> {
  loadedPlugins: Map<string, LoadedGlobalPlugin<any>>;
}

export type AnyContext<TGuildConfig extends BaseConfig<any>, TGlobalConfig extends BaseConfig<any>> =
  | GuildContext<TGuildConfig>
  | GlobalContext<TGlobalConfig>;
