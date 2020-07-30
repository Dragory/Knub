import { Client, Guild } from "eris";
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
  defaultGetEnabledGuildPlugins,
  isGlobalContext,
  isGuildContext,
  PluginPublicInterface,
} from "./plugins/pluginUtils";
import {
  AnyContext,
  GlobalContext,
  GuildContext,
  KnubArgs,
  KnubOptions,
  LoadedPlugin,
  LogFn,
  PluginMap,
} from "./types";
import { PluginNotLoadedError } from "./plugins/PluginNotLoadedError";
import { PluginBlueprint, ResolvedPluginBlueprintPublicInterface } from "./plugins/PluginBlueprint";
import { UnknownPluginError } from "./plugins/UnknownPluginError";
import { BasePluginType } from "./plugins/pluginTypes";
import { ConfigValidationError } from "./config/ConfigValidationError";

const defaultKnubParams: KnubArgs<BaseConfig<BasePluginType>, BaseConfig<BasePluginType>> = {
  guildPlugins: [],
  globalPlugins: [],
  options: {},
};

const defaultLogFn: LogFn = (level, ...args) => {
  /* eslint-disable no-console */
  if (level === "error") {
    console.error("[ERROR]", ...args);
  } else if (level === "warn") {
    console.warn("[WARN]", ...args);
  } else {
    console.log(`[${level.toUpperCase()}]`, ...args);
  }
};

export class Knub<
  TGuildConfig extends BaseConfig<any> = BaseConfig<BasePluginType>,
  TGlobalConfig extends BaseConfig<any> = BaseConfig<BasePluginType>
