import { BasePluginConfig } from "../config/configTypes";

export interface BasePluginType {
  config: BasePluginConfig;
  customOverrideCriteria: {};
  customOverrideMatchParams: {};
  state: any;
}
