import type { APIInteractionGuildMember, Guild, GuildMember, PartialGuildMember } from "discord.js";
import type { PermissionLevels } from "../config/configTypes.ts";
import type { AnyContext, GlobalContext, GuildContext, GuildPluginMap } from "../types.ts";
import type { KeyOfMap } from "../utils.ts";
import type {
  AnyGlobalPluginBlueprint,
  AnyGuildPluginBlueprint,
  AnyPluginBlueprint,
  BasePluginBlueprint,
} from "./PluginBlueprint.ts";

export function getMemberRoles(member: GuildMember | PartialGuildMember | APIInteractionGuildMember): string[] {
  return Array.isArray(member.roles) ? member.roles : Array.from(member.roles.cache.values()).map((r) => r.id);
}

export function getMemberLevel(
  levels: PermissionLevels,
  member: GuildMember | PartialGuildMember | APIInteractionGuildMember,
  guild: Guild,
): number {
  const memberId = "id" in member ? member.id : member.user.id;
  if (guild.ownerId === memberId) {
    return 99999;
  }

  const roles = getMemberRoles(member);
  for (const [id, level] of Object.entries<number>(levels)) {
    if (memberId === id || roles.includes(id)) {
      return level;
    }
  }

  return 0;
}

export function isGuildContext(ctx: AnyContext): ctx is GuildContext {
  return (ctx as any).guildId != null;
}

export function isGlobalContext(ctx: AnyContext): ctx is GuildContext {
  return !isGuildContext(ctx);
}

export function isGuildBlueprintByContext(
  _ctx: GuildContext,
  _blueprint: AnyPluginBlueprint,
): _blueprint is AnyGuildPluginBlueprint {
  return true;
}

export function isGlobalBlueprintByContext(
  _ctx: GlobalContext,
  _blueprint: AnyPluginBlueprint,
): _blueprint is AnyGlobalPluginBlueprint {
  return true;
}

export type PluginPublicInterface<T extends BasePluginBlueprint<any, any>> = NonNullable<T["public"]> extends (
  ...args: any[]
) => infer R
  ? R
  : null;

/**
 * By default, return an empty config for all guilds and the global config
 */
export function defaultGetConfig() {
  return {};
}

/**
 * By default, load all available guild plugins
 */
export function defaultGetEnabledGuildPlugins(
  _ctx: AnyContext,
  guildPlugins: GuildPluginMap,
): Array<KeyOfMap<GuildPluginMap>> {
  return Array.from(guildPlugins.keys());
}
