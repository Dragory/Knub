import { EventEmitter } from "node:events";
import {
  type Client,
  GatewayDispatchEvents,
  type GatewayGuildCreateDispatchData,
  type Guild,
  type Snowflake,
} from "discord.js";
import { ConcurrentRunner } from "./ConcurrentRunner.ts";
import { Profiler } from "./Profiler.ts";
import { Queue } from "./Queue.ts";
import { PluginContextMenuCommandManager } from "./commands/contextMenuCommands/PluginContextMenuCommandManager.ts";
import { PluginMessageCommandManager } from "./commands/messageCommands/PluginMessageCommandManager.ts";
import {
  type AnyApplicationCommandBlueprint,
  registerApplicationCommands,
} from "./commands/registerApplicationCommands.ts";
import { PluginSlashCommandManager } from "./commands/slashCommands/PluginSlashCommandManager.ts";
import { PluginConfigManager } from "./config/PluginConfigManager.ts";
import type { BaseConfig } from "./config/configTypes.ts";
import { CooldownManager } from "./cooldowns/CooldownManager.ts";
import { EventRelay } from "./events/EventRelay.ts";
import { GlobalPluginEventManager } from "./events/GlobalPluginEventManager.ts";
import { GuildPluginEventManager } from "./events/GuildPluginEventManager.ts";
import { LockManager } from "./locks/LockManager.ts";
import type {
  AnyGlobalEventListenerBlueprint,
  AnyGuildEventListenerBlueprint,
  AnyPluginBlueprint,
  GlobalPluginBlueprint,
  GuildPluginBlueprint,
} from "./plugins/PluginBlueprint.ts";
import type { AnyPluginData, GlobalPluginData, GuildPluginData } from "./plugins/PluginData.ts";
import { PluginLoadError } from "./plugins/PluginLoadError.ts";
import { PluginNotLoadedError } from "./plugins/PluginNotLoadedError.ts";
import { UnknownPluginError } from "./plugins/UnknownPluginError.ts";
import type { BasePluginType } from "./plugins/pluginTypes.ts";
import { type PluginPublicInterface, defaultGetConfig, defaultGetEnabledGuildPlugins } from "./plugins/pluginUtils.ts";
import type {
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
} from "./types.ts";
import { get, notCallable } from "./utils.ts";

const defaultKnubArgs: KnubArgs = {
  guildPlugins: [],
  globalPlugins: [],
  options: {},
};

const defaultLogFn: LogFn = (level: string, ...args) => {
  if (level === "error") {
    console.error("[ERROR]", ...args);
  } else if (level === "warn") {
    console.warn("[WARN]", ...args);
  } else {
    console.log(`[${level.toUpperCase()}]`, ...args);
  }
};

export class Knub extends EventEmitter {
  public client: Client;
  protected eventRelay: EventRelay;

  protected guildPlugins: GuildPluginMap = new Map() as GuildPluginMap;
  protected globalPlugins: GlobalPluginMap = new Map() as GlobalPluginMap;

  protected loadedGuilds: Map<string, GuildContext> = new Map<string, GuildContext>();
  // Guild loads and unloads are queued up to avoid race conditions
  protected guildLoadQueues: Map<string, Queue> = new Map<string, Queue>();
  protected globalContext: GlobalContext;
  protected globalContextLoaded = false;
  protected globalContextLoadPromise = Promise.resolve();

  protected options: KnubOptions;

  protected log: LogFn = defaultLogFn;

  public profiler = new Profiler();

  #guildLoadRunner: ConcurrentRunner;

  #loadErrorInterval: NodeJS.Timeout | null = null;

  protected destroyPromise: Promise<void> | null = null;

