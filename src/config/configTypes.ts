import type { DeepPartial } from "ts-essentials";
import { ZodType, z } from "zod/v4";
import type { BasePluginData } from "../plugins/PluginData.ts";
import type { BasePluginType } from "../plugins/pluginTypes.ts";
import type { Awaitable } from "../utils.ts";
import type { MatchParams } from "./configUtils.ts";

export const permissionLevelsSchema = z.record(z.string(), z.number().int(), {});
export type PermissionLevels = z.TypeOf<typeof permissionLevelsSchema>;

export const pluginBaseOptionsSchema = z.strictObject({
  config: z.unknown().optional(),
  replaceDefaultOverrides: z.boolean().optional(),
  overrides: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const baseConfigSchema = z.strictObject({
  prefix: z.string().optional(),
  levels: permissionLevelsSchema.optional(),
  plugins: z.record(z.string(), pluginBaseOptionsSchema).optional(),
});
export type BaseConfig = z.TypeOf<typeof baseConfigSchema>;

export interface PluginOptions<TPluginType extends BasePluginType> {
  config?: z.input<TPluginType["configSchema"]>;
  replaceDefaultOverrides?: boolean;
  overrides?: Array<PluginOverride<TPluginType>>;
}

export interface PluginOverride<TPluginType extends BasePluginType> extends PluginOverrideCriteria {
  config?: DeepPartial<z.input<TPluginType["configSchema"]>>;
}

export const basePluginOverrideCriteriaSchema = z.strictObject({
  channel: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  category: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  level: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  user: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  role: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  thread: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  is_thread: z.boolean().nullable().optional(),
  thread_type: z.literal(["public", "private"]).nullable().optional(),
  extra: z.any().optional(),
});

export const pluginOverrideCriteriaSchema = basePluginOverrideCriteriaSchema.extend({
  get all() {
    return z.array(pluginOverrideCriteriaSchema).nullable().optional();
  },
  get any() {
    return z.array(pluginOverrideCriteriaSchema).nullable().optional();
  },
  get not() {
    return pluginOverrideCriteriaSchema.nullable().optional();
  },
});

export type PluginOverrideCriteria = z.infer<typeof pluginOverrideCriteriaSchema>;

export type ConfigParserFn<TConfig> = (input: unknown) => Awaitable<TConfig>;

export type CustomOverrideCriteriaFunctions<TPluginData extends BasePluginData<any>> = {
  [KCriterion in keyof TPluginData["_pluginType"]["customOverrideCriteria"]]: (
    pluginData: TPluginData,
    matchParams: MatchParams<TPluginData["_pluginType"]["customOverrideMatchParams"]>,
    value: NonNullable<TPluginData["_pluginType"]["customOverrideCriteria"][KCriterion]>,
  ) => Awaitable<boolean>;
};
