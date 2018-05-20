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
  permissions?: IMergedPermissions;
  config?: IMergedConfig;
}

export interface IMergedPermissions {
  default?: any;
  levels?: any;
  channels?: any;
  users?: any;
  roles?: any;
}

export interface IMergedConfig {
  default?: any;
  levels?: any;
  channels?: any;
  users?: any;
  roles?: any;
  [key: string]: any;
}
