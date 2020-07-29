import { PluginOptions, PluginOverrideCriteria } from "./configTypes";
import { PluginData } from "../plugins/PluginData";
import { BasePluginType } from "../plugins/pluginTypes";

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

/**
 * Match override criteria `criteria` against `matchParams`. Return `true` if the criteria matches matchParams.
 */
export type CustomOverrideMatcher<TPluginType extends BasePluginType> = (
  pluginData: PluginData<TPluginType>,
  criteria: TPluginType["customOverrideCriteria"],
  matchParams: MatchParams
) => boolean;

/**
 * Returns matching plugin options for the specified matchParams based on overrides
 */
export function getMatchingPluginConfig<
  TPluginType extends BasePluginType,
  // Inferred type, should not be overridden
  TPluginOptions extends PluginOptions<TPluginType> = PluginOptions<TPluginType>
>(
  pluginData: PluginData<TPluginType>,
  pluginOptions: TPluginOptions,
  matchParams: MatchParams,
  customOverrideMatcher?: CustomOverrideMatcher<TPluginType>
): TPluginType["config"] {
  let result: TPluginType["config"] = mergeConfig(pluginOptions.config || {});

  const overrides = pluginOptions.overrides || [];
  for (const override of overrides) {
    const matches = evaluateOverrideCriteria<TPluginType>(pluginData, override, matchParams, customOverrideMatcher);

    if (matches) {
      result = mergeConfig(result, override.config);
    }
  }

  return result as TPluginType["config"];
}

/**
 * Each criteria "block" ({ level: "...", channel: "..." }) matches only if *all* criteria in it match.
 */
export function evaluateOverrideCriteria<TPluginType extends BasePluginType>(
  pluginData: PluginData<TPluginType>,
  criteria: PluginOverrideCriteria<TPluginType["customOverrideCriteria"]>,
  matchParams: MatchParams,
  customOverrideMatcher?: CustomOverrideMatcher<TPluginType>
): boolean {
  // Note: Despite the naming here, this does *not* imply any one criterion matching means the entire criteria block
  // matches. When matching of one criterion fails, the command returns immediately. This variable is here purely so
  // a block with no criteria evaluates to false.
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
    // For a successful match, requires ANY of the specified channels to match
    if (key === "channel") {
      const matchChannel = matchParams.channelId;
      if (matchChannel) {
        const channels = Array.isArray(value) ? value : [value];
        let match = false;

        for (const channelId of channels) {
          match = match || matchChannel === channelId;
        }

        if (!match) return false;
      } else {
        return false;
      }

      matchedOne = true;
      continue;
    }

    // Match on category
    // For a successful match, requires ANY of the specified categories to match
    if (key === "category") {
      const matchCategory = matchParams.categoryId;
      if (matchCategory) {
        const categories = Array.isArray(value) ? value : [value];
        let match = false;

        for (const categoryId of categories) {
          match = match || matchCategory === categoryId;
        }

        if (!match) return false;
      } else {
        return false;
      }

      matchedOne = true;
      continue;
    }

    // Match on role
    // For a successful match, requires ALL specified roles to match
    if (key === "role") {
      const matchRoles = matchParams.memberRoles;
      if (matchRoles) {
        const roles = Array.isArray(value) ? value : [value];
        let match = roles.length > 0;

        for (const role of roles) {
          match = match && matchRoles.includes(role);
        }

        if (!match) return false;
      } else {
        return false;
      }

      matchedOne = true;
      continue;
    }

    // Match on user ID
    // For a successful match, requires ANY of the specified user IDs to match
    if (key === "user") {
      const matchUser = matchParams.userId;
      if (matchUser) {
        const users = Array.isArray(value) ? value : [value];
        let match = false;

        for (const user of users) {
          match = match || matchUser === user;
        }

        if (!match) return false;
      } else {
        return false;
      }

      matchedOne = true;
      continue;
    }

    // Custom override criteria
    if (key === "extra" && customOverrideMatcher) {
      if (!customOverrideMatcher(pluginData, value, matchParams)) return false;
      matchedOne = true;
      continue;
    }

    if (key === "all") {
      // Empty set of criteria -> false
      if (value.length === 0) return false;

      let match = true;
      for (const subCriteria of value) {
        match = match && evaluateOverrideCriteria<TPluginType>(pluginData, subCriteria, matchParams);
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
        match = match || evaluateOverrideCriteria<TPluginType>(pluginData, subCriteria, matchParams);
      }
      if (match === false) return false;

      matchedOne = true;
      continue;
    }

    if (key === "not") {
      const match = evaluateOverrideCriteria<TPluginType>(pluginData, value, matchParams);
      if (match) return false;

      matchedOne = true;
      continue;
    }

    // Unknown condition -> never match
    return false;
  }

  return matchedOne;
}