> extends EventEmitter {
  protected client: Client;

  protected guildPlugins: PluginMap = new Map();
  protected globalPlugins: PluginMap = new Map();

  protected loadedGuilds: Map<string, GuildContext<TGuildConfig>> = new Map();
  protected globalContext: GlobalContext<TGlobalConfig>;

  protected options: KnubOptions<TGuildConfig, TGlobalConfig>;

  protected log: LogFn = defaultLogFn;

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
    const validatePlugin = (plugin: PluginBlueprint<any>) => {
      if (plugin.name == null) {
        throw new Error(`No plugin name specified for plugin`);
      }

      if (uniquePluginNames.has(plugin.name)) {
        throw new Error(`Duplicate plugin name: ${plugin.name}`);
      }

      uniquePluginNames.add(plugin.name);
    };

    for (const globalPlugin of args.globalPlugins) {
      validatePlugin(globalPlugin);
      this.globalPlugins.set(globalPlugin.name, globalPlugin);
    }

    for (const guildPlugin of args.guildPlugins) {
      validatePlugin(guildPlugin);
      this.guildPlugins.set(guildPlugin.name, guildPlugin);
    }

    const defaultOptions: KnubOptions<TGuildConfig, TGlobalConfig> = {
      getConfig: defaultGetConfig,
      getEnabledGuildPlugins: defaultGetEnabledGuildPlugins,
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
      this.log = this.options.logFn;
    }
  }

  public async run(): Promise<void> {
    this.client.on("debug", async (str) => {
      this.log("debug", `[ERIS] ${str}`);
    });

    this.client.on("error", async (err: Error) => {
      this.log("error", `[ERIS] ${String(err)}`);
    });

    const loadErrorInterval = setInterval(() => {
      this.log("info", "Still connecting...");
    }, 30 * 1000);

    this.client.on("ready", async () => {
      clearInterval(loadErrorInterval);

      this.log("info", "Bot connected!");

      this.log("info", "Loading global plugins...");

      await this.loadGlobalConfig();
      await this.loadAllGlobalPlugins();

      this.log("info", "Loading guilds..");

      this.client.on("guildAvailable", (guild: Guild) => {
        this.log("info", `Joined guild: ${guild.id}`);
        this.loadGuild(guild.id);
      });

      this.client.on("guildUnavailable", (guild: Guild) => {
        this.log("info", `Left guild: ${guild.id}`);
        this.unloadGuild(guild.id);
      });

      await this.loadAllGuilds();
      this.log("info", "All loaded, the bot is now running!");
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

  protected resolveDependencies(plugin: PluginBlueprint<any>, resolvedDependencies: Set<string> = new Set()) {
    if (!plugin.dependencies) {
      return resolvedDependencies;
    }

    for (const dependency of plugin.dependencies) {
      if (!resolvedDependencies.has(dependency.name)) {
        resolvedDependencies.add(dependency.name);

        // Resolve transitive dependencies
        this.resolveDependencies(dependency, resolvedDependencies);
      }
    }

    return resolvedDependencies;
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
    const dependencies: Set<string> = new Set();
    for (const pluginName of enabledPlugins) {
      this.resolveDependencies(this.guildPlugins.get(pluginName), dependencies);
    }

    // Reverse the order of dependencies so transitive dependencies get loaded first
    const dependenciesArr = Array.from(dependencies.values()).reverse();

    const pluginsToLoad = Array.from(new Set([...dependenciesArr, ...enabledPlugins]));

    for (const pluginName of pluginsToLoad) {
      if (!this.guildPlugins.has(pluginName)) {
        throw new UnknownPluginError(`Unknown plugin: ${pluginName}`);
      }

      const isDependency = !enabledPlugins.includes(pluginName);

      const loadedPlugin = await this.loadPlugin(guildContext, this.guildPlugins.get(pluginName), isDependency);
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

  public async loadPlugin<TPluginType extends BasePluginType>(
    ctx: GuildContext<TGuildConfig> | GlobalContext<TGlobalConfig>,
    plugin: PluginBlueprint<TPluginType>,
    loadedAsDependency: boolean
  ): Promise<LoadedPlugin<TPluginType>> {
    const guild = isGuildContext(ctx) ? this.client.guilds.get(ctx.guildId) : null;

    const configManager = new PluginConfigManager(
      plugin.defaultOptions ?? { config: {} },
      get(ctx.config, `plugins.${plugin.name}`) || {},
      ctx.config.levels || {},
      plugin.customOverrideMatcher,
      plugin.configPreprocessor,
      plugin.configValidator
    );

    try {
      await configManager.init();
    } catch (e) {
      if (e instanceof ConfigValidationError) {
        throw new PluginLoadError(plugin.name, guild, e);
      }

      throw e;
    }

    const pluginData: PluginData<any> = {
      client: this.client,
      guild,
      config: configManager,
      events: new PluginEventManager({ implicitGuildRestriction: !isGlobalContext(ctx) }),
      commands: new PluginCommandManager(this.client, {
        prefix: ctx.config.prefix,
      }),
      locks: ctx.locks,
      cooldowns: new CooldownManager(),
      guildConfig: ctx.config,

      loadedAsDependency,

      hasPlugin: (resolvablePlugin) => this.ctxHasPlugin(ctx, resolvablePlugin),
      getPlugin: (resolvablePlugin) => this.getPluginPublicInterface(ctx, resolvablePlugin),

      getKnubInstance: () => this,

      state: {},
    };

    pluginData.events.setPluginData(pluginData);
    pluginData.commands.setPluginData(pluginData);
    pluginData.config.setPluginData(pluginData);

    try {
      await plugin.onLoad?.(pluginData);
    } catch (e) {
      throw new PluginLoadError(plugin.name, guild, e);
    }

    if (!loadedAsDependency) {
      // Register event listeners
      if (plugin.events) {
        for (const eventListenerBlueprint of plugin.events) {
          pluginData.events.registerEventListener({
            ...eventListenerBlueprint,
            listener: eventListenerBlueprint.listener,
          });
        }
      }

      // Register commands
      if (plugin.commands) {
        for (const commandBlueprint of plugin.commands) {
          pluginData.commands.add({
            ...commandBlueprint,
            run: commandBlueprint.run,
          });
        }
      }
    }

    // Initialize messageCreate event listener for commands
    pluginData.events.on("messageCreate", ({ args: { message }, pluginData: _pluginData }) => {
      return _pluginData.commands.runFromMessage(message);
    });

    return {
      blueprint: plugin,
      pluginData,
    };
  }

  public async unloadPlugin(ctx: AnyContext<TGuildConfig, TGlobalConfig>, pluginName: string): Promise<void> {
    const loadedPlugin = ctx.loadedPlugins.get(pluginName);
    if (!loadedPlugin) return;

    loadedPlugin.pluginData.events.clearAllListeners();

    await loadedPlugin.blueprint.onUnload?.(loadedPlugin.pluginData);

    ctx.loadedPlugins.delete(pluginName);
  }

  public async reloadPlugin(ctx: AnyContext<TGuildConfig, TGlobalConfig>, pluginName: string): Promise<void> {
    const loadedAsDependency = ctx.loadedPlugins.get(pluginName).pluginData.loadedAsDependency;

    await this.unloadPlugin(ctx, pluginName);

    const plugin = isGuildContext(ctx) ? this.guildPlugins.get(pluginName) : this.globalPlugins.get(pluginName);
    await this.loadPlugin(ctx, plugin, loadedAsDependency);
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
      await this.loadPlugin(this.globalContext, plugin, false);
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

  protected ctxHasPlugin(ctx: AnyContext<TGuildConfig, TGlobalConfig>, plugin: PluginBlueprint<any>) {
    return ctx.loadedPlugins.has(plugin.name);
  }

  protected getPluginPublicInterface<T extends PluginBlueprint<any>>(
    ctx: AnyContext<TGuildConfig, TGlobalConfig>,
    plugin: T
  ): PluginPublicInterface<T> {
    if (!ctx.loadedPlugins.has(plugin.name)) {
      throw new PluginNotLoadedError(`Plugin ${plugin.name} is not loaded`);
    }

    const loadedPlugin = ctx.loadedPlugins.get(plugin.name);
    const publicInterface = this.resolvePluginBlueprintPublicInterface(loadedPlugin.blueprint, loadedPlugin.pluginData);

    return publicInterface as PluginPublicInterface<T>;
  }

  protected resolvePluginBlueprintPublicInterface<T extends PluginBlueprint<any>>(
    blueprint: T,
    pluginData: PluginData<any>
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
