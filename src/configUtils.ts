import { IBasePluginConfig, IPartialPluginOptions, IPluginOptions, IPluginOverrideCriteria } from "./configInterfaces";

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

type CustomOverrideResolver<T> = (criteria: T, matchParams: IMatchParams) => boolean | Promise<boolean>;

/**
 * Returns matching plugin options for the specified matchParams based on overrides
 */
export function getMatchingPluginConfig<
  TConfig,
  TCustomOverrideCriteria = unknown,
  // Inferred type, should not be overridden
  TPluginOptions extends IPluginOptions<TConfig, TCustomOverrideCriteria> = IPluginOptions<
    TConfig,
    TCustomOverrideCriteria
  >
>(
  pluginOptions: TPluginOptions,
  matchParams: IMatchParams,
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
  criteria: IPluginOverrideCriteria<TCustomOverrideCriteria>,
  matchParams: IMatchParams,
  customOverrideCriteriaResolver?: CustomOverrideResolver<TCustomOverrideCriteria>
): boolean {
  let matchedOne = false;

  // Match on level
  // For a successful match, requires ALL of the specified level conditions to match
  if (criteria.level) {
    const matchLevel = matchParams.level;
    if (matchLevel) {
      const levels = Array.isArray(criteria.level) ? criteria.level : [criteria.level];
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
  }

  // Match on channel
  // For a successful match, requires ANY of the specified channels to match, WITHOUT exclusions
  if (criteria.channel) {
    const matchChannel = matchParams.channelId;
    if (matchChannel) {
      const channels = Array.isArray(criteria.channel) ? criteria.channel : [criteria.channel];
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
  }

  // Match on category
  // For a successful match, requires ANY of the specified categories to match, WITHOUT exclusions
  if (criteria.category) {
    const matchCategory = matchParams.categoryId;
    if (matchCategory) {
      const categories = Array.isArray(criteria.category) ? criteria.category : [criteria.category];
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
  }

  // Match on role
  // For a successful match, requires ALL specified roles and exclusions to match
  if (criteria.role) {
    const matchRoles = matchParams.memberRoles;
    if (matchRoles) {
      const roles = Array.isArray(criteria.role) ? criteria.role : [criteria.role];
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
  }

  // Match on user ID
  // For a successful match, requires ANY of the specified user IDs to match, WITHOUT exclusions
  if (criteria.user) {
    const matchUser = matchParams.userId;
    if (matchUser) {
      const users = Array.isArray(criteria.user) ? criteria.user : [criteria.user];
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
  }

  // Custom override criteria
  if (criteria.extra && customOverrideCriteriaResolver) {
    if (!customOverrideCriteriaResolver(criteria.extra, matchParams)) return false;
    matchedOne = true;
  }

  if (criteria.all) {
    // Empty set of criteria -> false
    if (criteria.all.length === 0) return false;

    let match = true;
    for (const subCriteria of criteria.all) {
      match = match && evaluateOverrideCriteria<TCustomOverrideCriteria>(subCriteria, matchParams);
    }
    if (!match) return false;

    matchedOne = true;
  }

  if (criteria.any) {
    // Empty set of criteria -> false
    if (criteria.any.length === 0) return false;

    let match = false;
    for (const subCriteria of criteria.any) {
      match = match || evaluateOverrideCriteria<TCustomOverrideCriteria>(subCriteria, matchParams);
    }
    if (match === false) return false;

    matchedOne = true;
  }

  if (criteria.not) {
    const match = evaluateOverrideCriteria<TCustomOverrideCriteria>(criteria.not, matchParams);
    if (match) return false;

    matchedOne = true;
  }

  return matchedOne;
}
