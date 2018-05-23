import { Client, Guild } from "discord.js";
import * as util from "util";
import * as fs from "fs";

import { logger } from "./logger";
import { Plugin } from "./Plugin";
import { GlobalPlugin } from "./GlobalPlugin";
import * as EventEmitter from "events";
import { IGlobalConfig, IGuildConfig, IPluginOptions } from "./configInterfaces";
import * as yaml from "js-yaml";

const at = require("lodash.at");
const merge = require("lodash.merge");

export interface IPluginWithRuntimeConfig {
  0: typeof Plugin;
  1: IPluginOptions;
}

export interface IGlobalPluginWithRuntimeConfig {
  0: typeof GlobalPlugin;
  1: IPluginOptions;
}

export interface IPluginList {
  [key: string]: (typeof Plugin) | IPluginWithRuntimeConfig;
}

export interface IGlobalPluginList {
  [key: string]: (typeof GlobalPlugin) | IGlobalPluginWithRuntimeConfig;
}

export interface IOptions {
  logLevel?: string;
  autoInitGuilds?: boolean;
  getConfig?: (id: string) => any | Promise<any>;
  getEnabledPlugins?: (guildId: string, guildConfig: IGuildConfig) => string[] | Promise<string[]>;
  canLoadGuild?: (guildId: string) => boolean | Promise<boolean>;
  [key: string]: any;
}

export interface IGuildData {
  id: string;
  config: IGuildConfig;
  loadedPlugins: Map<string, Plugin>;
}

export interface IKnubArgs {
  token: string;
  plugins?: IPluginList;
  globalPlugins?: IGlobalPluginList;
  options?: IOptions;
  djsOptions?: any;
}

export type IPluginMap = Map<string, (typeof Plugin) | IPluginWithRuntimeConfig>;
export type IGlobalPluginMap = Map<string, (typeof GlobalPlugin) | IGlobalPluginWithRuntimeConfig>;

const readFileAsync = util.promisify(fs.readFile);
const accessAsync = util.promisify(fs.access);

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
  protected globalPlugins: IGlobalPluginMap;
  protected loadedGlobalPlugins: Map<string, GlobalPlugin>;
  protected plugins: IPluginMap;
  protected options: IOptions;
  protected djsOptions: any;
  protected guilds: Map<string, IGuildData>;
  protected globalConfig: IGlobalConfig;

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

      // Default YAML-based config files
      async getConfig(id) {
        const configPath = `config/${id}.yml`;

        try {
          await accessAsync(configPath);
        } catch (e) {
          return {};
        }

        const yamlString = await readFileAsync(configPath, { encoding: "utf8" });
        return yaml.safeLoad(yamlString);
      },

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
    guildData.config = await this.options.getConfig(guildData.id);

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

  public getGuildData(guildId: string): IGuildData {
    return this.guilds.get(guildId);
  }

  public async loadPlugin(guildId: string, pluginName: string, guildConfig: IGuildConfig): Promise<Plugin> {
    if (!this.plugins.has(pluginName)) {
      throw new Error(`Unknown plugin: ${pluginName}`);
    }

    const pluginOptions = at(guildConfig, `plugins.${pluginName}`)[0];

    const PluginDef = this.plugins.get(pluginName);
    let PluginObj: typeof Plugin;
    let pluginRuntimeOptions: IPluginOptions;

    if (Array.isArray(PluginDef)) {
      PluginObj = PluginDef[0];
      pluginRuntimeOptions = PluginDef[1];
    } else {
      PluginObj = PluginDef as typeof Plugin;
      pluginRuntimeOptions = null;
    }

    const mergedPluginOptions: IPluginOptions = merge({}, pluginOptions, pluginRuntimeOptions);

    const plugin = new PluginObj(this.bot, guildId, guildConfig, mergedPluginOptions, pluginName, this);

    await plugin.runLoad();
    this.emit("guildPluginLoaded", guildId, pluginName, plugin);

    return plugin;
  }

  public async unloadPlugin(plugin: Plugin): Promise<void> {
    await plugin.runUnload();
    this.emit("guildPluginUnloaded", plugin.guildId, plugin.pluginName, plugin);
  }

  public async reloadPlugin(plugin: Plugin): Promise<void> {
    await this.unloadPlugin(plugin);
    const guild = this.guilds.get(plugin.guildId);
    await this.loadPlugin(guild.id, plugin.pluginName, guild.config);
  }

  public getPlugins(): IPluginMap {
    return this.plugins;
  }

  public async loadGlobalPlugin(pluginName: string): Promise<GlobalPlugin> {
    if (!this.globalPlugins.has(pluginName)) {
      throw new Error(`Unknown global plugin: ${pluginName}`);
    }

    const pluginOptions: IPluginOptions = at(this.globalConfig, `plugins.${pluginName}`)[0] || {};

    const PluginDef = this.globalPlugins.get(pluginName);
    let PluginObj: typeof GlobalPlugin;
    let pluginRuntimeConfig: IPluginOptions;

    if (Array.isArray(PluginDef)) {
      PluginObj = PluginDef[0];
      pluginRuntimeConfig = PluginDef[1];
    } else {
      PluginObj = PluginDef as typeof GlobalPlugin;
      pluginRuntimeConfig = null;
    }

    const mergedPluginOptions: IPluginOptions = merge({}, pluginOptions, pluginRuntimeConfig);

    const plugin = new PluginObj(this.bot, null, this.globalConfig, mergedPluginOptions, pluginName, this);

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
}
