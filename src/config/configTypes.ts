import { DeepPartial } from "ts-essentials";
import { z } from "zod";
import { AnyPluginData, BasePluginData } from "../plugins/PluginData";
import { BasePluginType } from "../plugins/pluginTypes";
import { Awaitable } from "../utils";
import { MatchParams } from "./configUtils";

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
  config: TPluginType["config"];
  replaceDefaultOverrides?: boolean;
  overrides?: Array<PluginOverride<TPluginType>>;
}

export interface PluginOverride<TPluginType extends BasePluginType>
  extends PluginOverrideCriteria<TPluginType["customOverrideCriteria"]> {
  config?: DeepPartial<TPluginType["config"]>;
}

export interface PluginOverrideCriteria<TCustomOverrideCriteria> {
  channel?: string | string[] | null;
  category?: string | string[] | null;
  level?: string | string[] | null;
  user?: string | string[] | null;
  role?: string | string[] | null;
  thread?: string | string[] | null;
  is_thread?: boolean | null;
  thread_type?: "public" | "private" | null;

  all?: Array<PluginOverrideCriteria<TCustomOverrideCriteria>> | null;
  any?: Array<PluginOverrideCriteria<TCustomOverrideCriteria>> | null;
  not?: PluginOverrideCriteria<TCustomOverrideCriteria> | null;

  extra?: TCustomOverrideCriteria | null;
}

export type ConfigParserFn<TConfig> = (input: unknown) => Awaitable<TConfig>;

export type CustomOverrideCriteriaFunctions<TPluginData extends BasePluginData<any>> = {
  [KCriterion in keyof TPluginData["_pluginType"]["customOverrideCriteria"]]: (
    pluginData: TPluginData,
    matchParams: MatchParams<TPluginData["_pluginType"]["customOverrideMatchParams"]>,
    value: NonNullable<TPluginData["_pluginType"]["customOverrideCriteria"][KCriterion]>,
  ) => Awaitable<boolean>;
};
