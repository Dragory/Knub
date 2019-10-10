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

  // Custom config values
  [key: string]: any;
}

export interface IGlobalConfig {
  plugins?: {
    [key: string]: IPartialPluginOptions;
  };

  // Custom config values
  [key: string]: any;
}

export interface IPartialPluginOptions<TConfig = IBasePluginConfig> {
  enabled?: boolean;
  config?: DeepPartial<TConfig>;
  overrides?: Array<IPluginConfigOverride<TConfig>>;
  replaceDefaultOverrides?: boolean;
}

export interface IPluginOptions<TConfig = IBasePluginConfig> extends IPartialPluginOptions<TConfig> {
  config: TConfig;
}

export interface IPluginConfigOverride<TConfig = IBasePluginConfig> {
  channel?: string | string[];
  category?: string | string[];
  level?: string | string[];
  user?: string | string[];
  role?: string | string[];
  type?: "any" | "all";
  config?: DeepPartial<TConfig>;
}

export interface IBasePluginConfig {
  [key: string]: any;
}
