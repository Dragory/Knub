import { Client } from "eris";
import path from "path";

import { BaseConfig } from "./BaseConfig";
import { BasePlugin } from "./BasePlugin";
import { JsonConfig } from "./JsonConfig";

export { BaseConfig } from "./BaseConfig";
export { BasePlugin } from "./BasePlugin";

export type CustomConfigStorageCreator = (
  id: string
) => BaseConfig | Promise<BaseConfig>;

export interface IPluginList {
  [key: string]: BasePlugin;
}

export interface IOptions {
  plugins: IPluginList;
  defaultPlugins?: string[];
  configStorage?: string | CustomConfigStorageCreator;
  [key: string]: any;
}

export default class BotFramework {
  protected bot: Client;
  protected options: IOptions;

  constructor(bot: Client, options: IOptions) {
    this.bot = bot;
    this.options = options;
  }

  protected getConfig(id: string): Promise<BaseConfig> {
    if (typeof this.options.configStorage === "string") {
      // Built-in config types
      if (this.options.configStorage === "json") {
        // Flat JSON files
        const dir = this.options.jsonDataDir || "data";
        return Promise.resolve(new JsonConfig(path.join(dir, `${id}.json`)));
      } else {
        throw new Error("Invalid configStorage specified");
      }
    } else if (typeof this.options.configStorage === "function") {
      // Custom config type
      return Promise.resolve(this.options.configStorage(id));
    }
  }
}
