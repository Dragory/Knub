import { Client, Guild } from "eris";
import * as path from "path";
import * as winston from "winston";

import { IConfigProvider } from "./IConfigProvider";
import { Plugin } from "./Plugin";
import { YamlConfigProvider } from "./YamlConfigProvider";

export type SettingsProviderFactory = (
  id: string
) => IConfigProvider | Promise<IConfigProvider>;

export interface IPluginList {
  [key: string]: typeof Plugin;
}

export interface IOptions {
  logLevel?: string;
  autoInitGuilds?: boolean;
  settingsProvider?: string | SettingsProviderFactory;
  getEnabledPlugins?: (
    guildId: string,
    guildConfig: IConfigProvider
  ) => string[] | Promise<string[]>;
  canLoadGuild?: (guildId: string) => boolean | Promise<boolean>;
  [key: string]: any;
}

export interface IGuildData {
  id: string;
  config: IConfigProvider;
  loadedPlugins: Map<string, Plugin>;
}

export class BotFramework {
  protected bot: Client;
  protected plugins: Map<string, typeof Plugin>;
  protected options: IOptions;
  protected guilds: Map<string, IGuildData>;
  private logger: winston.LoggerInstance;

  constructor(bot: Client, plugins: IPluginList, options: IOptions = {}) {
    this.bot = bot;

    this.plugins = new Map();

    Object.keys(plugins).forEach(key => {
      this.plugins.set(key, plugins[key]);
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

    this.options = { ...defaultOptions, ...options };

    this.logger = new winston.Logger({
      transports: [
        new winston.transports.Console({
          level: this.options.logLevel,

          timestamp() {
            return new Date().toISOString();
          },

          formatter(opts) {
            let meta = opts.meta ? JSON.stringify(opts.meta) : null;
            if (meta === "{}") {
              meta = null;
            }

            return `[${opts.timestamp()}] [${opts.level.toUpperCase()}] ${opts.message ||
              ""} ${meta ? "\n\t" + meta : ""}`.trim();
          }
        })
      ]
    });

    this.guilds = new Map();
  }

  public async load(): Promise<void> {
    this.logger.info("Connecting to Discord...");

    this.bot.on("debug", async str => {
      this.logger.debug(`[ERIS] ${str}`);
    });

    this.bot.on("error", async (err: Error) => {
      this.logger.error(`[ERIS] ${String(err)}`);
    });

    const loadErrorTimeout = setTimeout(() => {
      this.logger.info("This is taking unusually long. Check the token?");
    }, 10 * 1000);

    this.bot.on("ready", async () => {
      clearTimeout(loadErrorTimeout);

      this.logger.info("Bot connected! Loading guilds...");

      this.bot.on("guildAvailable", guild => {
        this.logger.info(`Joined guild: ${guild.id}`);
        this.loadGuild(guild.id);
      });

      this.bot.on("guildUnavailable", guild => {
        this.logger.info(`Left guild: ${guild.id}`);
        this.unloadGuild(guild.id);
      });

      await this.loadAllGuilds();
      this.logger.info("Guilds loaded!");
    });

    this.bot.connect();
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
    const enabledPlugins = await this.options.getEnabledPlugins(
      guildData.id,
      guildData.config
    );

    const loadPromises = enabledPlugins.map(async pluginName => {
      const plugin = await this.loadPlugin(
        guildData.id,
        pluginName,
        guildData.config
      );
      guildData.loadedPlugins.set(pluginName, plugin);
    });

    await Promise.all(loadPromises);
  }

  public async unloadGuild(guildId: string): Promise<void> {
    const guildData = this.guilds.get(guildId);
    if (!guildData) {
      return;
    }

    for (const plugin of guildData.loadedPlugins.values()) {
      await this.unloadPlugin(plugin);
      this.guilds.delete(guildId);
    }

    return this.loadGuild(guildId);
  }

  public async reloadGuild(guildId: string): Promise<void> {
    await this.unloadGuild(guildId);
    await this.loadGuild(guildId);
  }

  public async loadPlugin(
    guildId: string,
    pluginName: string,
    guildConfig: IConfigProvider
  ): Promise<Plugin> {
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

        const prop: any = target[name];
      }
    });

    const PluginObj: typeof Plugin = this.plugins.get(pluginName);
    const plugin = new PluginObj(
      this.bot,
      guildId,
      guildConfig,
      pluginConfig,
      pluginName,
      this.logger,
      this
    );

    await plugin.runLoad();

    return plugin;
  }

  public async unloadPlugin(plugin: Plugin): Promise<void> {
    await plugin.runUnload();
  }

  public async reloadPlugin(plugin: Plugin): Promise<void> {
    await this.unloadPlugin(plugin);
    const guild = this.guilds.get(plugin.guildId);
    await this.loadPlugin(guild.id, plugin.name, guild.config);
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
