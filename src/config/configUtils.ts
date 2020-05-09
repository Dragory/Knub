import { PluginOptions, PluginOverrideCriteria } from "./configInterfaces";
import { Awaitable } from "../utils";

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

export interface MatchParams {
  level?: number;
  userId?: string;
  memberRoles?: string[];
  channelId?: string;
  categoryId?: string;
  extra?: any;
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
export function mergeConfig<T extends {}>(...sources: any[]): T {
  const target = {} as T;

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      // Merge objects
      if (typeof value === "object" && value != null && !Array.isArray(value)) {
        if (typeof target[key] === "object" && target[key] != null) {
          // Both source and target are objects, merge
          target[key] = mergeConfig(target[key], value);
        } else {
          // Only source is an object, overwrite
          target[key] = { ...value };
        }

        continue;
      }

      // Otherwise replace
      target[key] = value;
    }
  }

  return target;
}

type CustomOverrideResolver<T> = (criteria: T, matchParams: MatchParams) => Awaitable<boolean>;

/**
 * Returns matching plugin options for the specified matchParams based on overrides
 */
export function getMatchingPluginConfig<
  TConfig,
  TCustomOverrideCriteria = unknown,
  // Inferred type, should not be overridden
  TPluginOptions extends PluginOptions<TConfig, TCustomOverrideCriteria> = PluginOptions<
    TConfig,
    TCustomOverrideCriteria
  >
>(
  pluginOptions: TPluginOptions,
  matchParams: MatchParams,
  customOverrideCriteriaResolver?: CustomOverrideResolver<TCustomOverrideCriteria>
): TConfig {
  let result: TConfig = mergeConfig(pluginOptions.config || {});

  const overrides = pluginOptions.overrides || [];
  for (const override of overrides) {
    const matches = evaluateOverrideCriteria<TCustomOverrideCriteria>(
      override,
      matchParams,
      customOverrideCriteriaResolver
    );

    if (matches) {
      result = mergeConfig(result, override.config);
    }
  }

  return result as TConfig;
}

export function evaluateOverrideCriteria<TCustomOverrideCriteria = unknown>(
  criteria: PluginOverrideCriteria<TCustomOverrideCriteria>,
  matchParams: MatchParams,
  customOverrideCriteriaResolver?: CustomOverrideResolver<TCustomOverrideCriteria>
): boolean {
  let matchedOne = false;

  for (const [key, value] of Object.entries(criteria)) {
    if (key === "config") continue;

    // Match on level
    // For a successful match, requires ALL of the specified level conditions to match
    if (key === "level") {
      const matchLevel = matchParams.level;
      if (matchLevel) {
        const levels = Array.isArray(value) ? value : [value];
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

        if (!match) return false;
      } else {
        return false;
      }

      matchedOne = true;
      continue;
    }

    // Match on channel
    // For a successful match, requires ANY of the specified channels to match, WITHOUT exclusions
    if (key === "channel") {
      const matchChannel = matchParams.channelId;
      if (matchChannel) {
        const channels = Array.isArray(value) ? value : [value];
        let match = false;

        for (const channelId of channels) {
          const [mode, theChannelId] = splitCond(channelId, "=");

          if (mode === "=") match = match || matchChannel === theChannelId;
          else if (mode === "!" && matchChannel === theChannelId) {
            match = false;
            break;
          }
        }

        if (!match) return false;
      } else {
        return false;
      }

      matchedOne = true;
      continue;
    }

    // Match on category
    // For a successful match, requires ANY of the specified categories to match, WITHOUT exclusions
    if (key === "category") {
      const matchCategory = matchParams.categoryId;
      if (matchCategory) {
        const categories = Array.isArray(value) ? value : [value];
        let match = false;

        for (const categoryId of categories) {
          const [mode, theCategoryId] = splitCond(categoryId, "=");

          if (mode === "=") match = match || matchCategory === theCategoryId;
          else if (mode === "!" && matchCategory === theCategoryId) {
            match = false;
            break;
          }
        }

        if (!match) return false;
      } else {
        return false;
      }

      matchedOne = true;
      continue;
    }

    // Match on role
    // For a successful match, requires ALL specified roles and exclusions to match
    if (key === "role") {
      const matchRoles = matchParams.memberRoles;
      if (matchRoles) {
        const roles = Array.isArray(value) ? value : [value];
        let match = roles.length > 0;

        for (const role of roles) {
          const [mode, theRole] = splitCond(role, "=");

          if (mode === "=") match = match && matchRoles.includes(theRole);
          else if (mode === "!") match = match && !matchRoles.includes(theRole);
        }

        if (!match) return false;
      } else {
        return false;
      }

      matchedOne = true;
      continue;
    }

    // Match on user ID
    // For a successful match, requires ANY of the specified user IDs to match, WITHOUT exclusions
    if (key === "user") {
      const matchUser = matchParams.userId;
      if (matchUser) {
        const users = Array.isArray(value) ? value : [value];
        let match = false;

        for (const user of users) {
          const [mode, userId] = splitCond(user, "=");

          if (mode === "=") match = match || matchUser === userId;
          else if (mode === "!" && matchUser === userId) {
            match = false;
            break;
          }
        }

        if (!match) return false;
      } else {
        return false;
      }

      matchedOne = true;
      continue;
    }

    // Custom override criteria
    if (key === "extra" && customOverrideCriteriaResolver) {
      if (!customOverrideCriteriaResolver(value, matchParams)) return false;
      matchedOne = true;
      continue;
    }

    if (key === "all") {
      // Empty set of criteria -> false
      if (value.length === 0) return false;

      let match = true;
      for (const subCriteria of value) {
        match = match && evaluateOverrideCriteria<TCustomOverrideCriteria>(subCriteria, matchParams);
      }
      if (!match) return false;

      matchedOne = true;
      continue;
    }

    if (key === "any") {
      // Empty set of criteria -> false
      if (value.length === 0) return false;

      let match = false;
      for (const subCriteria of value) {
        match = match || evaluateOverrideCriteria<TCustomOverrideCriteria>(subCriteria, matchParams);
      }
      if (match === false) return false;

      matchedOne = true;
      continue;
    }

    if (key === "not") {
      const match = evaluateOverrideCriteria<TCustomOverrideCriteria>(value, matchParams);
      if (match) return false;

      matchedOne = true;
      continue;
    }

    // Unknown condition -> never match
    return false;
  }

  return matchedOne;
}
