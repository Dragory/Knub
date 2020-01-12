import { DeepPartial } from "ts-essentials";

export interface IPermissionLevelDefinitions {
  [roleOrUserId: string]: number;
}

export interface IGuildConfig {
  prefix?: string;

  levels?: IPermissionLevelDefinitions;

  plugins?: {
    [key: string]: IPartialPluginOptions;
  };
}

export interface IGlobalConfig {
  plugins?: {
    [key: string]: IPartialPluginOptions;
  };
}

export interface IPartialPluginOptions<TConfig = IBasePluginConfig, TCustomOverrideCriteria = unknown> {
  enabled?: boolean;
  config?: DeepPartial<TConfig>;
  overrides?: Array<TPluginOverride<TConfig, TCustomOverrideCriteria>>;
  replaceDefaultOverrides?: boolean;
}

export interface IPluginOptions<TConfig = IBasePluginConfig, TCustomOverrideCriteria = unknown>
  extends IPartialPluginOptions<TConfig, TCustomOverrideCriteria> {
  config: TConfig;
  overrides?: Array<TPluginOverride<TConfig, TCustomOverrideCriteria>>;
}

export type TPluginOverride<TConfig, TCustomOverrideCriteria> = IPluginOverrideCriteria<TCustomOverrideCriteria> & {
  config?: DeepPartial<TConfig>;
};

export interface IPluginOverrideCriteria<TCustomOverrideCriteria> {
  channel?: string | string[];
  category?: string | string[];
  level?: string | string[];
  user?: string | string[];
  role?: string | string[];

  all?: Array<IPluginOverrideCriteria<TCustomOverrideCriteria>>;
  any?: Array<IPluginOverrideCriteria<TCustomOverrideCriteria>>;
  not?: IPluginOverrideCriteria<TCustomOverrideCriteria>;

  extra?: TCustomOverrideCriteria;
}

export interface IBasePluginConfig {
  [key: string]: any;
}
