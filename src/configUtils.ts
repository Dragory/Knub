import { IPartialPluginOptions } from "./configInterfaces";

const at = require("lodash.at");
const diff = require("lodash.difference");

const modRegex = /^[+\-=]/;
const splitMod = (v, defaultMod): [string, string] => {
  const res = modRegex.exec(v);
  return res ? [res[0], v.slice(1)] : [defaultMod, v];
};

const condRegex = /^(\D+)(\d+)$/;
const splitCond = (v, defaultCond): [string, string] => {
  const match = condRegex.exec(v);
  return match ? [match[1], match[2]] : [defaultCond, v];
};

const levelRangeRegex = /^([<>=!]+)(\d+)$/;
const splitLevelRange = (v, defaultMod): [string, number] => {
  const match = levelRangeRegex.exec(v);
  return match ? [match[1], parseInt(match[2], 10)] : [defaultMod, parseInt(v, 10)];
};

export interface IMatchParams {
  level?: number;
  userId?: string;
  memberRoles?: string[];
  channelId?: string;
  categoryId?: string;
}

function setAllPropsRecursively<T>(target: T, newValue: any): T {
  for (const [key, value] of Object.entries(target)) {
    if (key === "*") continue;

    if (typeof value === "object" && value != null && !Array.isArray(value)) {
      target[key] = setAllPropsRecursively(value, newValue);
    } else {
      target[key] = newValue;
    }
  }

  return target;
}

/**
 * Basic deep merge with support for specifying merge "rules" with key prefixes.
 * For example, prefixing the key of a property containing an array with "+" would concat the two arrays, while
 * a prefix of "-" would calculate the difference ("remove items").
 *
 * Using '*' as a key will set that value to all known properties in the config at that time.
 * This is mostly used for permissions.
 *
 * @param {T} target
 * @param {T} sources
 * @returns {T}
 */
export function mergeConfig<T>(target: T, ...sources: T[]): T {
  for (const source of sources) {
    for (const [rawKey, value] of Object.entries(source)) {
      const defaultMod = Array.isArray(value) ? "=" : "+";
      const [mod, key] = splitMod(rawKey, defaultMod);

      if (key === "*") {
        setAllPropsRecursively(target, value);
        continue;
      }

      if (mod === "+") {
        if (Array.isArray(value)) {
          target[key] = (target[key] || []).concat(value);
        } else if (typeof value === "object" && value != null) {
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

/**
 * Returns matching plugin options for the specified matchParams based on the overrides of the plugin options
 */
export function getMatchingPluginOptions<T extends IPartialPluginOptions = IPartialPluginOptions>(
  pluginOptions: T,
  matchParams: IMatchParams
): T {
  const finalOpts: T = {
    config: mergeConfig({}, pluginOptions.config || {})
  } as T;

  const overrides = pluginOptions.overrides || [];
  for (const override of overrides) {
    const matches = [];

    // Match on level
    // For a successful match, requires ALL of the specified level conditions to match
    if (override.level) {
      const matchLevel = matchParams.level;
      if (matchLevel) {
        const levels = Array.isArray(override.level) ? override.level : [override.level];
        let match = levels.length > 0; // Zero level conditions = assume user error, don't match

        for (const level of levels) {
          const [mode, theLevel] = splitLevelRange(level, ">=");

          if (mode === "<" && !(matchLevel < theLevel)) match = false;
          else if (mode === "<=" && !(matchLevel <= theLevel)) match = false;
          else if (mode === ">" && !(matchLevel > theLevel)) match = false;
          else if (mode === ">=" && !(matchLevel >= theLevel)) match = false;
          else if (mode === "=" && !(matchLevel === theLevel)) match = false;
          else if (mode === "!" && !(matchLevel !== theLevel)) match = false;
        }

        matches.push(match);
      } else {
        matches.push(false);
      }
    }

    // Match on channel
    // For a successful match, requires ANY of the specified channels to match, WITHOUT exclusions
    if (override.channel) {
      const matchChannel = matchParams.channelId;
      if (matchChannel) {
        const channels = Array.isArray(override.channel) ? override.channel : [override.channel];
        let match = false;

        for (const channelId of channels) {
          const [mode, theChannelId] = splitCond(channelId, "=");

          if (mode === "=") match = match || matchChannel === theChannelId;
          else if (mode === "!" && matchChannel === theChannelId) {
            match = false;
            break;
          }
        }

        matches.push(match);
      } else {
        matches.push(false);
      }
    }

    // Match on category
    // For a successful match, requires ANY of the specified categories to match, WITHOUT exclusions
    if (override.category) {
      const matchCategory = matchParams.categoryId;
      if (matchCategory) {
        const categories = Array.isArray(override.category) ? override.category : [override.category];
        let match = false;

        for (const categoryId of categories) {
          const [mode, theCategoryId] = splitCond(categoryId, "=");

          if (mode === "=") match = match || matchCategory === theCategoryId;
          else if (mode === "!" && matchCategory === theCategoryId) {
            match = false;
            break;
          }
        }

        matches.push(match);
      } else {
        matches.push(false);
      }
    }

    // Match on role
    // For a successful match, requires ALL specified roles and exclusions to match
    if (override.role) {
      const matchRoles = matchParams.memberRoles;
      if (matchRoles) {
        const roles = Array.isArray(override.role) ? override.role : [override.role];
        let match = roles.length > 0;

        for (const role of roles) {
          const [mode, theRole] = splitCond(role, "=");

          if (mode === "=") match = match && matchRoles.includes(theRole);
          else if (mode === "!") match = match && !matchRoles.includes(theRole);
        }

        matches.push(match);
      } else {
        matches.push(false);
      }
    }

    // Match on user ID
    // For a successful match, requires ANY of the specified user IDs to match, WITHOUT exclusions
    if (override.user) {
      const matchUser = matchParams.userId;
      if (matchUser) {
        const users = Array.isArray(override.user) ? override.user : [override.user];
        let match = false;

        for (const user of users) {
          const [mode, userId] = splitCond(user, "=");

          if (mode === "=") match = match || matchUser === userId;
          else if (mode === "!" && matchUser === userId) {
            match = false;
            break;
          }
        }

        matches.push(match);
      } else {
        matches.push(false);
      }
    }

    // Based on override type, require any or all matches to have matched
    let acceptMatches;
    if (!override.type || override.type === "all") {
      acceptMatches = !matches.some(v => !v);
    } else {
      acceptMatches = matches.some(v => v);
    }

    if (acceptMatches) {
      if (override.config) mergeConfig(finalOpts.config, override.config);
    }
  }

  return finalOpts;
}
