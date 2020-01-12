import { Client, Guild, TextableChannel } from "eris";
import path from "path";

import _fs from "fs";
const fs = _fs.promises;

import { logger, LoggerFn, setLoggerFn } from "./logger";
import { Plugin } from "./Plugin";
import { GlobalPlugin } from "./GlobalPlugin";
import EventEmitter from "events";
import { IGlobalConfig, IGuildConfig, IPartialPluginOptions } from "./configInterfaces";
import { get, noop } from "./utils";
import { performance } from "perf_hooks";
import { LockManager } from "./LockManager";
import { ICustomArgumentTypesMap } from "./commandUtils";

type StatusMessageFn = (channel: TextableChannel, body: string) => void;

export interface IOptions<TGuildConfig extends IGuildConfig> {
  autoInitGuilds?: boolean;
  getConfig?: (id: string) => any | Promise<any>;
  getEnabledPlugins?: (guildId: string, guildConfig: TGuildConfig) => string[] | Promise<string[]>;
  canLoadGuild?: (guildId: string) => boolean | Promise<boolean>;
  logFn?: LoggerFn;
  performanceDebug?: {
    enabled?: boolean;
    size?: number;
    threshold?: number;
  };
  customArgumentTypes?: ICustomArgumentTypesMap;
  sendErrorMessageFn?: StatusMessageFn;
  sendSuccessMessageFn?: StatusMessageFn;
  [key: string]: any;
}

export interface IGuildData<TGuildConfig extends IGuildConfig> {
  id: string;
  config: TGuildConfig;
  loadedPlugins: Map<string, Plugin>;
  locks: LockManager;
}

class IExtendedPlugin extends Plugin<any> {}
class IExtendedGlobalPlugin extends Plugin<any> {}

export interface IKnubArgs<TGuildConfig extends IGuildConfig> {
  plugins?: Array<typeof IExtendedPlugin>;
  globalPlugins?: Array<typeof IExtendedGlobalPlugin>;
  options?: IOptions<TGuildConfig>;
}

export type IPluginMap = Map<string, typeof IExtendedPlugin>;
export type IGlobalPluginMap = Map<string, typeof GlobalPlugin>;

const defaultKnubParams: IKnubArgs<IGuildConfig> = {
  plugins: [],
  globalPlugins: [],
  options: {}
};

export class Knub<
  TGuildConfig extends IGuildConfig = IGuildConfig,
  TGlobalConfig extends IGlobalConfig = IGlobalConfig
