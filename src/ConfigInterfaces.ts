export interface IPermissionLevelDefinitions {
  [roleOrUserId: string]: number;
}

export interface IGuildConfig {
  prefix?: string;

  levels?: IPermissionLevelDefinitions;

  plugins?: {
    [key: string]: IPluginOptions;
  };

  // Custom config values
  [key: string]: any;
}

export interface IGlobalConfig {
  plugins?: {
    [key: string]: IPluginOptions;
  };

  // Custom config values
  [key: string]: any;
}

export interface IPluginOptions<TConfig2 = IBasePluginConfig, TPermissions2 = IBasePluginPermissions> {
  enabled?: boolean;
  permissions?: TPermissions2;
  config?: TConfig2;
  overrides?: Array<IPluginConfigOverride<TConfig2, TPermissions2>>;
  "=overrides"?: Array<IPluginConfigOverride<TConfig2, TPermissions2>>;
}

export interface IPluginConfigOverride<TConfig3 = IBasePluginConfig, TPermissions3 = IBasePluginPermissions> {
  channel?: string | string[];
  level?: string | string[];
  user?: string | string[];
  role?: string | string[];
  type?: "any" | "all";
  config?: TConfig3;
  permissions?: TPermissions3;
}

export interface IBasePluginPermissions {
  [key: string]: any;
}

export interface IBasePluginConfig {
  [key: string]: any;
}
