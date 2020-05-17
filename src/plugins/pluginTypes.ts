import { BasePluginConfig } from "..";

export interface BasePluginType {
  config: BasePluginConfig;
  customOverrideCriteria: unknown;
}
