import { Client, Guild } from "discord.js";
import * as path from "path";

import { IConfigProvider } from "./IConfigProvider";
import { logger } from "./logger";
import { Plugin } from "./Plugin";
import { YamlConfigProvider } from "./YamlConfigProvider";
import { GlobalPlugin } from "./GlobalPlugin";
import EventEmitter = NodeJS.EventEmitter;

export type SettingsProviderFactory = (id: string) => IConfigProvider | Promise<IConfigProvider>;

export interface IPluginList {
  [key: string]: typeof Plugin;
}

export interface IGlobalPluginList {
  [key: string]: typeof GlobalPlugin;
}

export interface IOptions {
  logLevel?: string;
  autoInitGuilds?: boolean;
  settingsProvider?: string | SettingsProviderFactory;
  getEnabledPlugins?: (guildId: string, guildConfig: IConfigProvider) => string[] | Promise<string[]>;
  canLoadGuild?: (guildId: string) => boolean | Promise<boolean>;
  [key: string]: any;
}

export interface IGuildData {
  id: string;
  config: IConfigProvider;
  loadedPlugins: Map<string, Plugin>;
}

export interface IKnubArgs {
  token: string;
  plugins?: IPluginList;
  globalPlugins?: IGlobalPluginList;
  options?: IOptions;
  djsOptions?: any;
}

const defaultKnubParams: IKnubArgs = {
  token: null,
  plugins: {},
  globalPlugins: {},
  options: {},
  djsOptions: {}
};

export class Knub extends EventEmitter {
  protected token: string;
  protected bot: Client;
  protected globalPlugins: Map<string, typeof GlobalPlugin>;
  protected loadedGlobalPlugins: Map<string, GlobalPlugin>;
  protected plugins: Map<string, typeof Plugin>;
  protected options: IOptions;
  protected djsOptions: any;
  protected guilds: Map<string, IGuildData>;
  protected globalConfig: IConfigProvider;

  constructor(userArgs: IKnubArgs) {
    super();

    const args: IKnubArgs = Object.assign({}, defaultKnubParams, userArgs);

    this.token = args.token;

    this.globalPlugins = new Map();
    this.loadedGlobalPlugins = new Map();
    Object.keys(args.globalPlugins).forEach(key => {
      this.globalPlugins.set(key, args.globalPlugins[key]);
    });

    this.plugins = new Map();
    Object.keys(args.plugins).forEach(key => {
      this.plugins.set(key, args.plugins[key]);
    });

    const defaultOptions: IOptions = {
      logLevel: "info",
      configStorage: "yaml",

      // Load all plugins by default
      getEnabledPlugins: async (guildId, guildConfig) => {
        return Array.from(this.plugins.keys());
      },

      canLoadGuild: () => true
    };

    this.options = { ...defaultOptions, ...args.options };
    this.djsOptions = args.djsOptions;

    logger.transports.console.level = this.options.logLevel;

    this.guilds = new Map();
  }

  public async run(): Promise<void> {
    this.bot = new Client(this.djsOptions);

    this.bot.on("debug", async str => {
      logger.debug(`[DJS] ${str}`);
    });

    this.bot.on("error", async (err: Error) => {
      logger.error(`[DJS] ${String(err)}`);
    });

    const loadErrorTimeout = setTimeout(() => {
      logger.info("This is taking unusually long. Check the token?");
    }, 10 * 1000);

    this.bot.on("ready", async () => {
      clearTimeout(loadErrorTimeout);

      logger.info("Bot connected!");

      logger.info("Loading global plugins...");

      await this.loadGlobalConfig();
      await this.loadAllGlobalPlugins();

      logger.info("Loading guilds..");

      this.bot.on("guildAvailable", (guild: Guild) => {
        logger.info(`Joined guild: ${guild.id}`);
        this.loadGuild(guild.id);
      });

      this.bot.on("guildUnavailable", (guild: Guild) => {
        logger.info(`Left guild: ${guild.id}`);
        this.unloadGuild(guild.id);
      });

      await this.loadAllGuilds();
      logger.info("All loaded, the bot is now running!");
      this.emit("loadingFinished");
    });

    await this.bot.login(this.token);
  }

  public async loadAllGuilds(): Promise<void> {
    const guilds: Guild[] = Array.from(this.bot.guilds.values());
    const loadPromises = guilds.map(guild => this.loadGuild(guild.id));

    await Promise.all(loadPromises);
  }

  /**
   * Initializes the specified guild's config and loads its plugins
   */
  public async loadGuild(guildId: string): Promise<void> {
    if (this.guilds.has(guildId)) {
      // Prevent loading the same guild twice
      return;
    }

    const guildData: IGuildData = {
      config: null,
      id: guildId,
      loadedPlugins: new Map()
    };

    this.guilds.set(guildId, guildData);

    // Can we load this guild?
    if (!await this.options.canLoadGuild(guildData.id)) {
      this.guilds.delete(guildId);
      return;
    }

    // Load config
    guildData.config = await this.getConfig(`${guildData.id}`);

    // Load plugins
    const enabledPlugins = await this.options.getEnabledPlugins(guildData.id, guildData.config);

    const loadPromises = enabledPlugins.map(async pluginName => {
      const plugin = await this.loadPlugin(guildData.id, pluginName, guildData.config);
      guildData.loadedPlugins.set(pluginName, plugin);
    });

    await Promise.all(loadPromises);
    this.emit("guildLoaded", guildId);
  }