> extends EventEmitter {
  protected bot: Client;
  protected globalPlugins: IGlobalPluginMap = new Map();
  protected loadedGlobalPlugins: Map<string, GlobalPlugin> = new Map();
  protected plugins: IPluginMap = new Map();
  protected options: IOptions<TGuildConfig>;
  protected djsOptions: any;
  protected guilds: Map<string, IGuildData<TGuildConfig>> = new Map();
  protected globalConfig: TGlobalConfig;
  protected globalLocks: LockManager;

  protected performanceDebugItems: string[];

  constructor(client: Client, userArgs: IKnubArgs<TGuildConfig>) {
    super();

    const args: IKnubArgs<TGuildConfig> = Object.assign({}, defaultKnubParams, userArgs);

    this.bot = client;
    this.globalLocks = new LockManager();
    this.performanceDebugItems = [];

    args.globalPlugins.forEach(globalPlugin => {
      if (globalPlugin.pluginName == null) {
        throw new Error(`No plugin name specified for global plugin ${globalPlugin.name}`);
      }

      if (this.globalPlugins.has(globalPlugin.pluginName)) {
        throw new Error(`Duplicate plugin name: ${globalPlugin.pluginName}`);
      }

      this.globalPlugins.set(globalPlugin.pluginName, globalPlugin);
    });

    args.plugins.forEach(plugin => {
      if (plugin.pluginName == null) {
        throw new Error(`No plugin name specified for plugin ${plugin.name}`);
      }

      if (this.plugins.has(plugin.pluginName)) {
        throw new Error(`Duplicate plugin name: ${plugin.pluginName}`);
      }

      this.plugins.set(plugin.pluginName, plugin);
    });

    const defaultOptions: IOptions<TGuildConfig> = {
      // Default JSON config files
      async getConfig(id) {
        const configFile = id ? `${id}.json` : "global.json";
        const configPath = path.join("config", configFile);

        try {
          await fs.access(configPath);
        } catch (e) {
          return {};
        }

        const json = await fs.readFile(configPath, { encoding: "utf8" });
        return JSON.parse(json);
      },

      // By default, load all plugins that haven't been explicitly disabled
      getEnabledPlugins: async (guildId, guildConfig) => {
        const plugins = guildConfig.plugins || {};
        return Array.from(this.plugins.keys()).filter(pluginName => {
          return !plugins[pluginName] || plugins[pluginName].enabled !== false;
        });
      },

      canLoadGuild: () => true,

      customArgumentTypes: {},

      sendErrorMessageFn(channel, body) {
        channel.createMessage({
          embed: {
            description: body,
            color: parseInt("ee4400", 16)
          }
        });
      },

      sendSuccessMessageFn(channel, body) {
        channel.createMessage({
          embed: {
            description: body,
            color: parseInt("1ac600", 16)
          }
        });
      }
    };

    this.options = { ...defaultOptions, ...args.options };

    if (this.options.logFn) {
      setLoggerFn(this.options.logFn);
    }
  }

  public async run(): Promise<void> {
    this.bot.on("debug", async str => {
      logger.debug(`[ERIS] ${str}`);
    });

    this.bot.on("error", async (err: Error) => {
      logger.error(`[ERIS] ${String(err)}`);
    });

    const loadErrorTimeout = setTimeout(() => {
      logger.info("This is taking unusually long. Check the token?");
    }, 30 * 1000);

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

    await this.bot.connect();
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

    if (!this.bot.guilds.has(guildId)) {
      // Only load the guild if we're actually in the guild
      return;
    }

    const guildData: IGuildData<TGuildConfig> = {
      config: null,
      id: guildId,
      loadedPlugins: new Map(),
      locks: new LockManager()
    };

    this.guilds.set(guildId, guildData);

    // Can we load this guild?
    if (!(await this.options.canLoadGuild(guildData.id))) {
      this.guilds.delete(guildId);
      return;
    }

    // Load config
    guildData.config = await this.options.getConfig(guildData.id);

    // Load plugins
    const enabledPlugins = await this.options.getEnabledPlugins.call(this, guildData.id, guildData.config);

    const loadPromises = enabledPlugins.map(async pluginName => {
      const plugin = await this.loadPlugin(guildData.id, pluginName, guildData.config);
      if (!plugin) return;

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
    }

    this.guilds.delete(guildId);

    this.emit("guildUnloaded", guildId);
  }

  public async reloadGuild(guildId: string): Promise<void> {
    await this.unloadGuild(guildId);
    await this.loadGuild(guildId);
  }

  public getGuildData(guildId: string): IGuildData<TGuildConfig> {
    return this.guilds.get(guildId);
  }

  public getLoadedGuilds(): Array<IGuildData<TGuildConfig>> {
    return Array.from(this.guilds.values());
  }

  public async loadPlugin(guildId: string, pluginName: string, guildConfig: TGuildConfig): Promise<Plugin> {
    if (!this.plugins.has(pluginName)) {
      throw new Error(`Unknown plugin: ${pluginName}`);
    }

    const pluginOptions = get(guildConfig, `plugins.${pluginName}`) || {};
    const PluginClass = this.plugins.get(pluginName);
    const guildLocks = this.guilds.get(guildId).locks;
    const plugin = new PluginClass(this.bot, guildId, guildConfig, pluginOptions, pluginName, this, guildLocks);

    try {
      await plugin.runLoad();
    } catch (e) {
      if (!(e instanceof Error)) throw e;
      logger.warn(`Could not load plugin ${pluginName} for guild ${guildId}: ${e.stack}`);
      return;
    }

    this.emit("guildPluginLoaded", guildId, pluginName, plugin);

    return plugin;
  }

  public async unloadPlugin(plugin: Plugin): Promise<void> {
    await plugin.runUnload();
    this.emit("guildPluginUnloaded", plugin.guildId, plugin.runtimePluginName, plugin);
  }

  public async reloadPlugin(plugin: Plugin): Promise<void> {
    await this.unloadPlugin(plugin);
    const guild = this.guilds.get(plugin.guildId);
    await this.loadPlugin(guild.id, plugin.runtimePluginName, guild.config);
  }

  public getPlugins(): IPluginMap {
    return this.plugins;
  }

  public async loadGlobalPlugin(pluginName: string): Promise<GlobalPlugin> {
    if (!this.globalPlugins.has(pluginName)) {
      throw new Error(`Unknown global plugin: ${pluginName}`);
    }

    const pluginOptions: IPartialPluginOptions = get(this.globalConfig, `plugins.${pluginName}`) || {};
    const PluginClass = this.globalPlugins.get(pluginName);

    const plugin = new PluginClass(
      this.bot,
      null,
      this.globalConfig,
      pluginOptions,
      pluginName,
      this,
      this.globalLocks
    );

    try {
      await plugin.runLoad();
    } catch (e) {
      if (!(e instanceof Error)) throw e;
      logger.warn(`Could not load global plugin ${pluginName}: ${e.stack}`);
      return;
    }

    this.loadedGlobalPlugins.set(pluginName, plugin);

    this.emit("globalPluginLoaded", pluginName);

    return plugin;
  }

  public async unloadGlobalPlugin(plugin: GlobalPlugin): Promise<void> {
    this.loadedGlobalPlugins.delete(plugin.runtimePluginName);
    await plugin.runUnload();
    this.emit("globalPluginUnloaded", plugin.runtimePluginName);
  }

  public async reloadGlobalPlugin(plugin: GlobalPlugin): Promise<void> {
    await this.unloadGlobalPlugin(plugin);
    await this.loadGlobalPlugin(plugin.runtimePluginName);
  }

  public async reloadAllGlobalPlugins() {
    const loadedGlobalPlugins = Array.from(this.loadedGlobalPlugins.values());
    for (const plugin of loadedGlobalPlugins) {
      await this.reloadGlobalPlugin(plugin);
    }
  }

  public async loadAllGlobalPlugins() {
    for (const name of this.globalPlugins.keys()) {
      this.loadGlobalPlugin(name);
    }
  }

  public getGlobalPlugins(): IGlobalPluginMap {
    return this.globalPlugins;
  }

  public async reloadGlobalConfig() {
    await this.loadGlobalConfig();
    await this.reloadAllGlobalPlugins();
  }

  public async loadGlobalConfig() {
    this.globalConfig = await this.options.getConfig("global");
  }

  public getGlobalConfig(): TGlobalConfig {
    return this.globalConfig;
  }

  protected performanceDebugEnabled() {
    return this.options.performanceDebug && this.options.performanceDebug.enabled;
  }

  public logPerformanceDebugItem(time: number, description: string) {
    if (!this.performanceDebugEnabled()) {
      return;
    }

    const threshold = this.options.performanceDebug.threshold || 0;
    if (time < threshold) return;

    const size = this.options.performanceDebug.size || 30;
    this.performanceDebugItems.push(`[${Math.ceil(time)}ms] ${description}`);
    if (this.performanceDebugItems.length > size) {
      this.performanceDebugItems.splice(0, 1);
    }
  }

  public startPerformanceDebugTimer(description) {
    if (!this.performanceDebugEnabled()) {
      return noop;
    }

    const startTime = performance.now();
    return () => {
      const totalTime = performance.now() - startTime;
      this.logPerformanceDebugItem(totalTime, description);
    };
  }

  public getPerformanceDebugItems() {
    return Array.from(this.performanceDebugItems);
  }

  public getCustomArgumentTypes(): ICustomArgumentTypesMap {
    return this.options.customArgumentTypes || {};
  }

  public sendErrorMessage(channel: TextableChannel, body: string) {
    this.options.sendErrorMessageFn(channel, body);
  }

  public sendSuccessMessage(channel: TextableChannel, body: string) {
    this.options.sendSuccessMessageFn(channel, body);
  }
}
