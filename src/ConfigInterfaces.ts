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

export interface IPartialPluginOptions<TConfig = IBasePluginConfig, TPermissions = IBasePluginPermissions> {
  enabled?: boolean;
  permissions?: DeepPartial<TPermissions>;
  config?: DeepPartial<TConfig>;
  overrides?: Array<IPluginConfigOverride<TConfig, TPermissions>>;
  "=overrides"?: Array<IPluginConfigOverride<TConfig, TPermissions>>;
}

export interface IPluginOptions<TConfig = IBasePluginConfig, TPermissions = IBasePluginPermissions>
  extends IPartialPluginOptions<TConfig, TPermissions> {
  permissions: TPermissions;
  config: TConfig;
}

export interface IPluginConfigOverride<TConfig = IBasePluginConfig, TPermissions = IBasePluginPermissions> {
  channel?: string | string[];
  level?: string | string[];
  user?: string | string[];
  role?: string | string[];
  type?: "any" | "all";
  config?: DeepPartial<TConfig>;
  permissions?: DeepPartial<TPermissions>;
}

export interface IBasePluginPermissions {
  [key: string]: boolean | IBasePluginPermissions;
}

export interface IBasePluginConfig {
  [key: string]: any;
}
