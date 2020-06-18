import { BasePluginConfig } from "../config/configTypes";

export interface BasePluginType {
  config: BasePluginConfig;
  customOverrideCriteria: unknown;
}
