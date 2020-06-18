import { DeepPartial } from "ts-essentials";
import { BasePluginType } from "../plugins/pluginTypes";

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

export type PluginOverride<TPluginType extends BasePluginType> = PluginOverrideCriteria<
  TPluginType["customOverrideCriteria"]
> & {
  config?: DeepPartial<TPluginType["config"]>;
};

export interface PluginOverrideCriteria<TCustomOverrideCriteria> {
  channel?: string | string[];
  category?: string | string[];
  level?: string | string[];
  user?: string | string[];
  role?: string | string[];

  all?: Array<PluginOverrideCriteria<TCustomOverrideCriteria>>;
  any?: Array<PluginOverrideCriteria<TCustomOverrideCriteria>>;
  not?: PluginOverrideCriteria<TCustomOverrideCriteria>;

  extra?: TCustomOverrideCriteria;
}

export interface BasePluginConfig {
  [key: string]: any;
}
