import { Client, Guild } from "eris";
import { PluginEventManager } from "./PluginEventManager";
import { PluginCommandManager } from "./PluginCommandManager";
import { PluginConfigManager } from "./PluginConfigManager";
import { LockManager } from "./LockManager";
import { Plugin } from "./Plugin";
import { CooldownManager } from "./CooldownManager";
import { Knub } from "./Knub";

type GetPluginFn = <T extends typeof Plugin>(plugin: T) => InstanceType<T>;

export interface PluginData<TConfig = any, TCustomOverrideCriteria = unknown> {
  client: Client;
  guild: Guild;
  config: PluginConfigManager<TConfig, TCustomOverrideCriteria>;
  events: PluginEventManager;
  commands: PluginCommandManager;
  locks: LockManager;
  cooldowns: CooldownManager;
  getPlugin: GetPluginFn;
  guildConfig: any;
}

export interface PluginClassData<TConfig = any, TCustomOverrideCriteria = unknown>
  extends PluginData<TConfig, TCustomOverrideCriteria> {
  /**
   * @deprecated Kept here for backwards compatibility. Not recommended to use directly.
   */
  knub: Knub;
}
