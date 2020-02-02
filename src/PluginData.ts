import { Client, Guild } from "eris";
import { PluginEventManager } from "./PluginEventManager";
import { PluginCommandManager } from "./PluginCommandManager";
import { PluginConfigManager } from "./PluginConfigManager";
import { LockManager } from "./LockManager";

export interface PluginData<TConfig = any, TCustomOverrideCriteria = unknown> {
  client: Client;
  guilds: Guild[];
  config: PluginConfigManager<TConfig, TCustomOverrideCriteria>;
  events: PluginEventManager;
  commands: PluginCommandManager;
  locks: LockManager;
}
