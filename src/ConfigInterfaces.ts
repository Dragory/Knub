export interface IPermissionLevelDefinitions {
  [roleOrUserId: string]: number;
}

export interface IGuildConfig {
  prefix?: string;

  levels?: IPermissionLevelDefinitions;

  plugins?: {
    [key: string]: IPluginOptions;
  };
}

export interface IGlobalConfig {
  plugins?: {
    [key: string]: IPluginOptions;
  };
}

export interface IPluginOptions {
  enabled?: boolean;
  permissions?: IPluginPermissions;
  config?: IPluginConfig;
  overrides?: IPluginConfigOverride[];
}

export interface IPluginConfigOverride {
  channel?: string | string[];
  level?: string | string[];
  user?: string | string[];
  role?: string | string[];
  type?: "any" | "all";
  config?: IPluginConfig;
  permissions?: IPluginPermissions;
}

export interface IPluginPermissions {
  [key: string]: any;
}

export interface IPluginConfig {
  [key: string]: any;
}
