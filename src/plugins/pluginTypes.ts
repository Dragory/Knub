import { BasePluginConfig } from "../config/configTypes";

export interface BasePluginType {
  config: BasePluginConfig;
  customOverrideCriteria: Record<string, unknown>;
  customOverrideMatchParams: Record<string, unknown>;
  state: any;
}
