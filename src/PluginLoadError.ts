import { Guild } from "eris";

export class PluginLoadError extends Error {
  public pluginName: string;
  public guild: Guild | null;

  constructor(pluginName: string, guild: Guild | null, originalError: Error) {
    super(`PluginLoadError (${pluginName}): ${originalError.message}`);
    this.stack = originalError.stack;

    this.pluginName = pluginName;
    this.guild = guild;
  }
}
