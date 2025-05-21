import type { AnyContext } from "../types.ts";
import { isGuildContext } from "./pluginUtils.ts";

export class PluginLoadError extends Error {
  public pluginName: string;
  public guildId?: string;

  constructor(pluginName: string, ctx: AnyContext, originalError: Error) {
    super(`PluginLoadError (${pluginName}): ${originalError.message}`);
    this.stack = originalError.stack;

    this.pluginName = pluginName;
    if (isGuildContext(ctx)) {
      this.guildId = ctx.guildId;
    }
  }
}
