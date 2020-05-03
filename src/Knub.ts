import { Client, Guild, TextableChannel } from "eris";
import path from "path";

import _fs from "fs";
import { logger, LoggerFn, setLoggerFn } from "./logger";
import { AnyExtendedPlugin, Plugin } from "./Plugin";
import { AnyExtendedGlobalPlugin, GlobalPlugin } from "./GlobalPlugin";
import { EventEmitter } from "events";
import { GlobalConfig, GuildConfig } from "./config/configInterfaces";
import { get } from "./utils";
import { LockManager } from "./LockManager";
import { CustomArgumentTypes } from "./commands/commandUtils";
import { PluginData } from "./PluginData";
import { PluginConfigManager } from "./config/PluginConfigManager";
import { PluginEventManager } from "./events/PluginEventManager";
import { PluginCommandManager } from "./commands/PluginCommandManager";
import { CooldownManager } from "./CooldownManager";
import { getMetadataFromAllProperties } from "./decoratorUtils";
import { PluginLoadError } from "./PluginLoadError";
import { CommandBlueprint } from "./commands/CommandBlueprint";
import { EventListenerBlueprint } from "./events/EventListenerBlueprint";

const fs = _fs.promises;

type StatusMessageFn = (channel: TextableChannel, body: string) => void;

export interface KnubOptions<TGuildConfig extends GuildConfig> {
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
  customArgumentTypes?: CustomArgumentTypes;
  sendErrorMessageFn?: StatusMessageFn;
  sendSuccessMessageFn?: StatusMessageFn;
  [key: string]: any;
}

export interface LoadedPlugin {
  instance: Plugin;
  pluginData: PluginData;
}

export interface LoadedGlobalPlugin {
  instance: GlobalPlugin;
  pluginData: PluginData;
}

export interface LoadedGuild<TGuildConfig extends GuildConfig> {
  id: string;
  config: TGuildConfig;
  loadedPlugins: Map<string, LoadedPlugin>;
  locks: LockManager;
}

export interface KnubArgs<TGuildConfig extends GuildConfig> {
  plugins?: Array<typeof AnyExtendedPlugin>;
  globalPlugins?: Array<typeof AnyExtendedGlobalPlugin>;
  options?: KnubOptions<TGuildConfig>;
}

export type PluginMap = Map<string, typeof AnyExtendedPlugin>;
export type GlobalPluginMap = Map<string, typeof AnyExtendedGlobalPlugin>;

const defaultKnubParams: KnubArgs<GuildConfig> = {
  plugins: [],
  globalPlugins: [],
  options: {},
};

export class Knub<
  TGuildConfig extends GuildConfig = GuildConfig,
  TGlobalConfig extends GlobalConfig = GlobalConfig
