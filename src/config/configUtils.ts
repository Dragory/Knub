import type z from "zod";
import type { BasePluginData } from "../plugins/PluginData.ts";
import type { BasePluginType } from "../plugins/pluginTypes.ts";
import { typedKeys } from "../utils.ts";
import type { CustomOverrideCriteriaFunctions, PluginOptions, PluginOverride } from "./configTypes.ts";

const levelRangeRegex = /^([<>=!]+)(\d+)$/;
const splitLevelRange = (v: string, defaultMod: string): [string, number] => {
  const match = levelRangeRegex.exec(v);
  return match ? [match[1], Number.parseInt(match[2], 10)] : [defaultMod, Number.parseInt(v, 10)];
};

export interface MatchParams<TExtra extends Record<string, unknown> = Record<string, unknown>> {
  level?: number | null;
  userId?: string | null;
  memberRoles?: string[] | null;
  channelId?: string | null;
  categoryId?: string | null;
  threadId?: string | null;
  isThread?: boolean | null;
  threadType?: "public" | "private" | null;
  extra?: TExtra;
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
export function mergeConfig<T extends Record<string, unknown>>(...sources: any[]): T {
  const target = {} as Record<string, unknown>;

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

  return target as T;
}

/**
 * Returns matching plugin options for the specified matchParams based on overrides
 */
export async function getMatchingPluginConfig<
  TPluginType extends BasePluginType,
  TPluginData extends BasePluginData<TPluginType> = BasePluginData<TPluginType>,
  // Inferred type, should not be overridden
  TPluginOptions extends PluginOptions<TPluginData["_pluginType"]> = PluginOptions<TPluginData["_pluginType"]>,
>({
  configSchema,
  pluginData,
  pluginOptions,
  matchParams,
  customOverrideCriteriaFunctions,
}: {
  configSchema: TPluginData["_pluginType"]["configSchema"];
  pluginData: TPluginData;
  pluginOptions: TPluginOptions;
  matchParams: MatchParams<TPluginData["_pluginType"]["customOverrideMatchParams"]>;
  customOverrideCriteriaFunctions?: CustomOverrideCriteriaFunctions<TPluginData>;
}): Promise<z.output<TPluginData["_pluginType"]["configSchema"]>> {
  let unparsedResult = mergeConfig(pluginOptions.config || {});

  const overrides = pluginOptions.overrides || [];
  for (const override of overrides) {
    const matches = await evaluateOverrideCriteria<TPluginData>(
      pluginData,
      override,
      matchParams,
      customOverrideCriteriaFunctions,
    );

    if (matches) {
      unparsedResult = mergeConfig(unparsedResult, override.config || {});
    }
  }

  return configSchema.parseAsync(unparsedResult);
}

/**
 * Each criteria "block" ({ level: "...", channel: "..." }) matches only if *all* criteria in it match.
 */
export async function evaluateOverrideCriteria<TPluginData extends BasePluginData<any>>(
  pluginData: TPluginData,
  criteria: PluginOverride<TPluginData["_pluginType"]>,
  matchParams: MatchParams,
  customOverrideCriteriaFunctions?: CustomOverrideCriteriaFunctions<TPluginData>,
): Promise<boolean> {
  // Note: Despite the naming here, this does *not* imply any one criterion matching means the entire criteria block
  // matches. When matching of one criterion fails, the command returns immediately. This variable is here purely so
  // a block with no criteria evaluates to false.
  let matchedOne = false;

  criteriaLoop: for (const key of typedKeys(criteria)) {
    if (key === "config") continue;
    if (criteria[key] == null) continue;

    // Match on level
    // For a successful match, requires ALL of the specified level conditions to match
    if (key === "level") {
      const value = criteria[key]!;
      const matchLevel = matchParams.level;
      if (matchLevel != null) {
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
      const value = criteria[key]!;
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
      const value = criteria[key]!;
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

    // Match on thread
    // For a successful match, requires ANY of the specified threads to match
    if (key === "thread") {
      const value = criteria[key]!;
      const matchThread = matchParams.threadId;
      if (matchThread) {
        const threads = Array.isArray(value) ? value : [value];
        let match = false;

        for (const threadId of threads) {
          match = match || matchThread === threadId;
        }

        if (!match) return false;
      } else {
        return false;
      }

      matchedOne = true;
      continue;
    }

    // Match on whether this is a thread (of any kind)
    if (key === "is_thread") {
      const value = criteria[key]!;
      if (value != null) {
        const match = matchParams.threadId != null;
        if (match !== value) return false;
      } else {
        return false;
      }

      matchedOne = true;
      continue;
    }

    // Match on thread type
    // For a successful match, requires ANY of the specified types to match
    if (key === "thread_type") {
      const value = criteria[key]!;
      const matchThreadType = matchParams.threadType;
      if (matchThreadType) {
        const types = Array.isArray(value) ? value : [value];
        let match = false;
        for (const t of types) {
          match = match || matchThreadType === t;
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
      const value = criteria[key]!;
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
      const value = criteria[key]!;
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

    if (key === "all") {
      const value = criteria[key]!;

      // Empty set of criteria -> false
      if (value.length === 0) return false;

      let match = true;
      for (const subCriteria of value) {
        match = match && (await evaluateOverrideCriteria<TPluginData>(pluginData, subCriteria, matchParams));
      }
      if (!match) return false;

      matchedOne = true;
      continue;
    }

    if (key === "any") {
      const value = criteria[key]!;

      // Empty set of criteria -> false
      if (value.length === 0) return false;

      let match = false;
      for (const subCriteria of value) {
        match = match || (await evaluateOverrideCriteria<TPluginData>(pluginData, subCriteria, matchParams));
      }
      if (match === false) return false;

      matchedOne = true;
      continue;
    }

    if (key === "not") {
      const value = criteria[key]!;

      const match = await evaluateOverrideCriteria<TPluginData>(pluginData, value, matchParams);
      if (match) return false;

      matchedOne = true;
      continue;
    }

    // Custom override criteria
    if (key === "extra") {
      const value = criteria[key]!;
      for (const customKey of Object.keys(value)) {
        if (customOverrideCriteriaFunctions?.[customKey] == null) {
          throw new Error(`Unknown custom override criteria: ${String(customKey)}`);
        }

        const match = await customOverrideCriteriaFunctions?.[customKey](pluginData, matchParams, value[customKey]);
        if (!match) return false;

        matchedOne = true;
        continue criteriaLoop;
      }
    }

    // Unknown condition -> error
    throw new Error(`Unknown override criteria: ${key}`);
  }

  return matchedOne;
}
