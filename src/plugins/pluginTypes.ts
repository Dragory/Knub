import type { ZodType } from "zod/v4";

export interface BasePluginType {
  configSchema: ZodType;
  customOverrideCriteria: Record<string, unknown>;
  customOverrideMatchParams: Record<string, unknown>;
  state: any;
}
