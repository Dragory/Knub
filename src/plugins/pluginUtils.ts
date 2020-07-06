import { BaseConfig, PermissionLevels } from "../config/configTypes";
import { Member } from "eris";
import { PluginBlueprint, ResolvedPluginBlueprintPublicInterface } from "./PluginBlueprint";
import path from "path";
import _fs from "fs";
import { BaseContext, GuildContext, PluginMap } from "../types";

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

export function isGuildContext(ctx: BaseContext<any>): ctx is GuildContext<any> {
  return (ctx as any).guildId != null;
}

export function isGlobalContext(ctx: BaseContext<any>): ctx is GuildContext<any> {
  return !isGuildContext(ctx);
}

export type PluginPublicInterface<T extends PluginBlueprint<any>> = ResolvedPluginBlueprintPublicInterface<T["public"]>;

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
