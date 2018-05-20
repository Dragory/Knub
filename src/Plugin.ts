import { Channel, Client, DMChannel, GroupDMChannel, Guild, GuildMember, Message, User } from "discord.js";
const at = require("lodash.at");

import { CommandManager, MissingArgumentError } from "./CommandManager";
import {
  IGuildConfig,
  IMergedConfig,
  IMergedPermissions,
  IPermissionLevelDefinitions,
  IPluginOptions
} from "./configInterfaces";
import {
  CallbackFunctionVariadic,
  errorEmbed,
  eventToChannel,
  eventToGuild,
  eventToMessage,
  eventToUser
} from "./utils";
import { getDefaultPrefix, maybeRunCommand } from "./commandUtils";
import { Knub } from "./Knub";
import { getMatchingConfigOrPermissions, hasPermission, mergeConfig } from "./configUtils";

/**
 * Base class for Knub plugins
 */
export class Plugin {
  // Guild info - these will be null for global plugins
  public guildId: string;
  public guild: Guild;

  // Internal name for the plugin
  public pluginName: string;

  // Plugin name and description for e.g. dashboards
  public name: string;
  public description: string;

  protected bot: Client;
  protected guildConfig: IGuildConfig;
  protected pluginOptions: IPluginOptions;
  protected runtimeConfig: any;

  protected knub: Knub;

  protected commands: CommandManager;
  protected eventHandlers: Map<string, any[]>;

  constructor(
    bot: Client,
    guildId: string,
    guildConfig: IGuildConfig,
    pluginOptions: IPluginOptions,
    pluginName: string,
    knub: Knub
  ) {
    this.bot = bot;
    this.guildId = guildId;
    this.guildConfig = guildConfig;
    this.pluginOptions = pluginOptions;
    this.pluginName = pluginName;

    this.knub = knub;

    this.guild = this.guildId ? this.bot.guilds.get(this.guildId) : null;

    this.commands = new CommandManager();
    this.eventHandlers = new Map();
    this.registerCommandMessageListener();
  }

  /**
   * Run plugin-defined onLoad() function and load commands/event listeners registered with decorators
   */
  public async runLoad(): Promise<any> {
    await Promise.resolve(this.onLoad());

    // Have to do this to access class methods
    const nonEnumerableProps = Object.getOwnPropertyNames(this.constructor.prototype);
    const enumerableProps = Object.keys(this);
    const props = [...nonEnumerableProps, ...enumerableProps];

    for (const prop of props) {
      const value = this[prop];
      if (typeof value !== "function") {
        continue;
      }

      const requiredPermission = Reflect.getMetadata("requiredPermission", this, prop);

      // Command handler from decorator
      const metaCommand = Reflect.getMetadata("command", this, prop);
      if (metaCommand) {
        const opts = metaCommand.options || {};
        if (requiredPermission && requiredPermission.permission) {
          opts.requiredPermission = requiredPermission.permission;
        }

        this.commands.add(metaCommand.command, metaCommand.parameters, value.bind(this), opts);
      }

      // Event listener from decorator
      const event = Reflect.getMetadata("event", this, prop);
      if (event) {
        this.on(
          event.eventName,
          value.bind(this),
          event.restrict || undefined,
          event.ignoreSelf || undefined,
          requiredPermission && requiredPermission.permission
        );
      }
    }
  }

  /**
   * Clear event handlers and run plugin-defined onUnload() function
   */
  public runUnload(): Promise<any> {
    this.clearEventHandlers();
    return Promise.resolve(this.onUnload());
  }

  /**
   * Code to run when the plugin is loaded
   */
  protected onLoad(): any {
    // Implemented by plugin
  }

  /**
   * Code to run when the plugin is unloaded
   */
  protected onUnload(): any {
    // Implemented by plugin
  }

  /**
   * Registers the message listener for commands
   */
  protected registerCommandMessageListener(): void {
    this.on("message", this.runCommandsInMessage.bind(this));
  }

  /**
   * Returns this plugin's default configuration
   */
  private getDefaultConfig(): IMergedConfig {
    // Implemented by plugin
    return {};
  }

  /**
   * Returns this plugin's default permissions
   */
  private getDefaultPermissions(): IMergedPermissions {
    // Implemented by plugin
    return {};
  }

  /**
   * Returns the plugin's default configuration merged with its loaded configuration
   */
  private getMergedConfig(): IMergedConfig {
    const defaultConfig = this.getDefaultConfig();
    const pluginConfig = this.pluginOptions.config || {};
    return mergeConfig({}, defaultConfig, pluginConfig);
  }

  /**
   * Returns the plugin's default permissions merged with its loaded permissions
   */
  private getMergedPermissions(): IMergedConfig {
    const defaultPermissions = this.getDefaultPermissions();
    const pluginPermissions = this.pluginOptions.permissions || {};
    return mergeConfig({}, defaultPermissions, pluginPermissions);
  }

  /**
   * Get a config value from the plugin's merged config
   */
  protected config(path: string, def: any = null) {
    const mergedConfig = this.getMergedConfig();
    const matchingConfig = getMatchingConfigOrPermissions(mergedConfig);
    const value = at(matchingConfig, path)[0];

    return typeof value !== "undefined" ? value : def;
  }

  /**
   * Get a config value from the plugin's merged config.
   * Uses `message` to evaluate which config values apply.
   */
  protected msgConfig(msg: Message, path: string, def: any = null) {
    const memberLevel = msg.member ? this.getMemberLevel(msg.member) : null;
    const mergedConfig = this.getMergedConfig();
    const matchingConfig = getMatchingConfigOrPermissions(
      mergedConfig,
      memberLevel,
      msg.author,
      msg.member,
      msg.channel
    );

    const value = at(matchingConfig, path)[0];

    return typeof value !== "undefined" ? value : def;
  }

