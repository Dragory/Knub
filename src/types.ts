import { TextableChannel } from "eris";
import { BaseConfig } from "./config/configTypes";
import { LockManager } from "./locks/LockManager";
import { PluginBlueprint } from "./plugins/PluginBlueprint";
import { PluginData } from "./plugins/PluginData";
import { Awaitable } from "./utils";
import { BasePluginType } from "./plugins/pluginTypes";

type StatusMessageFn = (channel: TextableChannel, body: string) => void;

export type PluginMap = Map<string, PluginBlueprint<any>>;

export type LogFn = (level, ...args) => void;

export interface KnubOptions<TGuildConfig extends BaseConfig<any>, TGlobalConfig extends BaseConfig<any>> {
  autoInitGuilds?: boolean;
  getConfig?: (id: string) => Awaitable<any>;
  getEnabledGuildPlugins?: (ctx: GuildContext<TGuildConfig>, plugins: PluginMap) => Awaitable<string[]>;
  canLoadGuild?: (guildId: string) => Awaitable<boolean>;
  logFn?: LogFn;
  sendErrorMessageFn?: StatusMessageFn;
  sendSuccessMessageFn?: StatusMessageFn;
  [key: string]: any;
}

export interface KnubArgs<TGuildConfig extends BaseConfig<any>, TGlobalConfig extends BaseConfig<any>> {
  guildPlugins?: Array<PluginBlueprint<any>>;
  globalPlugins?: Array<PluginBlueprint<any>>;
  options?: KnubOptions<TGuildConfig, TGlobalConfig>;
}

export interface LoadedPlugin<TPluginType extends BasePluginType> {
  blueprint: PluginBlueprint<TPluginType>;
  pluginData: PluginData<TPluginType>;
}

export interface BaseContext<TConfig extends BaseConfig<any>> {
  config: TConfig;
  loadedPlugins: Map<string, LoadedPlugin<any>>;
  locks: LockManager;
}

export interface GuildContext<TGuildConfig extends BaseConfig<any>> extends BaseContext<TGuildConfig> {
  guildId: string;
}

export type GlobalContext<TGlobalConfig extends BaseConfig<any>> = BaseContext<TGlobalConfig>;

export type AnyContext<TGuildConfig extends BaseConfig<any>, TGlobalConfig extends BaseConfig<any>> =
  | GuildContext<TGuildConfig>
  | GlobalContext<TGlobalConfig>;