  /**
   * Unloads all plugins in the specified guild, and removes the guild from the list of loaded guilds
   */
  public async unloadGuild(guildId: string): Promise<void> {
    const guildData = this.guilds.get(guildId);
    if (!guildData) {
      return;
    }

    for (const plugin of guildData.loadedPlugins.values()) {
      await this.unloadPlugin(plugin);
      this.guilds.delete(guildId);
    }

    this.emit("guildUnloaded", guildId);
  }

  public async reloadGuild(guildId: string): Promise<void> {
    await this.unloadGuild(guildId);
    await this.loadGuild(guildId);
  }

  public async loadPlugin(guildId: string, pluginName: string, guildConfig: IConfigProvider): Promise<Plugin> {
    if (!this.plugins.has(pluginName)) {
      throw new Error(`Unknown plugin: ${pluginName}`);
    }

    // Create a proxy for guildConfig that only returns the settings for this plugin
    const pluginConfig = new Proxy(guildConfig, {
      get(target, name) {
        if (name === "get") {
          const origFn = target[name];
          return (getPath: string, def: any = null) => {
            return origFn.call(target, `plugins.${pluginName}.${getPath}`, def);
          };
        }

        return target[name];
      }
    });

    const PluginObj: typeof Plugin = this.plugins.get(pluginName);
    const plugin = new PluginObj(this.bot, guildId, guildConfig, pluginConfig, pluginName, this);

    await plugin.runLoad();
    this.emit("guildPluginLoaded", guildId, pluginName);

    return plugin;
  }

  public async unloadPlugin(plugin: Plugin): Promise<void> {
    await plugin.runUnload();
    this.emit("guildPluginUnloaded", plugin.guildId, plugin.pluginName);
  }

  public async reloadPlugin(plugin: Plugin): Promise<void> {
    await this.unloadPlugin(plugin);
    const guild = this.guilds.get(plugin.guildId);
    await this.loadPlugin(guild.id, plugin.pluginName, guild.config);
  }

  public getPlugins(): Map<string, typeof Plugin> {
    return this.plugins;
  }

  public async loadGlobalPlugin(pluginName: string): Promise<GlobalPlugin> {
    if (!this.globalPlugins.has(pluginName)) {
      throw new Error(`Unknown global plugin: ${pluginName}`);
    }

    // Create a proxy for globalConfig that only returns the settings for this plugin
    const pluginConfig = new Proxy(this.globalConfig, {
      get(target, name) {
        if (name === "get") {
          const origFn = target[name];
          return (getPath: string, def: any = null) => {
            return origFn.call(target, `plugins.${pluginName}.${getPath}`, def);
          };
        }

        return target[name];
      }
    });

    const PluginObj: typeof GlobalPlugin = this.globalPlugins.get(pluginName);
    const plugin = new PluginObj(this.bot, this.globalConfig, pluginConfig, pluginName, this);

    await plugin.runLoad();
    this.loadedGlobalPlugins.set(pluginName, plugin);

    this.emit("globalPluginLoaded", pluginName);

    return plugin;
  }

  public async unloadGlobalPlugin(plugin: GlobalPlugin): Promise<void> {
    this.loadedGlobalPlugins.delete(plugin.pluginName);
    await plugin.runUnload();
    this.emit("globalPluginUnloaded", plugin.pluginName);
  }

  public async reloadGlobalPlugin(plugin: GlobalPlugin): Promise<void> {
    await this.unloadGlobalPlugin(plugin);
    await this.loadGlobalPlugin(plugin.name);
  }

  public async reloadAllGlobalPlugins() {
    for (const plugin of this.loadedGlobalPlugins.values()) {
      this.reloadGlobalPlugin(plugin);
    }
  }

  public async loadAllGlobalPlugins() {
    for (const name of this.globalPlugins.keys()) {
      this.loadGlobalPlugin(name);
    }
  }

  public getGlobalPlugins(): Map<string, typeof GlobalPlugin> {
    return this.globalPlugins;
  }

  public async reloadGlobalConfig() {
    await this.loadGlobalConfig();
    await this.reloadAllGlobalPlugins();
  }

  public async loadGlobalConfig() {
    this.globalConfig = await this.getConfig("global");
  }

  protected async getConfig(id: string): Promise<IConfigProvider> {
    if (typeof this.options.configStorage === "string") {
      // Built-in providers
      if (this.options.configStorage === "yaml") {
        // Yaml
        const dir = this.options.guildConfigDir || "guilds";
        return new YamlConfigProvider(path.join(dir, `${id}.yml`));
      } else {
        throw new Error("Invalid configStorage specified");
      }
    } else if (typeof this.options.configStorage === "function") {
      // Custom provider
      return this.options.configStorage(id);
    }
  }
}