  /**
   * Get a config value from the plugin's merged config.
   * Uses `channel` to evaluate which config values apply.
   */
  protected channelConfig(channel: Channel, path: string, def: any = null) {
    const mergedConfig = this.getMergedConfig();
    const matchingConfig = getMatchingConfigOrPermissions(mergedConfig, null, null, null, channel);

    const value = at(matchingConfig, path)[0];

    return typeof value !== "undefined" ? value : def;
  }

  /**
   * Get a config value from the plugin's merged config.
   * Uses `user` to evaluate which config values apply.
   */
  protected userConfig(user: User, path: string, def: any = null) {
    const mergedConfig = this.getMergedConfig();
    const matchingConfig = getMatchingConfigOrPermissions(mergedConfig, null, user, null, null);
    const value = at(matchingConfig, path)[0];

    return typeof value !== "undefined" ? value : def;
  }

  /**
   * Returns the given member's permission level
   */
  protected getMemberLevel(member: GuildMember): number {
    if (member.guild.owner === member) {
      return 99999;
    }

    const levels: IPermissionLevelDefinitions = this.guildConfig.levels;

    for (const id in levels) {
      if (member.id === id || member.roles.has(id)) {
        return levels[id];
      }
    }

    return 0;
  }

  /**
   * Adds a guild-specific event listener for the given event
   */
  protected on(
    eventName: string,
    listener: CallbackFunctionVariadic,
    restrict: string = "guild",
    ignoreSelf: boolean = true,
    requiredPermission: string = null
  ): () => void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }

    // Create a wrapper for the listener that checks:
    // 1) That the event matches the restrict param (guild/dm/group)
    // 2) That we ignore our own events if ignoreSelf is true
    // 3) That the event's guild (if present) matches this plugin's guild
    // 4) If the event has a message, that the message author has the permissions to trigger events
    const wrappedListener = async (...args: any[]) => {
      const guild = eventToGuild[eventName] ? eventToGuild[eventName](...args) : null;
      const user = eventToUser[eventName] ? eventToUser[eventName](...args) : null;
      const channel = eventToChannel[eventName] ? eventToChannel[eventName](...args) : null;
      const message = eventToMessage[eventName] ? eventToMessage[eventName](...args) : null;

      // Restrictions
      if (restrict === "dm" && !(channel instanceof DMChannel)) return;
      if (restrict === "guild" && !guild) return;
      if (restrict === "group" && !(channel instanceof GroupDMChannel)) return;

      // Ignore self
      if (ignoreSelf && user === this.bot.user) return;

      // Guild check
      if (this.guildId && guild && guild.id !== this.guildId) return;

      // Permission check
      if (requiredPermission) {
        const memberLevel = message && message.member ? this.getMemberLevel(message.member) : null;
        const mergedPermissions = this.getMergedPermissions();
        if (!hasPermission(requiredPermission, mergedPermissions, memberLevel, user, message.member, channel)) {
          return;
        }
      }

      // Call the original listener
      listener(...args);
    };

    // The listener is registered on both the DJS client and our own Map that we use to unregister listeners on unload
    this.bot.on(eventName, wrappedListener);
    this.eventHandlers.get(eventName).push(wrappedListener);

    // Return a function to clear the listener
    const removeListener = () => {
      this.off(eventName, wrappedListener);
    };

    return removeListener;
  }

  /**
   * Removes the given listener from the event
   */
  protected off(eventName: string, listener: CallbackFunctionVariadic): void {
    this.bot.removeListener(eventName, listener);

    if (this.eventHandlers.has(eventName)) {
      const thisEventNameHandlers = this.eventHandlers.get(eventName);
      thisEventNameHandlers.splice(thisEventNameHandlers.indexOf(listener), 1);
    }
  }

  /**
   * Clears all event listeners registered with on()
   */
  protected clearEventHandlers(): void {
    for (const [eventName, listeners] of this.eventHandlers) {
      listeners.forEach(listener => {
        this.bot.removeListener(eventName, listener);
      });
    }

    this.eventHandlers.clear();
  }

  /**
   * Runs all matching commands in the message
   */
  private async runCommandsInMessage(msg: Message): Promise<void> {
    // Ignore messages without text (e.g. images, embeds, etc.)
    if (msg.content == null || msg.content.trim() === "") {
      return;
    }

    const prefix = this.guildConfig.prefix || getDefaultPrefix(this.bot);

    const { commands: matchedCommands, errors } = this.commands.findCommandsInString(msg.content, prefix);

    if (matchedCommands.length === 0 && errors.length > 0) {
      const firstError = errors[0];
      if (firstError instanceof MissingArgumentError) {
        msg.channel.send("", errorEmbed(`Missing argument \`${firstError.arg.name}\``));
      }
      return;
    }

    // Run each matching command sequentially
    for (const command of matchedCommands) {
      // Check permissions
      const requiredPermission = command.commandDefinition.options.requiredPermission;
      if (requiredPermission) {
        const mergedPermissions = this.getMergedPermissions();
        const memberLevel = msg.member ? this.getMemberLevel(msg.member) : null;
        if (!hasPermission(requiredPermission, mergedPermissions, memberLevel, msg.author, msg.member, msg.channel)) {
          return;
        }
      }

      // Run the command
      try {
        maybeRunCommand(command, msg);
      } catch (e) {
        msg.channel.send("", errorEmbed(e.message));
        continue;
      }
    }
  }
}
