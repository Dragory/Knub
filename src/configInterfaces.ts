import { DeepPartial } from "ts-essentials";

export interface PermissionLevels {
  [roleOrUserId: string]: number;
}

export interface GuildConfig {
  prefix?: string;

  levels?: PermissionLevels;

  plugins?: {
    [key: string]: PartialPluginOptions;
  };
}

export interface GlobalConfig {
  prefix?: string;

  levels?: PermissionLevels;

  plugins?: {
    [key: string]: PartialPluginOptions;
  };
}

export interface PartialPluginOptions<TConfig = BasePluginConfig, TCustomOverrideCriteria = unknown> {
  enabled?: boolean;
  config?: DeepPartial<TConfig>;
  overrides?: Array<PluginOverride<TConfig, TCustomOverrideCriteria>>;
  replaceDefaultOverrides?: boolean;
}

export interface PluginOptions<TConfig = BasePluginConfig, TCustomOverrideCriteria = unknown>
  extends PartialPluginOptions<TConfig, TCustomOverrideCriteria> {
  config: TConfig;
  overrides?: Array<PluginOverride<TConfig, TCustomOverrideCriteria>>;
}

export type PluginOverride<TConfig, TCustomOverrideCriteria> = PluginOverrideCriteria<TCustomOverrideCriteria> & {
  config?: DeepPartial<TConfig>;
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
