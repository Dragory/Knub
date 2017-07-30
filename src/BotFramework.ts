import { Client } from "eris";
import * as path from "path";

import { BaseConfig } from "./BaseConfig";
import { BasePlugin } from "./BasePlugin";
import { JsonConfig } from "./JsonConfig";

export type CustomConfigStorageCreator = (
  id: string
) => BaseConfig | Promise<BaseConfig>;

export interface IPluginList {
  [key: string]: typeof BasePlugin;
}

export interface IOptions {
  autoInitGuilds?: boolean;
  configStorage?: string | CustomConfigStorageCreator;
  defaultPlugins?: string[];
  getEnabledPlugins?: (
    guildId: string,
    guildConfig: BaseConfig
  ) => string[] | Promise<string[]>;
  [key: string]: any;
}

export interface IGuildData {
  id: string;
  config: BaseConfig;
  plugins: Map<string, BasePlugin>;
}

export class BotFramework {
  protected bot: Client;
  protected plugins: Map<string, typeof BasePlugin>;
  protected options: IOptions;
  protected guilds: Map<string, IGuildData>;

  constructor(bot: Client, plugins: IPluginList, options: IOptions) {
    this.bot = bot;

    this.plugins = new Map();

    Object.keys(plugins).forEach(key => {
      this.plugins.set(key, plugins[key]);
    });

    const defaultOptions: IOptions = {
      autoInitGuilds: true,
      configStorage: "json",
      defaultPlugins: Array.from(this.plugins.keys()),
      getEnabledPlugins: async (guildId, guildConfig) => {
        // By default, enabled plugins are read from the config file
        // Defaults to all plugins
        return await guildConfig.get("plugins", this.options.defaultPlugins);
      }
    };

    this.options = { ...defaultOptions, ...options };

    this.guilds = new Map();
  }

  public async initGuild(guildId: string): Promise<IGuildData> {
    const guildConfig = await this.getConfig(`guild_${guildId}`);
    const enabledPlugins = await this.options.getEnabledPlugins(
      guildId,
      guildConfig
    );

    const plugins = new Map();

    const loadPromises = enabledPlugins.map(async pluginName => {
      const plugin = await this.loadPlugin(guildId, pluginName, guildConfig);
      plugins.set(pluginName, plugin);
    });

    await Promise.all(loadPromises);

    return {
      config: guildConfig,
      id: guildId,
      plugins
    };
  }

  protected async loadPlugin(
    guildId: string,
    pluginName: string,
    guildConfig: BaseConfig
  ): Promise<BasePlugin> {
    if (!this.plugins.has(pluginName)) {
      throw new Error(`Unknown plugin: ${pluginName}`);
    }

    const pluginConfig = await this.getConfig(
      `guild_${guildId}_plugin_${pluginName}`
    );

    const PluginObj: typeof BasePlugin = this.plugins.get(pluginName);
    const plugin = new PluginObj(this.bot, guildId, guildConfig, pluginConfig);

    await plugin.runLoad();

    return plugin;
  }

  protected async unloadPlugin(plugin: BasePlugin): Promise<void> {
    await plugin.runUnload();
  }

  protected async getConfig(id: string): Promise<BaseConfig> {
    if (typeof this.options.configStorage === "string") {
      // Built-in config types
      if (this.options.configStorage === "json") {
        // Flat JSON files
        const dir = this.options.jsonDataDir || "data";
        return new JsonConfig(path.join(dir, `${id}.json`));
      } else {
        throw new Error("Invalid configStorage specified");
      }
    } else if (typeof this.options.configStorage === "function") {
      // Custom config type
      return this.options.configStorage(id);
    }
  }
}
