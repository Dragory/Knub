import { TextableChannel } from "eris";
import { BaseConfig } from "./config/configTypes";
import { LoggerFn } from "./logger";
import { LockManager } from "./locks/LockManager";
import { AnyExtendedPluginClass, PluginClass } from "./plugins/PluginClass";
import { PluginBlueprint } from "./plugins/PluginBlueprint";
import { PluginData } from "./plugins/PluginData";
import { Awaitable } from "./utils";

type StatusMessageFn = (channel: TextableChannel, body: string) => void;

export type Plugin = typeof AnyExtendedPluginClass | PluginBlueprint<any>;
export type PluginMap = Map<string, Plugin>;

export interface KnubOptions<TGuildConfig extends BaseConfig<any>, TGlobalConfig extends BaseConfig<any>> {
  autoInitGuilds?: boolean;
  getConfig?: (id: string) => Awaitable<any>;
  getEnabledGuildPlugins?: (ctx: GuildContext<TGuildConfig>, plugins: PluginMap) => Awaitable<string[]>;
  canLoadGuild?: (guildId: string) => Awaitable<boolean>;
  logFn?: LoggerFn;
  sendErrorMessageFn?: StatusMessageFn;
  sendSuccessMessageFn?: StatusMessageFn;
  [key: string]: any;
}

export interface KnubArgs<TGuildConfig extends BaseConfig<any>, TGlobalConfig extends BaseConfig<any>> {
  guildPlugins?: Plugin[];
  globalPlugins?: Plugin[];
  options?: KnubOptions<TGuildConfig, TGlobalConfig>;
}

export interface LoadedPlugin {
  class?: typeof PluginClass;
  instance?: PluginClass<any>;
  blueprint?: PluginBlueprint;
  pluginData: PluginData<any>;
}

export interface BaseContext<TConfig extends BaseConfig<any>> {
  config: TConfig;
  loadedPlugins: Map<string, LoadedPlugin>;
  locks: LockManager;
}

export interface GuildContext<TGuildConfig extends BaseConfig<any>> extends BaseContext<TGuildConfig> {
  guildId: string;
}

export type GlobalContext<TGlobalConfig extends BaseConfig<any>> = BaseContext<TGlobalConfig>;

export type AnyContext<TGuildConfig extends BaseConfig<any>, TGlobalConfig extends BaseConfig<any>> =
  | GuildContext<TGuildConfig>
  | GlobalContext<TGlobalConfig>;
