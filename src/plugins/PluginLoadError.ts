import { AnyContext } from "../types";
import { isGuildContext } from "./pluginUtils";

export class PluginLoadError extends Error {
  public pluginName: string;
  public guildId?: string;

  constructor(pluginName: string, ctx: AnyContext<any, any>, originalError: Error) {
    super(`PluginLoadError (${pluginName}): ${originalError.message}`);
    this.stack = originalError.stack;

    this.pluginName = pluginName;
    this.guildId = isGuildContext(ctx) && ctx.guildId;
  }
}
