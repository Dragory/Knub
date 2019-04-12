import { DeepPartial } from "ts-essentials";

export type WithoutProps<T> = { [P in keyof T]: never };

// Heavily based on DeepPartial from ts-essentials
export type DeepPartialOrUnknownA<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartialOrUnknown<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartialOrUnknown<U>>
    : DeepPartialOrUnknown<T[P]>
};

export interface IDeepPartialOrUnknownB {
  [key: string]: any;
}

/**
 * Recursive object type where the object can have any properties, but properties from T are type checked
 * while unknown properties can be anything.
 */
export type DeepPartialOrUnknown<T> =
  | DeepPartialOrUnknownA<T>
  | (IDeepPartialOrUnknownB & WithoutProps<T>);

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
  "=overrides"?: Array<IPluginConfigOverride<TConfig>>;
}

export interface IPluginOptions<TConfig = IBasePluginConfig>
  extends IPartialPluginOptions<TConfig> {
  config: TConfig;
}

export interface IPluginConfigOverride<TConfig = IBasePluginConfig> {
  channel?: string | string[];
  level?: string | string[];
  user?: string | string[];
  role?: string | string[];
  type?: "any" | "all";

  // We use DeepPartialOrUnknown here so that properties with modifiers (e.g. "+" or "-" for arrays) are allowed
  // while the actual defined config/permission properties are still type checked. It's not a perfect solution since
  // these properties with modifiers are not type checked (statically), but it's a decent compromise for now.
  // Can hopefully eventually be solved by this issue: https://github.com/Microsoft/TypeScript/issues/12754
  config?: DeepPartialOrUnknown<TConfig>;
}

export interface IBasePluginConfig {
  [key: string]: any;
}
