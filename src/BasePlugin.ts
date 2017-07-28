import { Client } from "eris";

export class BasePlugin {
  protected bot: Client;
  protected pluginConfig: object;

  constructor(bot: Client, pluginConfig: object) {
    this.bot = bot;
    this.pluginConfig = pluginConfig;
  }
}