  constructor(client: Client, userArgs: Partial<KnubArgs>) {
    super();

    const args = {
      ...defaultKnubArgs,
      ...userArgs,
    } satisfies KnubArgs;

    this.client = client;
    this.eventRelay = new EventRelay(client, this.profiler);

    this.globalContext = {
      // @ts-ignore: This property is always set in loadGlobalConfig() before it can be used by plugins
      config: null,
      loadedPlugins: new Map<string, LoadedGlobalPlugin<any>>(),
      locks: new LockManager(),
    };

    const uniquePluginNames = new Set();
    const validatePlugin = (plugin: AnyPluginBlueprint) => {
      if (plugin.name == null) {
        throw new Error("No plugin name specified for plugin");
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

    const defaultOptions = {
      getConfig: defaultGetConfig,
      getEnabledGuildPlugins: defaultGetEnabledGuildPlugins,
      canLoadGuild: () => true,
      customArgumentTypes: {},
      concurrentGuildLoadLimit: 10,
      pluginUnloadEventTimeoutMs: 1000 * 10,
    } satisfies KnubOptions;

    this.options = { ...defaultOptions, ...args.options };

    if (this.options.logFn) {
      this.log = this.options.logFn;
    }

    this.#guildLoadRunner = new ConcurrentRunner(this.options.concurrentGuildLoadLimit);
  }

  public initialize(): void {
    this.#loadErrorInterval = setInterval(() => {
      this.log("info", "Still connecting...");
    }, 30 * 1000);

    this.client.once("shardReady", () => {
      if (this.#loadErrorInterval) {
        clearInterval(this.#loadErrorInterval);
      }
      this.log("info", "Bot connected!");
    });

    this.client.once("ready", async () => {
      this.log("info", "Received READY");

      const autoRegisterApplicationCommands = this.options.autoRegisterApplicationCommands ?? true;
      if (autoRegisterApplicationCommands) {
        this.log("info", "- Registering application commands with Discord...");
        await this.registerApplicationCommands();
      }

      this.log("info", "- Loading global plugins...");
      await this.loadGlobalContext();

      this.log("info", "- Loading available servers that haven't been loaded yet...");
      await this.loadAllAvailableGuilds();

      this.log("info", "Done!");
      this.emit("loadingFinished");
    });

    this.client.ws.on(GatewayDispatchEvents.GuildCreate, (data: GatewayGuildCreateDispatchData) => {
      setImmediate(() => {
        this.log("info", `Guild available: ${data.id}`);
        void this.#guildLoadRunner.run(() => this.loadGuild(data.id)).catch((err) => this.throwOrEmit(err));
      });
    });

    this.client.on("guildUnavailable", (guild: Guild) => {
      this.log("info", `Guild unavailable: ${guild.id}`);
      void this.unloadGuild(guild.id);
    });

    this.client.on("guildDelete", (guild: Guild) => {
      this.log("info", `Left guild: ${guild.id}`);
      void this.unloadGuild(guild.id);
    });
  }

  public async destroy(): Promise<void> {
    if (!this.destroyPromise) {
      this.destroyPromise = (async () => {
        this.client.destroy();
        await this.unloadAllGuilds();
        await this.unloadGlobalContext();
        this.removeAllListeners();
        this.clearGuildLoadQueues();
        if (this.#loadErrorInterval) {
          clearInterval(this.#loadErrorInterval);
        }
      })();
    }
    return this.destroyPromise;
  }

  protected throwOrEmit(error: any) {
    if (this.listenerCount("error") > 0) {
      this.emit("error", error);
      return;
    }
    throw error;
  }

  public getAvailablePlugins(): GuildPluginMap {
    return this.guildPlugins;
  }

  public getGlobalPlugins(): GlobalPluginMap {
    return this.globalPlugins;
  }

  public getGlobalConfig(): BaseConfig {
    return this.globalContext.config;
  }

  /**
   * Create the partial PluginData that's passed to beforeLoad()
   */
  protected async buildGuildPluginData<TPluginType extends BasePluginType>(
    ctx: GuildContext,
    plugin: GuildPluginBlueprint<GuildPluginData<TPluginType>, any>,
    loadedAsDependency: boolean,
  ): Promise<GuildPluginData<TPluginType>> {
    const pluginOptionsInput = (get(ctx.config, `plugins.${plugin.name}`) as any) || {};
    const configManager = new PluginConfigManager<GuildPluginData<TPluginType>>(pluginOptionsInput, {
      configSchema: plugin.configSchema,
      defaultOverrides: plugin.defaultOverrides ?? [],
      levels: ctx.config.levels || {},
      customOverrideCriteriaFunctions: plugin.customOverrideCriteriaFunctions,
    });

    try {
      await configManager.init();
    } catch (e) {
      if (!(e instanceof Error)) {
        throw e;
      }
      throw new PluginLoadError(plugin.name, ctx, e);
    }

    const pluginData = {
      _pluginType: undefined as any,

      pluginName: plugin.name,
      context: "guild",
      guild: this.client.guilds.resolve(ctx.guildId)!,
      loaded: false,
      client: this.client,
      config: configManager,
      locks: ctx.locks,
      cooldowns: new CooldownManager(),
      fullConfig: ctx.config,
      events: new GuildPluginEventManager(this.eventRelay),
      messageCommands: new PluginMessageCommandManager(this.client, { prefix: ctx.config.prefix }),
      slashCommands: new PluginSlashCommandManager(),
      contextMenuCommands: new PluginContextMenuCommandManager(),

      loadedAsDependency,

      getKnubInstance: () => this,
      hasGlobalPlugin: notCallable("hasGlobalPlugin is not available yet"),
      getGlobalPlugin: notCallable("getGlobalPlugin is not available yet"),
      hasPlugin: notCallable("hasPlugin is not available yet"),
      getPlugin: notCallable("getPlugin is not available yet"),

      state: {},
    } satisfies GuildPluginData<TPluginType>;

    pluginData.config.setPluginData(pluginData);
    pluginData.events.setPluginData(pluginData);
    pluginData.messageCommands.setPluginData(pluginData);
    pluginData.slashCommands.setPluginData(pluginData);
    pluginData.contextMenuCommands.setPluginData(pluginData);

    this.addGlobalDependencyFnsToPluginData(pluginData);

    return pluginData;
  }

  protected addDependencyFnsToPluginData(ctx: AnyContext, pluginData: AnyPluginData<any>): void {
    pluginData.hasPlugin = (resolvablePlugin) => this.ctxHasPlugin(ctx, resolvablePlugin);
    pluginData.getPlugin = (resolvablePlugin) => {
      const publicInterface = this.getPluginPublicInterface(ctx, resolvablePlugin);
      if (!publicInterface) {
        throw new Error("Requested global plugin is not available");
      }
      return publicInterface;
    };
  }

  /**
   * Create the partial PluginData that's passed to beforeLoad()
   */
  protected async buildGlobalPluginData<TPluginType extends BasePluginType>(
    ctx: AnyContext,
    plugin: GlobalPluginBlueprint<GlobalPluginData<TPluginType>, any>,
    loadedAsDependency: boolean,
  ): Promise<GlobalPluginData<TPluginType>> {
    const pluginOptionsInput = (get(ctx.config, `plugins.${plugin.name}`) as any) || {};
    const configManager = new PluginConfigManager<GlobalPluginData<TPluginType>>(pluginOptionsInput, {
      configSchema: plugin.configSchema,
      defaultOverrides: plugin.defaultOverrides ?? [],
      levels: ctx.config.levels || {},
      customOverrideCriteriaFunctions: plugin.customOverrideCriteriaFunctions,
    });

    try {
      await configManager.init();
    } catch (e) {
      if (!(e instanceof Error)) {
        throw e;
      }
      throw new PluginLoadError(plugin.name, ctx, e);
    }

    const pluginData = {
      _pluginType: undefined as any,

      context: "global",
      pluginName: plugin.name,
      loaded: false,
      client: this.client,
      config: configManager,
      locks: ctx.locks,
      cooldowns: new CooldownManager(),
      fullConfig: ctx.config,
      events: new GlobalPluginEventManager(this.eventRelay),
      messageCommands: new PluginMessageCommandManager(this.client, { prefix: ctx.config.prefix }),
      slashCommands: new PluginSlashCommandManager(),
      contextMenuCommands: new PluginContextMenuCommandManager(),

      loadedAsDependency,

      // @ts-ignore: This is actually correct, dw about it
      getKnubInstance: () => this,
      hasGlobalPlugin: notCallable("hasGlobalPlugin is not available yet"),
      getGlobalPlugin: notCallable("getGlobalPlugin is not available yet"),
      hasPlugin: notCallable("hasPlugin is not available yet"),
      getPlugin: notCallable("getPlugin is not available yet"),

      state: {},
    } satisfies GlobalPluginData<TPluginType>;

    pluginData.config.setPluginData(pluginData);
    pluginData.events.setPluginData(pluginData);
    pluginData.messageCommands.setPluginData(pluginData);
    pluginData.slashCommands.setPluginData(pluginData);
    pluginData.contextMenuCommands.setPluginData(pluginData);

    this.addGlobalDependencyFnsToPluginData(pluginData);

    return pluginData;
  }

  protected addGlobalDependencyFnsToPluginData(pluginData: AnyPluginData<any>): void {
    pluginData.hasGlobalPlugin = (resolvablePlugin) => this.ctxHasPlugin(this.globalContext, resolvablePlugin);
    pluginData.getGlobalPlugin = (resolvablePlugin) => {
      const publicInterface = this.getPluginPublicInterface(this.globalContext, resolvablePlugin);
      if (!publicInterface) {
        throw new Error("Requested global plugin is not available");
      }
      return publicInterface;
    };
  }

  protected async resolveDependencies(
    plugin: AnyPluginBlueprint,
    resolvedDependencies: Set<string> = new Set(),
  ): Promise<Set<string>> {
    if (!plugin.dependencies) {
      return resolvedDependencies;
    }

    const dependencies = await plugin.dependencies();
    for (const dependency of dependencies) {
      if (!resolvedDependencies.has(dependency.name)) {
        resolvedDependencies.add(dependency.name);

        // Resolve transitive dependencies
        await this.resolveDependencies(dependency, resolvedDependencies);
      }
    }

    return resolvedDependencies;
  }

  protected ctxHasPlugin(ctx: AnyContext, plugin: AnyPluginBlueprint): boolean {
    return ctx.loadedPlugins.has(plugin.name);
  }

  protected getPluginPublicInterface<T extends AnyPluginBlueprint>(
    ctx: AnyContext,
    plugin: T,
  ): PluginPublicInterface<T> {
    if (!ctx.loadedPlugins.has(plugin.name)) {
      throw new PluginNotLoadedError(`Plugin ${plugin.name} is not loaded`);
    }

    const loadedPlugin = ctx.loadedPlugins.get(plugin.name)!;
    // FIXME: TS can't associate loadedPlugin.publicData with loadedPlugin.blueprint.public's type here
    // @ts-expect-error
    const publicInterface = loadedPlugin.blueprint.public?.(loadedPlugin.pluginData) ?? null;

    return publicInterface as PluginPublicInterface<T>;
  }

  protected async loadAllAvailableGuilds(): Promise<void> {
    const guilds: Guild[] = Array.from(this.client.guilds.cache.values());
    const loadPromises = guilds.map((guild) =>
      this.#guildLoadRunner.run(() => this.loadGuild(guild.id)).catch((err) => this.throwOrEmit(err)),
    );
    await Promise.all(loadPromises);
  }

  public async loadGuild(guildId: Snowflake): Promise<void> {
    let guildLoadPromise = this.getGuildLoadQueue(guildId).add(async () => {
      if (this.loadedGuilds.has(guildId)) {
        return;
      }

      // Only load the guild if we're actually in the guild
      if (!this.client.guilds.resolve(guildId)) {
        return;
      }

      const guildContext: GuildContext = {
        guildId,
        // @ts-ignore: This property is always set below before it can be used by plugins
        config: null,
        loadedPlugins: new Map<string, LoadedGuildPlugin<any>>(),
        locks: new LockManager(),
      };

      let err: any = null;
      try {
        await this.loadGuildConfig(guildContext);
        await this.loadGuildPlugins(guildContext);
      } catch (_err) {
        err = _err;
      }

      // Even if we get an error, we need to mark the guild briefly as loaded
      // so the unload function has something to work with
      this.loadedGuilds.set(guildId, guildContext);

      // However, we don't emit the guildLoaded event unless we managed to load everything without errors
      if (err) {
        throw err;
      }
      this.emit("guildLoaded", guildId);

      // Call afterLoad() hooks
      for (const loadedPlugin of guildContext.loadedPlugins.values()) {
        await loadedPlugin.blueprint.afterLoad?.(loadedPlugin.pluginData);
      }
    });

    guildLoadPromise = guildLoadPromise.catch(async (err) => {
      // If we encounter errors during loading, unload the guild and re-throw the error
      await this.unloadGuild(guildId);
      throw err;
    });

    return guildLoadPromise;
  }

  public async reloadGuild(guildId: Snowflake): Promise<void> {
    await this.unloadGuild(guildId);
    await this.#guildLoadRunner.run(() => this.loadGuild(guildId)).catch((err) => this.throwOrEmit(err));
  }

  public async unloadGuild(guildId: Snowflake): Promise<void> {
    // Loads and unloads are queued up to avoid race conditions
    return this.getGuildLoadQueue(guildId).add(async () => {
      const ctx = this.loadedGuilds.get(guildId);
      if (!ctx) {
        return;
      }

      const pluginsToUnload = Array.from(ctx.loadedPlugins.entries());

      // 1. Run each plugin's beforeUnload() function
      for (const [_, loadedPlugin] of pluginsToUnload) {
        await loadedPlugin.blueprint.beforeUnload?.(loadedPlugin.pluginData);
      }

      // 2. Remove event listeners and mark each plugin as unloaded
      for (const [pluginName, loadedPlugin] of pluginsToUnload) {
        await this.destroyPluginData(loadedPlugin.pluginData);
        loadedPlugin.pluginData.loaded = false;
        ctx.loadedPlugins.delete(pluginName);
      }

      // 3. Mark the guild as unloaded
      this.loadedGuilds.delete(ctx.guildId);
      this.emit("guildUnloaded", ctx.guildId);

      // 4. Run each plugin's afterUnload() function
      for (const [_, loadedPlugin] of pluginsToUnload) {
        loadedPlugin.pluginData.hasPlugin = notCallable("hasPlugin is no longer available");
        loadedPlugin.pluginData.getPlugin = notCallable("getPlugin is no longer available");
        await loadedPlugin.blueprint.afterUnload?.(loadedPlugin.pluginData);
      }
    });
  }

  protected async unloadAllGuilds(): Promise<void> {
    // Merge guild IDs of loaded guilds and those that are in the progress of being loaded
    // This way we won't miss guilds that are still undergoing their initial load, i.e. they're not returned by getLoadedGuilds()
    const loadedGuildIds = this.getLoadedGuilds().map((c) => c.guildId);
    const queuedGuildIds = Array.from(this.guildLoadQueues.keys());
    const uniqueGuildIds = new Set([...loadedGuildIds, ...queuedGuildIds]);
    const unloadPromises = Array.from(uniqueGuildIds).map((guildId) => this.unloadGuild(guildId));

    await Promise.all(unloadPromises);
  }

  protected getGuildLoadQueue(guildId: Snowflake): Queue {
    if (!this.guildLoadQueues.has(guildId)) {
      const queueTimeout = 60 * 5 * 1000; // 5 minutes, should be plenty to allow plugins time to load/unload properly
      this.guildLoadQueues.set(guildId, new Queue(queueTimeout));
    }

    return this.guildLoadQueues.get(guildId)!;
  }

  protected clearGuildLoadQueues(): void {
    for (const [key, queue] of this.guildLoadQueues) {
      this.guildLoadQueues.delete(key);
      queue.destroy();
    }
  }

  public getLoadedGuild(guildId: Snowflake): GuildContext | undefined {
    return this.loadedGuilds.get(guildId);
  }

  public getLoadedGuilds(): GuildContext[] {
    return Array.from(this.loadedGuilds.values());
  }

  protected async loadGuildConfig(ctx: GuildContext): Promise<void> {
    ctx.config = await this.options.getConfig(ctx.guildId);
  }

  protected async loadGuildPlugins(ctx: GuildContext): Promise<void> {
    const enabledPlugins = await this.options.getEnabledGuildPlugins!(ctx, this.guildPlugins);
    const dependencies: Set<string> = new Set();
    for (const pluginName of enabledPlugins) {
      await this.resolveDependencies(this.guildPlugins.get(pluginName)!, dependencies);
    }

    // Reverse the order of dependencies so transitive dependencies get loaded first
    const dependenciesArr = Array.from(dependencies.values()).reverse();

    const pluginsToLoad = Array.from(new Set([...dependenciesArr, ...enabledPlugins]));

    // 1. Set up plugin data for each plugin. Call beforeLoad() hook.
    for (const pluginName of pluginsToLoad) {
      if (!this.guildPlugins.has(pluginName)) {
        throw new UnknownPluginError(`Unknown plugin: ${pluginName}`);
      }

      const plugin = this.guildPlugins.get(pluginName)!;
      const onlyLoadedAsDependency = !enabledPlugins.includes(pluginName);
      const pluginData = await this.buildGuildPluginData(ctx, plugin, onlyLoadedAsDependency);

      try {
        await plugin.beforeLoad?.(pluginData);
      } catch (e) {
        await this.destroyPluginData(pluginData);
        throw new PluginLoadError(plugin.name, ctx, e as Error);
      }

      this.addDependencyFnsToPluginData(ctx, pluginData);

      ctx.loadedPlugins.set(pluginName, {
        blueprint: plugin,
        pluginData,
        onlyLoadedAsDependency,
      });
    }

    // 2. Call each plugin's beforeStart() hook
    for (const [pluginName, loadedPlugin] of ctx.loadedPlugins) {
      try {
        loadedPlugin.blueprint.beforeStart?.(loadedPlugin.pluginData);
      } catch (e) {
        throw new PluginLoadError(pluginName, ctx, e as Error);
      }
    }

    // 3. Register event handlers and commands
    for (const [pluginName, { blueprint, pluginData, onlyLoadedAsDependency }] of ctx.loadedPlugins) {
      if (!onlyLoadedAsDependency) {
        // Register event listeners
        if (blueprint.events) {
          for (const eventListenerBlueprint of blueprint.events) {
            pluginData.events.registerEventListener({
              ...eventListenerBlueprint,
              listener: eventListenerBlueprint.listener,
            } as AnyGuildEventListenerBlueprint<GuildPluginData<any>>);
          }
        }

        // Register message commands
        if (blueprint.messageCommands) {
          for (const commandBlueprint of blueprint.messageCommands) {
            pluginData.messageCommands.add({
              ...commandBlueprint,
              run: commandBlueprint.run,
            });
          }
        }

        // Initialize messageCreate event listener for message commands
        pluginData.events.on("messageCreate", ({ args: { message }, pluginData: _pluginData }) => {
          return _pluginData.messageCommands.runFromMessage(message);
        });

        // Register slash commands
        if (blueprint.slashCommands) {
          for (const slashCommandBlueprint of blueprint.slashCommands) {
            pluginData.slashCommands.add(slashCommandBlueprint);
          }
        }

        // Add interactionCreate event listener for slash commands
        pluginData.events.on("interactionCreate", async ({ args: { interaction }, pluginData: _pluginData }) => {
          await _pluginData.slashCommands.runFromInteraction(interaction);
        });

        // Register context menu commands
        if (blueprint.contextMenuCommands) {
          for (const contextMenuCommandBlueprint of blueprint.contextMenuCommands) {
            pluginData.contextMenuCommands.add(contextMenuCommandBlueprint);
          }
        }

        // Add interactionCreate event listener for context menu commands
        pluginData.events.on("interactionCreate", async ({ args: { interaction }, pluginData: _pluginData }) => {
          await _pluginData.contextMenuCommands.runFromInteraction(interaction);
        });
      }

      pluginData.loaded = true;
    }
  }

  /**
   * The global context analogue to loadGuild()
   */
  public async loadGlobalContext(): Promise<void> {
    if (this.globalContextLoaded) {
      return;
    }

    this.globalContextLoadPromise = (async () => {
      const globalContext = {
        config: await this.options.getConfig("global"),
        loadedPlugins: new Map(),
        locks: new LockManager(),
      };

      await this.loadGlobalPlugins(globalContext);

      this.globalContext = globalContext;
      this.globalContextLoaded = true;

      // Call afterLoad() hooks after the context has been loaded
      for (const loadedPlugin of this.globalContext.loadedPlugins.values()) {
        loadedPlugin.blueprint.afterLoad?.(loadedPlugin.pluginData);
      }
    })();
    await this.globalContextLoadPromise;
  }

  public async reloadGlobalContext(): Promise<void> {
    await this.unloadGlobalContext();
    await this.loadGlobalContext();
  }

  public async unloadGlobalContext(): Promise<void> {
    // Make sure we don't start unloading the global context while it's still loading
    await this.globalContextLoadPromise;

    const pluginsToUnload = Array.from(this.globalContext.loadedPlugins.entries());

    // 1. Run each plugin's beforeUnload() function
    for (const [_, loadedPlugin] of pluginsToUnload) {
      await loadedPlugin.blueprint.beforeUnload?.(loadedPlugin.pluginData);
    }

    // 2. Remove event listeners and mark each plugin as unloaded
    for (const [pluginName, loadedPlugin] of pluginsToUnload) {
      await this.destroyPluginData(loadedPlugin.pluginData);
      loadedPlugin.pluginData.loaded = false;
      this.globalContext.loadedPlugins.delete(pluginName);
    }

    // 3. Mark the global context as unloaded
    this.globalContextLoaded = false;

    // 4. Run each plugin's afterUnload() function
    for (const [_, loadedPlugin] of pluginsToUnload) {
      loadedPlugin.pluginData.hasPlugin = notCallable("hasPlugin is no longer available");
      loadedPlugin.pluginData.getPlugin = notCallable("getPlugin is no longer available");
      await loadedPlugin.blueprint.afterUnload?.(loadedPlugin.pluginData);
    }
  }

  protected async loadGlobalPlugins(ctx: GlobalContext): Promise<void> {
    // 1. Set up plugin data for each plugin. Call beforeLoad() hooks.
    for (const [pluginName, plugin] of this.globalPlugins.entries()) {
      const pluginData = await this.buildGlobalPluginData(ctx, plugin, false);

      try {
        await plugin.beforeLoad?.(pluginData);
      } catch (e) {
        await this.destroyPluginData(pluginData);
        throw new PluginLoadError(plugin.name, ctx, e as Error);
      }

      this.addDependencyFnsToPluginData(ctx, pluginData);

      ctx.loadedPlugins.set(pluginName, {
        blueprint: plugin,
        pluginData,
      });
    }

    // 2. Call each plugin's beforeStart() hook
    for (const [pluginName, loadedPlugin] of ctx.loadedPlugins) {
      try {
        await loadedPlugin.blueprint.beforeStart?.(loadedPlugin.pluginData);
      } catch (e) {
        throw new PluginLoadError(pluginName, ctx, e as Error);
      }
    }

    // 3. Register each plugin's event listeners and commands
    for (const [pluginName, { pluginData, blueprint }] of ctx.loadedPlugins) {
      // Register event listeners
      if (blueprint.events) {
        for (const eventListenerBlueprint of blueprint.events) {
          pluginData.events.registerEventListener({
            ...eventListenerBlueprint,
            listener: eventListenerBlueprint.listener,
          } as AnyGlobalEventListenerBlueprint<GlobalPluginData<any>>);
        }
      }

      // Register message commands
      if (blueprint.messageCommands) {
        for (const commandBlueprint of blueprint.messageCommands) {
          pluginData.messageCommands.add({
            ...commandBlueprint,
            run: commandBlueprint.run,
          });
        }
      }

      // Add messageCreate event listener for commands
      pluginData.events.on("messageCreate", ({ args: { message }, pluginData: _pluginData }) => {
        return _pluginData.messageCommands.runFromMessage(message);
      });

      // Register slash commands
      if (blueprint.slashCommands) {
        for (const slashCommandBlueprint of blueprint.slashCommands) {
          pluginData.slashCommands.add(slashCommandBlueprint);
        }
      }

      // Add interactionCreate event listener for slash commands
      pluginData.events.on("interactionCreate", async ({ args: { interaction }, pluginData: _pluginData }) => {
        await _pluginData.slashCommands.runFromInteraction(interaction);
      });

      // Register context menu commands
      if (blueprint.contextMenuCommands) {
        for (const contextMenuCommandBlueprint of blueprint.contextMenuCommands) {
          pluginData.contextMenuCommands.add(contextMenuCommandBlueprint);
        }
      }

      // Add interactionCreate event listener for context menu commands
      pluginData.events.on("interactionCreate", async ({ args: { interaction }, pluginData: _pluginData }) => {
        await _pluginData.contextMenuCommands.runFromInteraction(interaction);
      });

      pluginData.loaded = true;
    }
  }

  /**
   * Cleans up plugin data by removing any dangling event handlers and timers
   */
  protected async destroyPluginData(pluginData: GuildPluginData<any> | GlobalPluginData<any>): Promise<void> {
    pluginData.cooldowns.destroy();
    await pluginData.events.destroy(this.options.pluginUnloadEventTimeoutMs);
    await pluginData.locks.destroy();
  }

  protected async registerApplicationCommands(): Promise<void> {
    const applicationCommands: AnyApplicationCommandBlueprint[] = [];
    for (const plugin of this.guildPlugins.values()) {
      applicationCommands.push(...(plugin.slashCommands || []));
      applicationCommands.push(...(plugin.contextMenuCommands || []));
    }
    for (const plugin of this.globalPlugins.values()) {
      applicationCommands.push(...(plugin.slashCommands || []));
      applicationCommands.push(...(plugin.contextMenuCommands || []));
    }
    if (applicationCommands.length) {
      const result = await registerApplicationCommands(this.client as Client<true>, applicationCommands);
      this.log("info", `-- Created ${result.create}, updated ${result.update}, deleted ${result.delete}`);
    }
  }
}
