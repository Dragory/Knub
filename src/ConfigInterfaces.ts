export interface IGuildConfig {
  permissions?: IPermissions;
  plugins?: {
    [key: string]: any;
  };
}

export interface IPermissions {
  levels?: IPermissionLevels;
  plugins?: IPluginPermissions;
}

export interface IPermissionLevels {
  [key: string]: number;
}

export interface IPluginPermissions {
  level?: number;
  channels?: string[];
  exclude_channels?: string[];
  users?: string[];
  exclude_users?: string[];
  commands?: {
    [key: string]: ICommandPermissions;
  };
}

export interface ICommandPermissions {
  level?: number;
  channels?: string[];
  exclude_channels?: string[];
  users?: string[];
  exclude_users?: string[];
}
