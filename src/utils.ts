/**
 * @file Internal utility functions/types
 */

/** */
export type Awaitable<T = unknown> = T | Promise<T>;

export type WithRequiredProps<T, K extends keyof T> = T &
  {
    [PK in K]-?: Exclude<T[K], null>;
  };

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

export const userMentionRegex = /^<@!?([0-9]+)>$/;
export const channelMentionRegex = /^<#([0-9]+)>$/;
export const roleMentionRegex = /^<@&([0-9]+)>$/;
export const snowflakeRegex = /^[1-9][0-9]{5,19}$/;

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

export const noop = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function
