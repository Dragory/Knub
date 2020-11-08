import { Client, Guild } from "eris";
import { EventEmitter } from "events";
import { BaseConfig } from "./config/configTypes";
import { get } from "./utils";
import { LockManager } from "./locks/LockManager";
import { AnyPluginData, BasePluginData, GlobalPluginData, GuildPluginData } from "./plugins/PluginData";
import { PluginConfigManager } from "./config/PluginConfigManager";
import { PluginCommandManager } from "./commands/PluginCommandManager";
import { CooldownManager } from "./cooldowns/CooldownManager";
import { PluginLoadError } from "./plugins/PluginLoadError";
import { defaultGetConfig, defaultGetEnabledGuildPlugins, PluginPublicInterface } from "./plugins/pluginUtils";
import {
  AnyContext,
  GlobalContext,
  GlobalPluginMap,
  GuildContext,
  GuildPluginMap,
  KnubArgs,
  KnubOptions,
  LoadedGlobalPlugin,
  LoadedGuildPlugin,
  LogFn,
} from "./types";
import { PluginNotLoadedError } from "./plugins/PluginNotLoadedError";
import {
  AnyGlobalEventListenerBlueprint,
  AnyGuildEventListenerBlueprint,
  AnyPluginBlueprint,
  GlobalPluginBlueprint,
  GuildPluginBlueprint,
  PluginBlueprintPublicInterface,
  ResolvedPluginBlueprintPublicInterface,
} from "./plugins/PluginBlueprint";
import { UnknownPluginError } from "./plugins/UnknownPluginError";
import { BasePluginType } from "./plugins/pluginTypes";
import { ConfigValidationError } from "./config/ConfigValidationError";
import { GuildPluginEventManager } from "./events/GuildPluginEventManager";
import { EventRelay } from "./events/EventRelay";
import { GlobalPluginEventManager } from "./events/GlobalPluginEventManager";
import { CustomOverrideMatcher } from "./config/configUtils";

