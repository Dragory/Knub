import { Client, Guild } from "eris";
import { PluginEventManager } from "./events/PluginEventManager";
import { PluginCommandManager } from "./commands/PluginCommandManager";
import { PluginConfigManager } from "./config/PluginConfigManager";
import { LockManager } from "./LockManager";
import { AnyExtendedPlugin } from "./Plugin";
import { CooldownManager } from "./CooldownManager";
import { Knub } from "./Knub";

type GetPluginFn = <T extends typeof AnyExtendedPlugin>(plugin: T) => InstanceType<T>;

export interface PluginData<TConfig = any, TCustomOverrideCriteria = unknown> {
  client: Client;
  guild: Guild;
  config: PluginConfigManager<TConfig, TCustomOverrideCriteria>;
  events: PluginEventManager;
  commands: PluginCommandManager;
  locks: LockManager;
  cooldowns: CooldownManager;
  // getPlugin: GetPluginFn;
  guildConfig: any;
}

export interface PluginClassData<TConfig = any, TCustomOverrideCriteria = unknown>
  extends PluginData<TConfig, TCustomOverrideCriteria> {
  /**
   * @deprecated Kept here for backwards compatibility. Not recommended to use directly.
   */
  knub: Knub;
}
