import { Client } from "eris";
import * as path from "path";

import { ISettingsProvider } from "./ISettingsProvider";
import { JsonSettingsProvider } from "./JsonSettingsProvider";
import { Plugin } from "./Plugin";

export type SettingsProviderFactory = (
  id: string
) => ISettingsProvider | Promise<ISettingsProvider>;

export interface IPluginList {
  [key: string]: typeof Plugin;
}

export interface IOptions {
  autoInitGuilds?: boolean;
  settingsProvider?: string | SettingsProviderFactory;
  defaultPlugins?: string[];
  getEnabledPlugins?: (
    guildId: string,
    guildConfig: ISettingsProvider
  ) => string[] | Promise<string[]>;
  [key: string]: any;
}

export interface IGuildData {
  id: string;
  config: ISettingsProvider;
  plugins: Map<string, Plugin>;
}

export class BotFramework {
  protected bot: Client;
  protected plugins: Map<string, typeof Plugin>;
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
    guildConfig: ISettingsProvider
  ): Promise<Plugin> {
    if (!this.plugins.has(pluginName)) {
      throw new Error(`Unknown plugin: ${pluginName}`);
    }

    const pluginConfig = await this.getConfig(
      `guild_${guildId}_plugin_${pluginName}`
    );

    const PluginObj: typeof Plugin = this.plugins.get(pluginName);
    const plugin = new PluginObj(
      this.bot,
      guildId,
      guildConfig,
      pluginConfig,
      pluginName
    );

    // Set default permissions
    const permissions = await pluginConfig.get("permissions");
    if (!permissions && plugin.defaultPermissions) {
      await pluginConfig.set("permissions", plugin.defaultPermissions);
    }

    await plugin.runLoad();

    return plugin;
  }

  protected async unloadPlugin(plugin: Plugin): Promise<void> {
    await plugin.runUnload();
  }

  protected async getConfig(id: string): Promise<ISettingsProvider> {
    if (typeof this.options.configStorage === "string") {
      // Built-in providers
      if (this.options.configStorage === "json") {
        // Flat JSON files
        const dir = this.options.jsonDataDir || "data";
        return new JsonSettingsProvider(path.join(dir, `${id}.json`));
      } else {
        throw new Error("Invalid configStorage specified");
      }
    } else if (typeof this.options.configStorage === "function") {
      // Custom provider
      return this.options.configStorage(id);
    }
  }
}
