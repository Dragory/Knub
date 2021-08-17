import { DeepPartial } from "ts-essentials";
import { BasePluginType } from "../plugins/pluginTypes";
import { Awaitable } from "../utils";
import { MatchParams } from "./configUtils";
import { AnyPluginData } from "../plugins/PluginData";

export interface PermissionLevels {
  [roleOrUserId: string]: number;
}

export interface BaseConfig<TPluginType extends BasePluginType> {
  prefix?: string;

  levels?: PermissionLevels;

  plugins?: {
    [key: string]: PartialPluginOptions<TPluginType>;
  };
}

export interface PartialPluginOptions<TPluginType extends BasePluginType> {
  enabled?: boolean;
  config?: DeepPartial<TPluginType["config"]>;
  overrides?: Array<PluginOverride<TPluginType>>;
  replaceDefaultOverrides?: boolean;
}

export interface PluginOptions<TPluginType extends BasePluginType> {
  enabled?: boolean;
  config: TPluginType["config"];
  overrides?: Array<PluginOverride<TPluginType>>;
  replaceDefaultOverrides?: boolean;
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

export type CustomOverrideCriteriaFunctions<TPluginData extends AnyPluginData<any>> = {
  [KCriterion in keyof TPluginData["_pluginType"]["customOverrideCriteria"]]: (
    pluginData: TPluginData,
    matchParams: MatchParams<TPluginData["_pluginType"]["customOverrideMatchParams"]>,
    value: NonNullable<TPluginData["_pluginType"]["customOverrideCriteria"][KCriterion]>
  ) => Awaitable<boolean>;
};

export interface BasePluginConfig {
  [key: string]: unknown;
}

export type ConfigValidatorFn<TPluginType extends BasePluginType> = (
  options: PluginOptions<TPluginType>
) => Awaitable<void>;

export type ConfigPreprocessorFn<TPluginType extends BasePluginType> = (
  options: PluginOptions<TPluginType>
) => Awaitable<PluginOptions<TPluginType>>;
