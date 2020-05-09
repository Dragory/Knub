import { BaseConfig, PermissionLevels } from "./config/configInterfaces";
import { Member } from "eris";
import { get } from "./utils";
import { AnyExtendedPluginClass, PluginClass } from "./PluginClass";
import { PluginBlueprint } from "./PluginBlueprint";
import path from "path";
import _fs from "fs";
import { GuildContext, BaseContext, PluginMap, ValidPlugin } from "./types";
import { getMetadataFromAllProperties } from "./decoratorUtils";
import { EventListenerBlueprint } from "./events/EventListenerBlueprint";
import { CommandBlueprint } from "./commands/CommandBlueprint";

const fs = _fs.promises;

export function getMemberLevel(levels: PermissionLevels, member: Member): number {
  if (member.guild.ownerID === member.id) {
    return 99999;
  }

  for (const [id, level] of Object.entries(levels)) {
    if (member.id === id || (member.roles && member.roles.includes(id))) {
      return level;
    }
  }

  return 0;
}

export function hasPermission(config: any, permission: string) {
  return get(config, permission) === true;
}

export function isPluginClass(value: any): value is typeof AnyExtendedPluginClass {
  return value?.prototype instanceof PluginClass;
}

export function isPluginClassInstance(value: any): value is AnyExtendedPluginClass {
  return value instanceof PluginClass;
}

export function isPluginBlueprint(value: any): value is PluginBlueprint {
  return !isPluginClass(value);
}

export function getPluginName(plugin: ValidPlugin) {
  return isPluginClass(plugin) ? plugin.pluginName : plugin.name;
}

export function transferPluginClassDecoratorValues(plugin: typeof AnyExtendedPluginClass) {
  if (plugin._decoratorValuesTransferred) {
    return;
  }

  const events = Array.from(
    Object.values(getMetadataFromAllProperties<EventListenerBlueprint>(plugin, "decoratorEvents"))
  ).flat();

  plugin.events = plugin.events || [];
  plugin.events.push(...Object.values(events));

  const commands = Array.from(
    Object.values(getMetadataFromAllProperties<CommandBlueprint>(plugin, "decoratorCommands"))
  ).flat();

  plugin.commands = plugin.commands || [];
  plugin.commands.push(...Object.values(commands));

  plugin._decoratorValuesTransferred = true;
}

export function isGuildContext(ctx: BaseContext<any>): ctx is GuildContext<any> {
  return (ctx as any).guildId != null;
}

export function isGlobalContext(ctx: BaseContext<any>): ctx is GuildContext<any> {
  return !isGuildContext(ctx);
}

/**
 * Load JSON config files from a "config" folder, relative to cwd
 */
export async function defaultGetConfig(key) {
  const configFile = key ? `${key}.json` : "global.json";
  const configPath = path.join("config", configFile);

  try {
    await fs.access(configPath);
  } catch (e) {
    return {};
  }

  const json = await fs.readFile(configPath, { encoding: "utf8" });
  return JSON.parse(json);
}

/**
 * By default, load all guild plugins that haven't been explicitly disabled
 */
export function defaultGetEnabledGuildPlugins(ctx: BaseContext<BaseConfig>, guildPlugins: PluginMap) {
  const plugins = ctx.config.plugins ?? {};
  return Array.from(guildPlugins.keys()).filter((pluginName) => {
    return plugins[pluginName]?.enabled !== false;
  });
}

/**
 * By default, load all global plugins that haven't been explicitly disabled
 */
export function defaultGetEnabledGlobalPlugins(ctx: BaseContext<BaseConfig>, globalPlugins: PluginMap) {
  const plugins = ctx.config.plugins ?? {};
  return Array.from(globalPlugins.keys()).filter((pluginName) => {
    return plugins[pluginName]?.enabled !== false;
  });
}
