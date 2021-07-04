import { BaseConfig, PermissionLevels } from "../config/configTypes";
import {
  AnyPluginBlueprint,
  GlobalPluginBlueprint,
  GuildPluginBlueprint,
  PluginBlueprintPublicInterface,
  ResolvedPluginBlueprintPublicInterface,
} from "./PluginBlueprint";
import path from "path";
import _fs from "fs";
import { AnyContext, GlobalContext, GuildContext, GuildPluginMap } from "../types";
import { KeyOfMap } from "../utils";
import { Guild, GuildMember, PartialGuildMember, Snowflake } from "discord.js";

const fs = _fs.promises;

export function getMemberLevel(
  levels: PermissionLevels,
  member: GuildMember | PartialGuildMember,
  guild: Guild
): number {
  if (guild.ownerId === member.id) {
    return 99999;
  }

  for (const [id, level] of Object.entries(levels)) {
    if (member.id === id || member.roles.cache.has(id as Snowflake)) {
      return level;
    }
  }

  return 0;
}

export function isGuildContext(ctx: AnyContext<any, any>): ctx is GuildContext<any> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return (ctx as any).guildId != null;
}

export function isGlobalContext(ctx: AnyContext<any, any>): ctx is GuildContext<any> {
  return !isGuildContext(ctx);
}

export function isGuildBlueprintByContext(
  _ctx: GuildContext<any>,
  _blueprint: AnyPluginBlueprint
): _blueprint is GuildPluginBlueprint<any> {
  return true;
}

export function isGlobalBlueprintByContext(
  _ctx: GlobalContext<any>,
  _blueprint: AnyPluginBlueprint
): _blueprint is GlobalPluginBlueprint<any> {
  return true;
}

export type PluginPublicInterface<T extends AnyPluginBlueprint> =
  T["public"] extends PluginBlueprintPublicInterface<any> ? ResolvedPluginBlueprintPublicInterface<T["public"]> : null;

/**
 * Load JSON config files from a "config" folder, relative to cwd
 */
export async function defaultGetConfig(key: string): Promise<any> {
  const configFile = key ? `${key}.json` : "global.json";
  const configPath = path.join("config", configFile);

  try {
    await fs.access(configPath);
  } catch (e) {
    return {};
  }

  const json = await fs.readFile(configPath, { encoding: "utf8" });
  return JSON.parse(json); // eslint-disable-line @typescript-eslint/no-unsafe-return
}

/**
 * By default, load all guild plugins that haven't been explicitly disabled
 */
export function defaultGetEnabledGuildPlugins(
  ctx: AnyContext<BaseConfig<any>, BaseConfig<any>>,
  guildPlugins: GuildPluginMap
): Array<KeyOfMap<GuildPluginMap>> {
  const plugins = ctx.config.plugins ?? {};
  return Array.from(guildPlugins.keys()).filter((pluginName) => {
    return plugins[pluginName]?.enabled !== false;
  });
}
