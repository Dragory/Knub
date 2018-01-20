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

export interface IBasicPermissions {
  level?: number;
  channels?: string[];
  exclude_channels?: string[];
  users?: string[];
  exclude_users?: string[];
  roles?: string[];
  exclude_roles?: string[];
}

export interface IPluginPermissions extends IBasicPermissions {
  commands?: {
    [key: string]: ICommandPermissions;
  };
}

export interface IGlobalPluginPermissions {
  users?: string[];
}

export interface ICommandPermissions extends IBasicPermissions {}

export interface IGlobalCommandPermissions {
  users?: string[];
}
