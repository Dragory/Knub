import { Client, Guild } from "eris";

export type ArbitraryFunction = (...args: any[]) => any;

export type Awaitable<T = unknown> = T | Promise<T>;

/**
 * For unicode emoji, the unicode char/string itself.
 * For custom emoji, a string in the format `"emojiName:emojiID"`.
 * @see https://abal.moe/Eris/docs/Message#function-addReaction
 */
export type Reaction = string;

export function get(obj, path, def?): any {
  let cursor = obj;
  const pathParts = path.split(".");
  for (const part of pathParts) {
    cursor = cursor[part];
    if (cursor === undefined) return def;
    if (cursor == null) return null;
  }
  return cursor;
}

const userMentionRegex = /^<@!?([0-9]+)>$/;
const channelMentionRegex = /^<#([0-9]+)>$/;
const roleMentionRegex = /^<@&([0-9]+)>$/;
const snowflakeRegex = /^[1-9][0-9]{5,19}$/;

export function getUserId(str: string) {
  str = str.trim();

  if (str.match(snowflakeRegex)) {
    // User ID
    return str;
  } else {
    const mentionMatch = str.match(userMentionRegex);
    if (mentionMatch) {
      return mentionMatch[1];
    }
  }

  return null;
}

export function getChannelId(str: string) {
  str = str.trim();

  if (str.match(snowflakeRegex)) {
    // Channel ID
    return str;
  } else {
    const mentionMatch = str.match(channelMentionRegex);
    if (mentionMatch) {
      return mentionMatch[1];
    }
  }

  return null;
}

export function getRoleId(str: string) {
  str = str.trim();

  if (str.match(snowflakeRegex)) {
    // Role ID
    return str;
  } else {
    const mentionMatch = str.match(roleMentionRegex);
    if (mentionMatch) {
      return mentionMatch[1];
    }
  }

  return null;
}

export function resolveUser(bot: Client, str: string) {
  const userId = getUserId(str);
  return userId && bot.users.get(userId);
}

export function resolveMember(guild: Guild, str: string) {
  const memberId = getUserId(str);
  return memberId && guild.members.get(memberId);
}

export function resolveChannel(guild: Guild, str: string) {
  const channelId = getChannelId(str);
  return channelId && guild.channels.get(channelId);
}

export function resolveRole(guild: Guild, str: string) {
  const roleId = getRoleId(str);
  return roleId && guild.roles.get(roleId);
}

export const noop = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function
