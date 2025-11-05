import type { ZodType } from "zod";

export interface BasePluginType {
  configSchema: ZodType;
  customOverrideCriteria: Record<string, unknown>;
  customOverrideMatchParams: Record<string, unknown>;
  state: any;
}
