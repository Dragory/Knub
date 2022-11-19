export interface BasePluginType {
  config: unknown;
  customOverrideCriteria: Record<string, unknown>;
  customOverrideMatchParams: Record<string, unknown>;
  state: any;
}