const defaultKnubArgs: KnubArgs<BaseConfig<BasePluginType>, BaseConfig<BasePluginType>> = {
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
  protected eventRelay: EventRelay;

  protected guildPlugins: GuildPluginMap = new Map();
  protected globalPlugins: GlobalPluginMap = new Map();

  protected loadedGuilds: Map<string, GuildContext<TGuildConfig>> = new Map();
  protected canLoadGuildInProgress: Set<string> = new Set();
  protected globalContext: GlobalContext<TGlobalConfig>;

  protected options: KnubOptions<TGuildConfig, TGlobalConfig>;

  protected log: LogFn = defaultLogFn;

  constructor(client: Client, userArgs: Partial<KnubArgs<TGuildConfig, TGlobalConfig>>) {
    super();

    const args: KnubArgs<TGuildConfig, TGlobalConfig> = {
      ...defaultKnubArgs,
      ...userArgs,
    };

    this.client = client;
    this.eventRelay = new EventRelay(client);

    this.globalContext = {
      // @ts-ignore: This property is always set in loadGlobalConfig() before it can be used by plugins
      config: null,
      loadedPlugins: new Map(),
      locks: new LockManager(),
    };

    const uniquePluginNames = new Set();
    const validatePlugin = (plugin: AnyPluginBlueprint) => {
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
    const loadErrorInterval = setInterval(() => {
      this.log("info", "Still connecting...");
    }, 30 * 1000);

    this.client.once("connect", async () => {
      clearInterval(loadErrorInterval);
      this.log("info", "Bot connected!");
    });

    this.client.once("ready", async () => {
      this.log("info", "Received READY");
      this.log("info", "- Loading global plugins...");

      await this.loadGlobalConfig();
      await this.loadAllGlobalPlugins();

      this.log("info", "- Loading available servers that haven't been loaded yet...");
      await this.loadAllAvailableGuilds();

      this.log("info", "Done!");
      this.emit("loadingFinished");
    });

    this.client.on("guildCreate", (guild: Guild) => {
      this.log("info", `Joined guild: ${guild.id}`);
      this.loadGuild(guild.id);
    });

    this.client.on("guildAvailable", (guild: Guild) => {
      this.log("info", `Guild available: ${guild.id}`);
      this.loadGuild(guild.id);
    });

    this.client.on("guildUnavailable", (guild: Guild) => {
      this.log("info", `Guild unavailable: ${guild.id}`);
      this.unloadGuild(guild.id);
    });

    await this.client.connect();
  }

  public async stop(): Promise<void> {
    await this.unloadAllGuilds();
    await this.unloadAllGlobalPlugins();
    await this.client.disconnect({ reconnect: false });
  }

  protected async loadAllAvailableGuilds(): Promise<void> {
    const guilds: Guild[] = Array.from(this.client.guilds.values());
    const loadPromises = guilds.map((guild) => this.loadGuild(guild.id));

    await Promise.all(loadPromises);
  }

  protected async unloadAllGuilds(): Promise<void> {
    const loadedGuilds = this.getLoadedGuilds();
    const unloadPromises = loadedGuilds.map((loadedGuild) => this.unloadGuild(loadedGuild.guildId));

    await Promise.all(unloadPromises);
  }

  protected resolveDependencies(plugin: AnyPluginBlueprint, resolvedDependencies: Set<string> = new Set()) {
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

    if (this.canLoadGuildInProgress.has(guildId)) {
      return;
    }

    this.canLoadGuildInProgress.add(guildId);

    if (!(await this.options.canLoadGuild(guildId))) {
      this.canLoadGuildInProgress.delete(guildId);
      return;
    }

    this.canLoadGuildInProgress.delete(guildId);

    const guildContext: GuildContext<TGuildConfig> = {
      guildId,
      // @ts-ignore: This property is always set below before it can be used by plugins
      config: null,
      loadedPlugins: new Map(),
      locks: new LockManager(),
    };

    this.loadedGuilds.set(guildId, guildContext);

    // Load config
    guildContext.config = await this.options.getConfig(guildId);

    // Load plugins and their dependencies
    const enabledPlugins = await this.options.getEnabledGuildPlugins!(guildContext, this.guildPlugins);
    const dependencies: Set<string> = new Set();
    for (const pluginName of enabledPlugins) {
      this.resolveDependencies(this.guildPlugins.get(pluginName)!, dependencies);
    }

    // Reverse the order of dependencies so transitive dependencies get loaded first
    const dependenciesArr = Array.from(dependencies.values()).reverse();

    const pluginsToLoad = Array.from(new Set([...dependenciesArr, ...enabledPlugins]));

    for (const pluginName of pluginsToLoad) {
      if (!this.guildPlugins.has(pluginName)) {
        throw new UnknownPluginError(`Unknown plugin: ${pluginName}`);
      }

      const isDependency = !enabledPlugins.includes(pluginName);

      let loadedPlugin;
      try {
        loadedPlugin = await this.loadGuildPlugin(guildContext, this.guildPlugins.get(pluginName)!, isDependency);
      } catch (e) {
        // If plugin loading fails, unload the entire guild and re-throw the error
        await this.unloadGuild(guildId);
        throw e;
      }

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
      await this.unloadGuildPlugin(guildContext, pluginName);
      this.emit("guildPluginUnloaded", guildContext, pluginName);
    }

    this.loadedGuilds.delete(guildId);

    this.emit("guildUnloaded", guildId);
  }

  public async reloadGuild(guildId: string): Promise<void> {
    await this.unloadGuild(guildId);
    await this.loadGuild(guildId);
  }

  public getLoadedGuild(guildId: string): GuildContext<TGuildConfig> | undefined {
    return this.loadedGuilds.get(guildId);
  }

  public getLoadedGuilds(): Array<GuildContext<TGuildConfig>> {
    return Array.from(this.loadedGuilds.values());
  }

  public getAvailablePlugins(): GuildPluginMap {
    return this.guildPlugins;
  }

  public getGlobalPlugins(): GlobalPluginMap {
    return this.globalPlugins;
  }

  protected async getBasePluginData(
    ctx: AnyContext<any, any>,
    plugin: AnyPluginBlueprint,
    loadedAsDependency: boolean
  ): Promise<BasePluginData<any>> {
    const configManager = new PluginConfigManager(
      plugin.defaultOptions ?? { config: {} },
      get(ctx.config, `plugins.${plugin.name}`) || {},
      ctx.config.levels || {},
      {
        customOverrideMatcher: (plugin.customOverrideMatcher as unknown) as CustomOverrideMatcher<AnyPluginData<any>>,
        preprocessor: plugin.configPreprocessor,
        validator: plugin.configValidator,
      }
    );

    try {
      await configManager.init();
    } catch (e) {
      if (e instanceof ConfigValidationError) {
        throw new PluginLoadError(plugin.name, ctx, e);
      }

      throw e;
    }

    return {
      client: this.client,
      config: configManager,
      locks: ctx.locks,
      cooldowns: new CooldownManager(),
      fullConfig: ctx.config,

      loadedAsDependency,

      hasPlugin: (resolvablePlugin) => this.ctxHasPlugin(ctx, resolvablePlugin),
      getPlugin: (resolvablePlugin) => this.getPluginPublicInterface(ctx, resolvablePlugin),

      // @ts-ignore: This is actually correct, dw about it
      getKnubInstance: () => this,

      state: {},
    };
  }

  public async loadGuildPlugin<TPluginType extends BasePluginType>(
    ctx: GuildContext<TGuildConfig>,
    plugin: GuildPluginBlueprint<GuildPluginData<TPluginType>>,
    loadedAsDependency: boolean
  ): Promise<LoadedGuildPlugin<TPluginType>> {
    const pluginData = (await this.getBasePluginData(ctx, plugin, loadedAsDependency)) as Partial<GuildPluginData<any>>;
    pluginData.context = "guild";
    pluginData.guild = this.client.guilds.get(ctx.guildId);

    pluginData.events = new GuildPluginEventManager<GuildPluginData<TPluginType>>(this.eventRelay);
    pluginData.commands = new PluginCommandManager<GuildPluginData<TPluginType>>(this.client, {
      prefix: ctx.config.prefix,
    });

    const fullPluginData = pluginData as GuildPluginData<any>;
    fullPluginData.events.setPluginData(fullPluginData);
    fullPluginData.commands.setPluginData(fullPluginData);
    fullPluginData.config.setPluginData(fullPluginData);

    try {
      await plugin.onLoad?.(fullPluginData);
    } catch (e) {
      throw new PluginLoadError(plugin.name, ctx, e);
    }

    if (!loadedAsDependency) {
      // Register event listeners
      if (plugin.events) {
        for (const eventListenerBlueprint of plugin.events) {
          fullPluginData.events.registerEventListener({
            ...eventListenerBlueprint,
            listener: eventListenerBlueprint.listener,
          } as AnyGuildEventListenerBlueprint<GuildPluginData<TPluginType>>);
        }
      }

      // Register commands
      if (plugin.commands) {
        for (const commandBlueprint of plugin.commands) {
          fullPluginData.commands.add({
            ...commandBlueprint,
            run: commandBlueprint.run,
          });
        }
      }

      // Initialize messageCreate event listener for commands
      fullPluginData.events.on("messageCreate", ({ args: { message }, pluginData: _pluginData }) => {
        return _pluginData.commands.runFromMessage(message);
      });
    }

    return {
      blueprint: plugin,
      pluginData: fullPluginData,
    };
  }

  public async unloadGuildPlugin(ctx: GuildContext<any>, pluginName: string): Promise<void> {
    const loadedPlugin = ctx.loadedPlugins.get(pluginName);
    if (!loadedPlugin) return;

    loadedPlugin.pluginData.events.clearAllListeners();

    await loadedPlugin.blueprint.onUnload?.(loadedPlugin.pluginData);

    ctx.loadedPlugins.delete(pluginName);
  }

  public async reloadGuildPlugin(ctx: GuildContext<any>, pluginName: string): Promise<void> {
    const loadedAsDependency = ctx.loadedPlugins.get(pluginName)!.pluginData.loadedAsDependency;

    await this.unloadGuildPlugin(ctx, pluginName);

    const plugin = this.guildPlugins.get(pluginName)!;
    await this.loadGuildPlugin(ctx, plugin, loadedAsDependency);
  }

  public async loadGlobalPlugin<TPluginType extends BasePluginType>(
    ctx: GlobalContext<TGlobalConfig>,
    plugin: GlobalPluginBlueprint<GlobalPluginData<TPluginType>>,
    loadedAsDependency: boolean
  ): Promise<LoadedGlobalPlugin<TPluginType>> {
    const pluginData = (await this.getBasePluginData(ctx, plugin, loadedAsDependency)) as Partial<
      GlobalPluginData<any>
    >;
    pluginData.context = "global";

    pluginData.events = new GlobalPluginEventManager<GlobalPluginData<TPluginType>>(this.eventRelay);
    pluginData.commands = new PluginCommandManager<GlobalPluginData<TPluginType>>(this.client, {
      prefix: ctx.config.prefix,
    });

    const fullPluginData = pluginData as GlobalPluginData<any>;
    fullPluginData.events.setPluginData(fullPluginData);
    fullPluginData.commands.setPluginData(fullPluginData);
    fullPluginData.config.setPluginData(fullPluginData);

    try {
      await plugin.onLoad?.(fullPluginData);
    } catch (e) {
      throw new PluginLoadError(plugin.name, ctx, e);
    }

    if (!loadedAsDependency) {
      // Register event listeners
      if (plugin.events) {
        for (const eventListenerBlueprint of plugin.events) {
          fullPluginData.events.registerEventListener({
            ...eventListenerBlueprint,
            listener: eventListenerBlueprint.listener,
          } as AnyGlobalEventListenerBlueprint<GlobalPluginData<TPluginType>>);
        }
      }

      // Register commands
      if (plugin.commands) {
        for (const commandBlueprint of plugin.commands) {
          fullPluginData.commands.add({
            ...commandBlueprint,
            run: commandBlueprint.run,
          });
        }
      }

      // Initialize messageCreate event listener for commands
      fullPluginData.events.on("messageCreate", ({ args: { message }, pluginData: _pluginData }) => {
        return _pluginData.commands.runFromMessage(message);
      });
    }

    return {
      blueprint: plugin,
      pluginData: fullPluginData,
    };
  }

  public async unloadGlobalPlugin(ctx: GlobalContext<any>, pluginName: string): Promise<void> {
    const loadedPlugin = ctx.loadedPlugins.get(pluginName);
    if (!loadedPlugin) return;

    loadedPlugin.pluginData.events.clearAllListeners();

    await loadedPlugin.blueprint.onUnload?.(loadedPlugin.pluginData);

    ctx.loadedPlugins.delete(pluginName);
  }

  public async reloadAllGlobalPlugins() {
    await this.unloadAllGlobalPlugins();
    await this.loadAllGlobalPlugins();
  }

  public async loadAllGlobalPlugins() {
    for (const plugin of this.globalPlugins.values()) {
      await this.loadGlobalPlugin(this.globalContext, plugin, false);
    }
  }

  public async unloadAllGlobalPlugins() {
    for (const pluginName of this.globalPlugins.keys()) {
      await this.unloadGlobalPlugin(this.globalContext, pluginName);
    }
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

  protected ctxHasPlugin(ctx: AnyContext<TGuildConfig, TGlobalConfig>, plugin: AnyPluginBlueprint) {
    return ctx.loadedPlugins.has(plugin.name);
  }

  protected getPluginPublicInterface<T extends AnyPluginBlueprint>(
    ctx: AnyContext<TGuildConfig, TGlobalConfig>,
    plugin: T
  ): PluginPublicInterface<T> {
    if (!ctx.loadedPlugins.has(plugin.name)) {
      throw new PluginNotLoadedError(`Plugin ${plugin.name} is not loaded`);
    }

    const loadedPlugin = ctx.loadedPlugins.get(plugin.name)!;
    const publicInterface = this.resolvePluginBlueprintPublicInterface(loadedPlugin.blueprint, loadedPlugin.pluginData);

    return publicInterface as PluginPublicInterface<T>;
  }

  protected resolvePluginBlueprintPublicInterface<T extends AnyPluginBlueprint, TPublic = T["public"]>(
    blueprint: T,
    pluginData: AnyPluginData<any>
  ): TPublic extends PluginBlueprintPublicInterface<any> ? ResolvedPluginBlueprintPublicInterface<TPublic> : null {
    if (!blueprint.public) {
      return null!;
    }

    // @ts-ignore
    return Array.from(Object.entries(blueprint.public)).reduce((obj, [prop, fn]) => {
      obj[prop] = fn(pluginData);
      return obj;
    }, {}) as ResolvedPluginBlueprintPublicInterface<any>;
  }
}
