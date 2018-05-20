import { IMergedConfig, IMergedPermissions } from "./configInterfaces";
import { Channel, GuildMember, Message, User } from "discord.js";

const at = require("lodash.at");
const diff = require("lodash.difference");

const isNumRegex = /\d/;
const isNum = v => isNumRegex.test(v);

const modRegex = /^[+\-=]/;
const splitMod = (v): [string, string] => {
  const res = modRegex.exec(v);
  return res ? [res[0], v.slice(1)] : ["+", v];
};

export function mergeConfig(target, ...sources) {
  for (const source of sources) {
    for (const [rawKey, value] of Object.entries(source)) {
      const [mod, key] = splitMod(rawKey);

      if (mod === "+") {
        if (Array.isArray(value)) {
          target[key] = (target[key] || []).concat(value);
        } else if (typeof value === "object") {
          target[key] = mergeConfig(target[key] || {}, value);
        } else {
          target[key] = value;
        }
      } else if (mod === "-") {
        if (Array.isArray(value)) {
          target[key] = diff(target[key] || [], value);
        }
      } else if (mod === "=") {
        target[key] = value;
      }
    }
  }

  return target;
}

export function getMatchingConfigOrPermissions(
  config: IMergedConfig | IMergedPermissions,
  memberLevel: number = null,
  user: User = null,
  member: GuildMember = null,
  channel: Channel = null
) {
  const finalConfig = {};

  // Default (from the config)
  if (config.default) {
    mergeConfig(finalConfig, config.default);
  }

  // Level-based
  if (config.levels && memberLevel != null) {
    for (const [level, levelPerms] of Object.entries(config.levels)) {
      const [mode, theLevel] = isNum(level[0]) ? [">=", parseInt(level, 10)] : [level[0], parseInt(level.slice(1), 10)];

      if (mode === "<" && !(memberLevel < theLevel)) continue;
      else if (mode === "<=" && !(memberLevel <= theLevel)) continue;
      else if (mode === ">" && !(memberLevel > theLevel)) continue;
      else if (mode === ">=" && !(memberLevel >= theLevel)) continue;
      else if (mode === "=" && !(memberLevel === theLevel)) continue;
      else if (mode === "!" && !(memberLevel !== theLevel)) continue;

      mergeConfig(finalConfig, levelPerms);
    }
  }

  // Channel-based
  if (config.channels && channel) {
    for (const [channelId, channelPerms] of Object.entries(config.channels)) {
      const [mode, theChannelId] = isNum(channelId[0]) ? ["=", channelId] : [channelId[0], channelId.slice(1)];

      if (mode === "=" && !(channel.id === theChannelId)) continue;
      else if (mode === "!" && !(channel.id !== theChannelId)) continue;

      mergeConfig(finalConfig, channelPerms);
    }
  }

  // Role-based
  if (config.roles && member) {
    for (const [role, rolePerms] of Object.entries(config.roles)) {
      const [mode, theRole] = isNum(role[0]) ? ["=", role] : [role[0], role.slice(1)];

      if (mode === "=" && !member.roles.has(theRole)) continue;
      else if (mode === "!" && member.roles.has(theRole)) continue;

      mergeConfig(finalConfig, rolePerms);
    }
  }

  // User-based
  if (config.users) {
    for (const [userId, userPerms] of Object.entries(config.users)) {
      const [mode, theUser] = isNum(userId[0]) ? ["=", userId] : [userId[0], userId.slice(1)];

      if (mode === "=" && !(user.id === theUser)) continue;
      else if (mode === "!" && !(user.id === theUser)) continue;

      mergeConfig(finalConfig, userPerms);
    }
  }

  return finalConfig;
}

export function hasPermission(
  requiredPermission: string,
  permissions: IMergedPermissions,
  memberLevel: number,
  user: User,
  member: GuildMember,
  channel: Channel
) {
  const matchingPerms = getMatchingConfigOrPermissions(permissions, memberLevel, user, member, channel);
  return !!at(matchingPerms, requiredPermission)[0];
}
