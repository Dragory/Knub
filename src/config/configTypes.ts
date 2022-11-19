import { DeepPartial } from "ts-essentials";
import { BasePluginType } from "../plugins/pluginTypes";
import { Awaitable } from "../utils";
import { MatchParams } from "./configUtils";
import { AnyPluginData } from "../plugins/PluginData";
import { z } from "zod";

export const permissionLevelsSchema = z.record(z.string(), z.number().int());
export type PermissionLevels = z.TypeOf<typeof permissionLevelsSchema>;

export const pluginBaseOptionsSchema = z.object({
  config: z.unknown().optional(),
  overrides: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const baseConfigSchema = z.object({
  prefix: z.string().optional(),
  levels: permissionLevelsSchema.optional(),
  plugins: z.array(pluginBaseOptionsSchema).optional(),
});
export type BaseConfig = z.TypeOf<typeof baseConfigSchema>;

export interface PluginOptions<TPluginType extends BasePluginType> {
  config: TPluginType["config"];
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

export type CustomOverrideCriteriaFunctions<TPluginData extends AnyPluginData<any>> = {
  [KCriterion in keyof TPluginData["_pluginType"]["customOverrideCriteria"]]: (
    pluginData: TPluginData,
    matchParams: MatchParams<TPluginData["_pluginType"]["customOverrideMatchParams"]>,
    value: NonNullable<TPluginData["_pluginType"]["customOverrideCriteria"][KCriterion]>
  ) => Awaitable<boolean>;
};