> extends EventEmitter {
  protected client: Client;
  protected globalPlugins: GlobalPluginMap = new Map();
  protected loadedGlobalPlugins: Map<string, LoadedGlobalPlugin> = new Map();
  protected plugins: PluginMap = new Map();
  protected options: KnubOptions<TGuildConfig>;
  protected djsOptions: any;
  protected loadedGuilds: Map<string, LoadedGuild<TGuildConfig>> = new Map();
  protected globalConfig: TGlobalConfig;
  protected globalLocks: LockManager;

  protected performanceDebugItems: string[];

  constructor(client: Client, userArgs: KnubArgs<TGuildConfig>) {
    super();

    const args: KnubArgs<TGuildConfig> = Object.assign({}, defaultKnubParams, userArgs);

    this.client = client;
    this.globalLocks = new LockManager();
    this.performanceDebugItems = [];

    args.globalPlugins.forEach((PluginClass) => {
      if (PluginClass.pluginName == null) {
        throw new Error(`No plugin name specified for global plugin ${PluginClass.name}`);
      }

      if (this.globalPlugins.has(PluginClass.pluginName)) {
        throw new Error(`Duplicate plugin name: ${PluginClass.pluginName}`);
      }

      this.transferPluginDecoratorValues(PluginClass);

      this.globalPlugins.set(PluginClass.pluginName, PluginClass);
    });

    args.plugins.forEach((PluginClass) => {
      if (PluginClass.pluginName == null) {
        throw new Error(`No plugin name specified for plugin ${PluginClass.name}`);
      }

      if (this.plugins.has(PluginClass.pluginName)) {
        throw new Error(`Duplicate plugin name: ${PluginClass.pluginName}`);
      }

      this.transferPluginDecoratorValues(PluginClass);

      this.plugins.set(PluginClass.pluginName, PluginClass);
    });

    const defaultOptions: KnubOptions<TGuildConfig> = {
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
        return Array.from(this.plugins.keys()).filter((pluginName) => {
          return !plugins[pluginName] || plugins[pluginName].enabled !== false;
        });
      },

      canLoadGuild: () => true,

      customArgumentTypes: {},

      sendErrorMessageFn(channel, body) {
        channel.createMessage({
          embed: {
            description: body,
            color: parseInt("ee4400", 16),
          },
        });
      },

      sendSuccessMessageFn(channel, body) {
        channel.createMessage({
          embed: {
            description: body,
            color: parseInt("1ac600", 16),
          },
        });
      },
    };

    this.options = { ...defaultOptions, ...args.options };

    if (this.options.logFn) {
      setLoggerFn(this.options.logFn);
    }
  }

  public async run(): Promise<void> {
    this.client.on("debug", async (str) => {
      logger.debug(`[ERIS] ${str}`);
    });

    this.client.on("error", async (err: Error) => {
      logger.error(`[ERIS] ${String(err)}`);
    });

    const loadErrorTimeout = setTimeout(() => {
      logger.info("This is taking unusually long. Check the token?");
    }, 30 * 1000);

    this.client.on("ready", async () => {
      clearTimeout(loadErrorTimeout);

      logger.info("Bot connected!");

      logger.info("Loading global plugins...");

      await this.loadGlobalConfig();
      await this.loadAllGlobalPlugins();

      logger.info("Loading guilds..");

      this.client.on("guildAvailable", (guild: Guild) => {
        logger.info(`Joined guild: ${guild.id}`);
        this.loadGuild(guild.id);
      });

      this.client.on("guildUnavailable", (guild: Guild) => {
        logger.info(`Left guild: ${guild.id}`);
        this.unloadGuild(guild.id);
      });

      await this.loadAllGuilds();
      logger.info("All loaded, the bot is now running!");
      this.emit("loadingFinished");
    });

    await this.client.connect();
  }

  public async stop(): Promise<void> {
    await this.unloadAllGuilds();
    await this.unloadAllGlobalPlugins();
    await this.client.disconnect({ reconnect: false });
  }

  public transferPluginDecoratorValues(PluginClass: typeof AnyExtendedPlugin) {
    if (PluginClass._decoratorValuesTransferred) {
      return;
    }

    const events = Array.from(
      Object.values(getMetadataFromAllProperties<EventListenerBlueprint>(PluginClass, "decoratorEvents"))
    ).flat();

    PluginClass.events = PluginClass.events || [];
    PluginClass.events.push(...Object.values(events));

    const commands = Array.from(
      Object.values(getMetadataFromAllProperties<CommandBlueprint>(PluginClass, "decoratorCommands"))
    ).flat();

    PluginClass.commands = PluginClass.commands || [];
    PluginClass.commands.push(...Object.values(commands));

    PluginClass._decoratorValuesTransferred = true;
  }

  protected async loadAllGuilds(): Promise<void> {
    const guilds: Guild[] = Array.from(this.client.guilds.values());
    const loadPromises = guilds.map((guild) => this.loadGuild(guild.id));

    await Promise.all(loadPromises);
  }

  protected async unloadAllGuilds(): Promise<void> {
    const loadedGuilds = this.getLoadedGuilds();
    const unloadPromises = loadedGuilds.map((loadedGuild) => this.unloadGuild(loadedGuild.id));

    await Promise.all(unloadPromises);
  }

  /**
   * Initializes the specified guild's config and loads its plugins
   */
  public async loadGuild(guildId: string): Promise<void> {
    if (this.loadedGuilds.has(guildId)) {
      // Prevent loading the same guild twice
      return;
    }

    if (!this.client.guilds.has(guildId)) {
      // Only load the guild if we're actually in the guild
      return;
    }

    const guildData: LoadedGuild<TGuildConfig> = {
      config: null,
      id: guildId,
      loadedPlugins: new Map(),
      locks: new LockManager(),
    };

    this.loadedGuilds.set(guildId, guildData);

    // Can we load this guild?
    if (!(await this.options.canLoadGuild(guildData.id))) {
      this.loadedGuilds.delete(guildId);
      return;
    }

    // Load config
    guildData.config = await this.options.getConfig(guildData.id);

    // Load plugins
    const enabledPlugins = await this.options.getEnabledPlugins.call(this, guildData.id, guildData.config);

    const loadPromises = enabledPlugins.map((pluginName) => this.loadPlugin(guildData, pluginName));
    await Promise.all(loadPromises);

    this.emit("guildLoaded", guildId);
  }

  /**
   * Unloads all plugins in the specified guild and removes the guild from the list of loaded guilds
   */
  public async unloadGuild(guildId: string): Promise<void> {
    const guildData = this.loadedGuilds.get(guildId);
    if (!guildData) {
      return;
    }

    for (const pluginName of guildData.loadedPlugins.keys()) {
      await this.unloadPlugin(guildData, pluginName);
    }

    this.loadedGuilds.delete(guildId);

    this.emit("guildUnloaded", guildId);
  }

  /**
   * Unload and immediately reload a guild
   */
  public async reloadGuild(guildId: string): Promise<void> {
    await this.unloadGuild(guildId);
    await this.loadGuild(guildId);
  }

  public getLoadedGuild(guildId: string): LoadedGuild<TGuildConfig> {
    return this.loadedGuilds.get(guildId);
  }

  public getLoadedGuilds(): Array<LoadedGuild<TGuildConfig>> {
    return Array.from(this.loadedGuilds.values());
  }

  public async loadPlugin(guildData: LoadedGuild<TGuildConfig>, pluginName: string): Promise<Plugin> {
    if (!this.plugins.has(pluginName)) {
      throw new Error(`Unknown plugin: ${pluginName}`);
    }

    const PluginClass = this.plugins.get(pluginName);

    const pluginData: PluginData = {
      client: this.client,
      guild: this.client.guilds.get(guildData.id),
      config: new PluginConfigManager(
        PluginClass.defaultOptions ?? { config: {} },
        get(guildData.config, `plugins.${pluginName}`) || {},
        null,
        guildData.config.levels || {}
      ),
      events: new PluginEventManager(),
      commands: new PluginCommandManager(this.client, {
        prefix: guildData.config.prefix,
      }),
      locks: guildData.locks,
      cooldowns: new CooldownManager(),
      guildConfig: guildData.config,
    };

    pluginData.events.setPluginData(pluginData);
    pluginData.commands.setPluginData(pluginData);

    const instance = new PluginClass({
      ...pluginData,
      knub: this,
    });

    try {
      await instance.onLoad?.();
    } catch (e) {
      throw new PluginLoadError(PluginClass.pluginName, this.client.guilds.get(guildData.id), e);
    }

    // Register initial event listeners
    if (PluginClass.events) {
      for (const blueprint of PluginClass.events) {
        pluginData.events.registerEventListener({
          ...blueprint,
          listener: blueprint.listener.bind(instance),
        });
      }
    }

    // Register initial commands
    if (PluginClass.commands) {
      for (const blueprint of PluginClass.commands) {
        pluginData.commands.add({
          ...blueprint,
          run: blueprint.run.bind(instance),
        });
      }
    }

    // Initialize the messageCreate event listener for commands
    pluginData.events.on("messageCreate", ({ message }, { pluginData: _pluginData }) => {
      return _pluginData.commands.runFromMessage(message);
    });

    guildData.loadedPlugins.set(pluginName, {
      instance,
      pluginData,
    });

    this.emit("guildPluginLoaded", guildData, pluginName);

    return instance;
  }

  public async unloadPlugin(guildData: LoadedGuild<TGuildConfig>, pluginName: string): Promise<void> {
    const loadedPlugin = guildData.loadedPlugins.get(pluginName);

    loadedPlugin.pluginData.events.clearAllListeners();
    await loadedPlugin.instance.onUnload?.();
    guildData.loadedPlugins.delete(pluginName);

    this.emit("guildPluginUnloaded", guildData, pluginName);
  }

  public async reloadPlugin(guildData: LoadedGuild<TGuildConfig>, pluginName: string): Promise<void> {
    await this.unloadPlugin(guildData, pluginName);
    await this.loadPlugin(guildData, pluginName);
  }

  public getAvailablePlugins(): PluginMap {
    return this.plugins;
  }

  public async loadGlobalPlugin(pluginName: string): Promise<GlobalPlugin> {
    if (!this.globalPlugins.has(pluginName)) {
      throw new Error(`Unknown global plugin: ${pluginName}`);
    }

    const PluginClass = this.globalPlugins.get(pluginName);

    const pluginData: PluginData = {
      client: this.client,
      guild: null,
      config: new PluginConfigManager(
        PluginClass.defaultOptions ?? { config: {} },
        get(this.globalConfig, `plugins.${pluginName}`) || {},
        null,
        this.globalConfig.levels || {}
      ),
      events: new PluginEventManager({ implicitGuildRestriction: false }),
      commands: new PluginCommandManager(this.client, {
        prefix: this.globalConfig.prefix,
      }),
      locks: this.globalLocks,
      cooldowns: new CooldownManager(),
      guildConfig: this.globalConfig,
    };

    const instance = new PluginClass({
      ...pluginData,
      knub: this,
    });

    try {
      await instance.onLoad?.();
    } catch (e) {
      throw new PluginLoadError(PluginClass.pluginName, null, e);
    }

    // Register initial event listeners
    if (PluginClass.events) {
      for (const blueprint of PluginClass.events) {
        pluginData.events.registerEventListener({
          ...blueprint,
          listener: blueprint.listener.bind(instance),
        });
      }
    }

    // Register initial commands
    if (PluginClass.commands) {
      for (const blueprint of PluginClass.commands) {
        pluginData.commands.add({
          ...blueprint,
          run: blueprint.run.bind(instance),
        });
      }
    }

    // Initialize the messageCreate event listener for commands
    pluginData.events.on("messageCreate", ({ message }, { pluginData: _pluginData }) => {
      return _pluginData.commands.runFromMessage(message);
    });

    this.loadedGlobalPlugins.set(pluginName, {
      instance,
      pluginData,
    });

    this.emit("globalPluginLoaded", pluginName);

    return instance;
  }

  public async unloadGlobalPlugin(pluginName: string): Promise<void> {
    const loadedPlugin = this.loadedGlobalPlugins.get(pluginName);
    await loadedPlugin.instance.onUnload?.();
    this.loadedGlobalPlugins.delete(pluginName);
    this.emit("globalPluginUnloaded", pluginName);
  }

  public async reloadGlobalPlugin(pluginName: string): Promise<void> {
    await this.unloadGlobalPlugin(pluginName);
    await this.loadGlobalPlugin(pluginName);
  }

  public async reloadAllGlobalPlugins() {
    for (const pluginName of this.loadedGlobalPlugins.keys()) {
      await this.reloadGlobalPlugin(pluginName);
    }
  }

  public async loadAllGlobalPlugins() {
    for (const name of this.globalPlugins.keys()) {
      this.loadGlobalPlugin(name);
    }
  }

  public async unloadAllGlobalPlugins() {
    for (const pluginName of this.loadedGlobalPlugins.keys()) {
      await this.unloadGlobalPlugin(pluginName);
    }
  }

  public getGlobalPlugins(): GlobalPluginMap {
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

  public getCustomArgumentTypes(): CustomArgumentTypes {
    return this.options.customArgumentTypes || {};
  }

  public sendErrorMessage(channel: TextableChannel, body: string) {
    this.options.sendErrorMessageFn(channel, body);
  }

  public sendSuccessMessage(channel: TextableChannel, body: string) {
    this.options.sendSuccessMessageFn(channel, body);
  }
}
