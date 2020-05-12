import { Client, Guild } from "eris";
import { logger, setLoggerFn } from "./logger";
import { EventEmitter } from "events";
import { BaseConfig } from "./config/configTypes";
import { get } from "./utils";
import { LockManager } from "./locks/LockManager";
import { PluginData } from "./plugins/PluginData";
import { PluginConfigManager } from "./config/PluginConfigManager";
import { PluginEventManager } from "./events/PluginEventManager";
import { PluginCommandManager } from "./commands/PluginCommandManager";
import { CooldownManager } from "./cooldowns/CooldownManager";
import { PluginLoadError } from "./plugins/PluginLoadError";
import {
  defaultGetConfig,
  defaultGetEnabledGlobalPlugins,
  defaultGetEnabledGuildPlugins,
  getPluginName,
  isGuildContext,
  isPluginClass,
  applyPluginClassDecoratorValues,
  ResolvablePlugin,
  PluginPublicInterface,
  isPluginBlueprint,
} from "./plugins/pluginUtils";
import {
  AnyContext,
  GlobalContext,
  GuildContext,
  KnubArgs,
  KnubOptions,
  LoadedPlugin,
  PluginMap,
  Plugin,
} from "./types";
import { PluginNotLoadedError } from "./plugins/PluginNotLoadedError";
import { PluginBlueprint, ResolvedPluginBlueprintPublicInterface } from "./plugins/PluginBlueprint";
import { UnknownPluginError } from "./plugins/UnknownPluginError";

const defaultKnubParams: KnubArgs<BaseConfig, BaseConfig> = {
  guildPlugins: [],
  globalPlugins: [],
  options: {},
};

export class Knub<
  TGuildConfig extends BaseConfig = BaseConfig,
  TGlobalConfig extends BaseConfig = BaseConfig
