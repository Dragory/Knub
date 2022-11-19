/**
 * @file Internal utility functions/types
 */

import { Snowflake } from "discord.js";

/** */
export type Awaitable<T = unknown> = T | Promise<T>;

export type WithRequiredProps<T, K extends keyof T> = T & {
  [PK in K]-?: Exclude<T[K], null>;
};

export function get<TObj>(obj: TObj, path: string, def?: any): unknown {
  let cursor = obj;
  if (cursor === undefined) return def;
  if (cursor == null) return null;

  const pathParts = path.split(".");
  for (const part of pathParts) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value = cursor[part];
    if (value === undefined) return def;
    if (value == null) return null;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    cursor = value;
  }
  return cursor;
}

export const userMentionRegex = /^<@!?([0-9]+)>$/;
export const channelMentionRegex = /^<#([0-9]+)>$/;
export const roleMentionRegex = /^<@&([0-9]+)>$/;
export const snowflakeRegex = /^[1-9][0-9]{5,19}$/;

export function getUserId(str: string): Snowflake | null {
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

export function getChannelId(str: string): Snowflake | null {
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

export function getRoleId(str: string): Snowflake | null {
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

export const noop = (): void => {}; // eslint-disable-line @typescript-eslint/no-empty-function

export const typedKeys = Object.keys as unknown as <T = Record<string, unknown>>(o: T) => Array<keyof T>;

// From https://stackoverflow.com/a/60737746/316944
export type KeyOfMap<M extends Map<unknown, unknown>> = M extends Map<infer K, unknown> ? K : never;

export function indexBy<Obj, Key extends keyof Obj>(arr: Obj[], key: Key): Map<Obj[Key], Obj> {
  return arr.reduce((map, obj) => {
    map.set(obj[key], obj);
    return map;
  }, new Map<Obj[Key], Obj>());
}
