import { BaseConfig, PermissionLevels } from "../config/configTypes";
import { Member } from "eris";
import { AnyExtendedPluginClass, PluginClass } from "./PluginClass";
import { PluginBlueprint, ResolvedPluginBlueprintPublicInterface } from "./PluginBlueprint";
import path from "path";
import _fs from "fs";
import { BaseContext, GuildContext, Plugin, PluginMap } from "../types";
import { getMetadataFromAllProperties } from "./decoratorUtils";
import { EventListenerBlueprint } from "../events/EventListenerBlueprint";
import { CommandBlueprint } from "../commands/CommandBlueprint";
import { BasePluginType } from "./pluginTypes";
import { SemiCommandBlueprint } from "./decorators";
import { parseSignature } from "knub-command-manager";
import { baseTypeConverters } from "..";

const fs = _fs.promises;

/**
 * An identity function that helps with type hinting.
 * Takes a plugin blueprint as an argument and returns that same blueprint.
 */
export function plugin<TPluginType extends BasePluginType, T = PluginBlueprint<TPluginType>>(blueprint: T): T {
  return blueprint;
}

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

export function isPluginClass(value: any): value is typeof AnyExtendedPluginClass {
  return value?.prototype instanceof PluginClass;
}

export function isPluginClassInstance(value: any): value is AnyExtendedPluginClass {
  return value instanceof PluginClass;
}

export function isPluginBlueprint(value: any): value is PluginBlueprint<any> {
  return !isPluginClass(value);
}

// eslint-disable-next-line no-shadow
export function getPluginName(plugin: Plugin) {
  return isPluginClass(plugin) ? plugin.pluginName : plugin.name;
}

// eslint-disable-next-line no-shadow
export function applyPluginClassDecoratorValues(plugin: typeof AnyExtendedPluginClass) {
  if (plugin._decoratorValuesTransferred) {
    return;
  }

  const events = Array.from(
    Object.values(getMetadataFromAllProperties<EventListenerBlueprint<any>>(plugin, "decoratorEvents"))
  ).flat();

  plugin.events = plugin.events || [];
  plugin.events.push(...Object.values(events));

  const commands = Array.from(
    Object.values(getMetadataFromAllProperties<SemiCommandBlueprint>(plugin, "decoratorCommands"))
  ).flat();

  const commandTypes = { ...baseTypeConverters, ...plugin.customArgumentTypes };
  const commandsWithParsedSignatures: Array<CommandBlueprint<any, any>> = commands.map((cmd) => {
    return {
      ...cmd,
      signature: typeof cmd.signature === "string" ? parseSignature(cmd.signature, commandTypes) : cmd.signature,
    };
  });

  plugin.commands = plugin.commands || [];
  plugin.commands.push(...commandsWithParsedSignatures);

  plugin._decoratorValuesTransferred = true;
}

export function isGuildContext(ctx: BaseContext<any>): ctx is GuildContext<any> {
  return (ctx as any).guildId != null;
}

export function isGlobalContext(ctx: BaseContext<any>): ctx is GuildContext<any> {
  return !isGuildContext(ctx);
}

export type ResolvablePlugin = Plugin | string;

export type PluginPublicInterface<T extends ResolvablePlugin> = T extends typeof AnyExtendedPluginClass
  ? InstanceType<T>
  : T extends PluginBlueprint
  ? ResolvedPluginBlueprintPublicInterface<T["public"]>
  : unknown;

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
export function defaultGetEnabledGuildPlugins(ctx: BaseContext<BaseConfig<any>>, guildPlugins: PluginMap) {
  const plugins = ctx.config.plugins ?? {};
  return Array.from(guildPlugins.keys()).filter((pluginName) => {
    return plugins[pluginName]?.enabled !== false;
  });
}