> extends EventEmitter {
  protected client: Client;

  protected guildPlugins: PluginMap = new Map();
  protected globalPlugins: PluginMap = new Map();

  protected loadedGuilds: Map<string, GuildContext<TGuildConfig>> = new Map();
  protected globalContext: GlobalContext<TGlobalConfig>;

  protected options: KnubOptions<TGuildConfig, TGlobalConfig>;

  constructor(client: Client, userArgs: KnubArgs<TGuildConfig, TGlobalConfig>) {
    super();

    const args: KnubArgs<TGuildConfig, TGlobalConfig> = {
      ...defaultKnubParams,
      ...userArgs,
    };

    this.client = client;

    this.globalContext = {
      config: null,
      loadedPlugins: new Map(),
      locks: new LockManager(),
    };

    const uniquePluginNames = new Set();
    const validatePlugin = (plugin: Plugin) => {
      const pluginName = getPluginName(plugin);

      if (pluginName == null) {
        throw new Error(`No plugin name specified for plugin ${pluginName}`);
      }

      if (uniquePluginNames.has(pluginName)) {
        throw new Error(`Duplicate plugin name: ${pluginName}`);
      }

      uniquePluginNames.add(pluginName);
    };

    args.globalPlugins.forEach((globalPlugin) => {
      validatePlugin(globalPlugin);

      if (isPluginClass(globalPlugin)) {
        applyPluginClassDecoratorValues(globalPlugin);
      }

      this.globalPlugins.set(getPluginName(globalPlugin), globalPlugin);
    });

    args.guildPlugins.forEach((plugin) => {
      validatePlugin(plugin);

      if (isPluginClass(plugin)) {
        applyPluginClassDecoratorValues(plugin);
      }

      this.guildPlugins.set(getPluginName(plugin), plugin);
    });

    const defaultOptions: KnubOptions<TGuildConfig, TGlobalConfig> = {
      getConfig: defaultGetConfig,
      getEnabledGuildPlugins: defaultGetEnabledGuildPlugins,
      getEnabledGlobalPlugins: defaultGetEnabledGlobalPlugins,
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

  protected async loadAllGuilds(): Promise<void> {
    const guilds: Guild[] = Array.from(this.client.guilds.values());
    const loadPromises = guilds.map((guild) => this.loadGuild(guild.id));

    await Promise.all(loadPromises);
  }

  protected async unloadAllGuilds(): Promise<void> {
    const loadedGuilds = this.getLoadedGuilds();
    const unloadPromises = loadedGuilds.map((loadedGuild) => this.unloadGuild(loadedGuild.guildId));

    await Promise.all(unloadPromises);
  }

  /**
   * Initializes the specified guild's config and loads its plugins
   */
  public async loadGuild(guildId: string): Promise<void> {
    // Don't load the same guild twice
    if (this.loadedGuilds.has(guildId)) {
      return;
    }

    // Only load the guild if we're actually in the guild
    if (!this.client.guilds.has(guildId)) {
      return;
    }

    if (!(await this.options.canLoadGuild(guildId))) {
      return;
    }

    const guildContext: GuildContext<TGuildConfig> = {
      guildId,
      config: null,
      loadedPlugins: new Map(),
      locks: new LockManager(),
    };

    this.loadedGuilds.set(guildId, guildContext);

    // Load config
    guildContext.config = await this.options.getConfig(guildId);

    // Load plugins and their dependencies
    const enabledPlugins = await this.options.getEnabledGuildPlugins(guildContext, this.guildPlugins);
    const dependencies = enabledPlugins
      .map((pluginName) => this.getPluginDependencies(this.guildPlugins.get(pluginName)))
      .flat();
    const pluginsToLoad = Array.from(new Set([...dependencies, ...enabledPlugins]));

    for (const pluginName of pluginsToLoad) {
      if (!this.guildPlugins.has(pluginName)) {
        throw new UnknownPluginError(`Unknown plugin: ${pluginName}`);
      }

      const loadedPlugin = await this.loadPlugin(guildContext, this.guildPlugins.get(pluginName));
      guildContext.loadedPlugins.set(pluginName, loadedPlugin);
      this.emit("guildPluginLoaded", guildContext, pluginName);
    }

    this.emit("guildLoaded", guildId);
  }

  /**
   * Unloads all plugins in the specified guild and removes the guild from the list of loaded guilds
   */
  public async unloadGuild(guildId: string): Promise<void> {
    const guildContext = this.loadedGuilds.get(guildId);
    if (!guildContext) {
      return;
    }

    for (const pluginName of guildContext.loadedPlugins.keys()) {
      await this.unloadPlugin(guildContext, pluginName);
      this.emit("guildPluginUnloaded", guildContext, pluginName);
    }

    this.loadedGuilds.delete(guildId);

    this.emit("guildUnloaded", guildId);
  }

  public async reloadGuild(guildId: string): Promise<void> {
    await this.unloadGuild(guildId);
    await this.loadGuild(guildId);
  }

  public getLoadedGuild(guildId: string): GuildContext<TGuildConfig> {
    return this.loadedGuilds.get(guildId);
  }

  public getLoadedGuilds(): Array<GuildContext<TGuildConfig>> {
    return Array.from(this.loadedGuilds.values());
  }

  protected getPluginDependencies(plugin: Plugin): string[] {
    if (!plugin.dependencies) {
      return [];
    }

    return plugin.dependencies.map((dependency) => {
      if (typeof dependency === "string") {
        return dependency;
      }

      return isPluginBlueprint(dependency) ? dependency.name : dependency.pluginName;
    });
  }

  public async loadPlugin(
    ctx: GuildContext<TGuildConfig> | GlobalContext<TGlobalConfig>,
    plugin: Plugin
  ): Promise<LoadedPlugin> {
    const pluginName = isPluginClass(plugin) ? plugin.pluginName : plugin.name;

    const guild = isGuildContext(ctx) ? this.client.guilds.get(ctx.guildId) : null;

    const pluginData: PluginData = {
      client: this.client,
      guild,
      config: new PluginConfigManager(
        plugin.defaultOptions ?? { config: {} },
        get(ctx.config, `plugins.${pluginName}`) || {},
        null,
        ctx.config.levels || {}
      ),
      events: new PluginEventManager(),
      commands: new PluginCommandManager(this.client, {
        prefix: ctx.config.prefix,
        customArgumentTypes: plugin.customArgumentTypes,
      }),
      locks: ctx.locks,
      cooldowns: new CooldownManager(),
      guildConfig: ctx.config,

      hasPlugin: (resolvablePlugin) => this.ctxHasPlugin(ctx, resolvablePlugin),
      getPlugin: (resolvablePlugin) => this.getPluginPublicInterface(ctx, resolvablePlugin, pluginData),
    };

    pluginData.events.setPluginData(pluginData);
    pluginData.commands.setPluginData(pluginData);

    let _class;
    let instance;
    let blueprint;
    let bindTarget = null;

    if (isPluginClass(plugin)) {
      // Load plugin class
      _class = plugin;
      instance = new plugin(pluginData);

      try {
        await instance.onLoad?.();
      } catch (e) {
        throw new PluginLoadError(plugin.pluginName, guild, e);
      }

      bindTarget = instance;
    } else {
      // Load plugin blueprint
      blueprint = plugin;

      try {
        await plugin.onLoad?.(pluginData);
      } catch (e) {
        throw new PluginLoadError(plugin.name, guild, e);
      }
    }

    // Register static event listeners
    if (plugin.events) {
      for (const eventListenerBlueprint of plugin.events) {
        pluginData.events.registerEventListener({
          ...eventListenerBlueprint,
          listener: eventListenerBlueprint.listener.bind(bindTarget),
        });
      }
    }

    // Register static commands
    if (plugin.commands) {
      for (const commandBlueprint of plugin.commands) {
        pluginData.commands.add({
          ...commandBlueprint,
          run: commandBlueprint.run.bind(bindTarget),
        });
      }
    }

    // Initialize messageCreate event listener for commands
    pluginData.events.on("messageCreate", ({ message }, { pluginData: _pluginData }) => {
      return _pluginData.commands.runFromMessage(message);
    });

    return {
      class: _class,
      instance,
      blueprint,
      pluginData,
    };
  }

  public async unloadPlugin(ctx: AnyContext<TGuildConfig, TGlobalConfig>, pluginName: string): Promise<void> {
    const loadedPlugin = ctx.loadedPlugins.get(pluginName);
    if (!loadedPlugin) return;

    loadedPlugin.pluginData.events.clearAllListeners();

    if (loadedPlugin.instance) {
      await loadedPlugin.instance.onUnload?.();
    } else if (loadedPlugin.blueprint) {
      await loadedPlugin.blueprint.onUnload?.(loadedPlugin.pluginData);
    }

    ctx.loadedPlugins.delete(pluginName);
  }

  public async reloadPlugin(ctx: AnyContext<TGuildConfig, TGlobalConfig>, pluginName: string): Promise<void> {
    await this.unloadPlugin(ctx, pluginName);

    const plugin = isGuildContext(ctx) ? this.guildPlugins.get(pluginName) : this.globalPlugins.get(pluginName);

    await this.loadPlugin(ctx, plugin);
  }

  public getAvailablePlugins(): PluginMap {
    return this.guildPlugins;
  }

  public async reloadAllGlobalPlugins() {
    await this.unloadAllGlobalPlugins();
    await this.loadAllGlobalPlugins();
  }

  public async loadAllGlobalPlugins() {
    for (const plugin of this.globalPlugins.values()) {
      this.loadPlugin(this.globalContext, plugin);
    }
  }

  public async unloadAllGlobalPlugins() {
    for (const pluginName of this.globalPlugins.keys()) {
      await this.unloadPlugin(this.globalContext, pluginName);
    }
  }

  public getGlobalPlugins(): PluginMap {
    return this.globalPlugins;
  }

  public async reloadGlobalConfig() {
    await this.loadGlobalConfig();
    await this.reloadAllGlobalPlugins();
  }

  public async loadGlobalConfig() {
    this.globalContext.config = await this.options.getConfig("global");
  }

  public getGlobalConfig(): TGlobalConfig {
    return this.globalContext.config;
  }

  protected ctxHasPlugin<T extends ResolvablePlugin>(
    ctx: AnyContext<TGuildConfig, TGlobalConfig>,
    plugin: ResolvablePlugin
  ): boolean {
    const pluginName = typeof plugin === "string" ? plugin : getPluginName(plugin);

    return ctx.loadedPlugins.has(pluginName);
  }

  protected getPluginPublicInterface<T extends ResolvablePlugin>(
    ctx: AnyContext<TGuildConfig, TGlobalConfig>,
    plugin: ResolvablePlugin,
    pluginData: PluginData
  ): PluginPublicInterface<T> {
    const pluginName = typeof plugin === "string" ? plugin : getPluginName(plugin);

    if (!ctx.loadedPlugins.has(pluginName)) {
      throw new PluginNotLoadedError(`Plugin ${pluginName} is not loaded`);
    }

    const loadedPlugin = ctx.loadedPlugins.get(pluginName);
    const publicInterface = loadedPlugin.blueprint
      ? this.resolvePluginBlueprintPublicInterface(loadedPlugin.blueprint, pluginData)
      : loadedPlugin.instance;

    return publicInterface as PluginPublicInterface<T>;
  }

  protected resolvePluginBlueprintPublicInterface<T extends PluginBlueprint>(
    blueprint: T,
    pluginData: PluginData
  ): ResolvedPluginBlueprintPublicInterface<T["public"]> {
    if (!blueprint.public) {
      return null;
    }

    return Array.from(Object.entries(blueprint.public)).reduce((obj, [prop, fn]) => {
      obj[prop] = fn(pluginData);
      return obj;
    }, {}) as ResolvedPluginBlueprintPublicInterface<T["public"]>;
  }
}
