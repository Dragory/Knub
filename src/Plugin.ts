import { Channel, Client, PrivateChannel, GroupChannel, GuildChannel, Guild, Member, Message, User } from "eris";
const at = require("lodash.at");

import { CommandManager } from "./CommandManager";
import { IGuildConfig, IPermissionLevelDefinitions, IPluginOptions } from "./configInterfaces";
import { ArbitraryFunction, errorEmbed, eventToChannel, eventToGuild, eventToMessage, eventToUser } from "./utils";
import { CommandValueTypeError, convertArgumentTypes, getDefaultPrefix, runCommand } from "./commandUtils";
import { Knub } from "./Knub";
import { getMatchingPluginOptions, hasPermission, IMatchParams, mergeConfig } from "./configUtils";

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
  private readonly guildConfig: IGuildConfig;
  private readonly pluginOptions: IPluginOptions;
  private mergedPluginOptions: IPluginOptions;

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

      let blocking = Reflect.getMetadata("blocking", this, prop);
      blocking = blocking == null ? true : Boolean(blocking);

      // Command handlers from decorators
      const metaCommands = Reflect.getMetadata("commands", this, prop);
      if (metaCommands) {
        for (const metaCommand of metaCommands) {
          const opts = metaCommand.options || {};

          if (requiredPermission && requiredPermission.permission) {
            opts.requiredPermission = requiredPermission.permission;
          }

          opts.blocking = blocking;

          this.commands.add(metaCommand.command, metaCommand.parameters, value.bind(this), opts);
        }
      }

      // Event listener from decorator
      const metaEvents = Reflect.getMetadata("events", this, prop);
      if (metaEvents) {
        for (const metaEvent of metaEvents) {
          this.on(
            metaEvent.eventName,
            value.bind(this),
            metaEvent.restrict || undefined,
            metaEvent.ignoreSelf || undefined,
            requiredPermission && requiredPermission.permission,
            blocking
          );
        }
      }
    }
  }

  /**
   * Clear event handlers and run plugin-defined onUnload() function
   */
  public async runUnload(): Promise<any> {
    this.clearEventHandlers();
    await Promise.resolve(this.onUnload());
    this.clearMergedOptions();
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
    this.on("messageCreate", this.runCommandsInMessage.bind(this));
  }

  /**
   * Returns this plugin's default configuration
   */
  protected getDefaultOptions(): IPluginOptions {
    // Implemented by plugin
    return {};
  }

  /**
   * Returns the plugin's default configuration merged with its loaded configuration
   */
  private getMergedOptions(): IPluginOptions {
    if (!this.mergedPluginOptions) {
      const defaultOptions = this.getDefaultOptions();
      this.mergedPluginOptions = {
        config: mergeConfig({}, defaultOptions.config || {}, this.pluginOptions.config || {}),
        permissions: mergeConfig({}, defaultOptions.permissions || {}, this.pluginOptions.permissions || {}),
        overrides: this.pluginOptions["=overrides"]
          ? this.pluginOptions["=overrides"]
          : (this.pluginOptions.overrides || []).concat(defaultOptions.overrides || [])
      };
    }

    return this.mergedPluginOptions;
  }

  private clearMergedOptions() {
    this.mergedPluginOptions = null;
  }

  protected configValue(path: string, def: any = null, matchParams: IMatchParams = {}) {
    const mergedOptions = this.getMergedOptions();
    const matchingOptions = getMatchingPluginOptions(mergedOptions, matchParams);
    const value = at(matchingOptions.config, path)[0];

    return typeof value !== "undefined" ? value : def;
  }

  protected configValueForMemberIdAndChannelId(memberId: string, channelId: string, path: string, def: any = null) {
    const guildId = this.bot.channelGuildMap[channelId];
    const guild = this.bot.guilds.get(guildId);
    const member = guild.members.get(memberId);
    const level = member ? this.getMemberLevel(member) : null;

    return this.configValue(path, def, {
      level,
      userId: memberId,
      channelId,
      memberRoles: member ? member.roles : []
    });
  }

  protected configValueForMsg(msg: Message, path: string, def: any = null) {
    const level = msg.member ? this.getMemberLevel(msg.member) : null;
    return this.configValue(path, def, {
      level,
      userId: msg.author.id,
      channelId: msg.channel.id,
      memberRoles: msg.member ? msg.member.roles : []
    });
  }

  protected configValueForChannel(channel: Channel, path: string, def: any = null) {
    return this.configValue(path, def, {
      channelId: channel.id
    });
  }

  protected configValueForUser(user: User, path: string, def: any = null) {
    return this.configValue(path, def, {
      userId: user.id
    });
  }

  protected configValueForMember(member: Member, path: string, def: any = null) {
    const level = this.getMemberLevel(member);
    return this.configValue(path, def, {
      level,
      userId: member.user.id,
      memberRoles: member.roles
    });
  }

  /**
   * Returns the member's permission level
   */
  protected getMemberLevel(member: Member): number {
    if (member.guild.ownerID === member.id) {
      return 99999;
    }

    const levels: IPermissionLevelDefinitions = this.guildConfig.levels;

    for (const id in levels) {
      if (member.id === id || member.roles.includes(id)) {
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
    listener: ArbitraryFunction,
    restrict: string = "guild",
    ignoreSelf: boolean = true,
    requiredPermission: string = null,
    blocking: boolean = true
  ): () => void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }

    // Create a wrapper for the listener that checks:
    // 1) That the event matches the restrict param (guild/dm/group)
    // 2) That we ignore our own events if ignoreSelf is true
    // 3) That the event's guild (if present) matches this plugin's guild
    // 4) If the event has a message, that the message author has the permissions to trigger events
    const wrappedListener = (...args: any[]) => {
      const guild = eventToGuild[eventName] ? eventToGuild[eventName](...args) : null;
      const user = eventToUser[eventName] ? eventToUser[eventName](...args) : null;
      const channel = eventToChannel[eventName] ? eventToChannel[eventName](...args) : null;
      const message = eventToMessage[eventName] ? eventToMessage[eventName](...args) : null;

      // Restrictions
      if (restrict === "dm" && !(channel instanceof PrivateChannel)) return;
      if (restrict === "guild" && !guild) return;
      if (restrict === "group" && !(channel instanceof GroupChannel)) return;

      // Ignore self
      if (ignoreSelf && user === this.bot.user) return;

      // Guild check
      if (this.guildId && guild && guild.id !== this.guildId) return;

      // Permission check
      if (requiredPermission) {
        const level = message && message.member ? this.getMemberLevel(message.member) : null;
        const mergedOptions = this.getMergedOptions();
        const matchParams: IMatchParams = {
          level,
          userId: user && user.id,
          channelId: channel && channel.id,
          memberRoles: message.member && message.member.roles
        };

        if (!hasPermission(requiredPermission, mergedOptions, matchParams)) {
          return;
        }
      }

      // Call the original listener
      if (blocking) {
        // BLOCKING: Since the event listener queue waits for the promise to resolve,
        // return the promise from the listener
        return listener(...args);
      } else {
        // NON-BLOCKING: Return nothing, meaning the queue will just run listener()
        // and continue to the next listener immediately
        listener(...args);
        return;
      }
    };

    // The listener is registered on both the DJS client and our own Map that we use to unregister listeners on unload
    this.knub.addDiscordEventListener(eventName, wrappedListener);
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
  protected off(eventName: string, listener: ArbitraryFunction): void {
    this.knub.removeDiscordEventListener(eventName, listener);

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
        this.knub.removeDiscordEventListener(eventName, listener);
      });
    }

    this.eventHandlers.clear();
  }

  /**
   * Checks whether the specified plugin for the same guild as this plugin exists
   * Useful for interoperability between plugins
   */
  protected hasPlugin(name: string): boolean {
    const guildData = this.knub.getGuildData(this.guildId);
    return guildData.loadedPlugins.has(name);
  }

  /**
   * Returns the specified plugin for the same guild as this plugin
   * Useful for interoperability between plugins
   */
  protected getPlugin<T extends Plugin>(name: string): T {
    const guildData = this.knub.getGuildData(this.guildId);
    return guildData.loadedPlugins.get(name) as T;
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
    const matchedCommands = this.commands.findCommandsInString(msg.content, prefix);
    let onlyErrors = true;

    // Run each matching command sequentially
    for (const [i, command] of matchedCommands.entries()) {
      // Make sure this command is supposed to be run here
      if (msg.channel instanceof PrivateChannel) {
        if (!command.commandDefinition.options.allowDMs) {
          return;
        }
      } else if (!(msg.channel instanceof GuildChannel)) {
        return;
      }

      // Check permissions
      const requiredPermission = command.commandDefinition.options.requiredPermission;
      if (requiredPermission) {
        const mergedOptions = this.getMergedOptions();
        const level = msg.member && this.getMemberLevel(msg.member);
        const matchParams: IMatchParams = {
          level,
          userId: msg.author.id,
          channelId: msg.channel.id,
          memberRoles: msg.member && msg.member.roles
        };

        if (!hasPermission(requiredPermission, mergedOptions, matchParams)) {
          continue;
        }
      }

      // Convert arg types
      if (!command.error) {
        try {
          await convertArgumentTypes(command.args, msg, this.bot);
        } catch (e) {
          command.error = e;
        }
      }

      // Check for errors
      if (command.error) {
        // Only post errors if it's the last matched command and there have only been errors so far
        // in the set of matched commands. This way if there are multiple "overlapping" commands,
        // an error won't be reported when some of them match, nor will there be tons of spam if
        // all of them have errors.
        if (onlyErrors && i === matchedCommands.length - 1) {
          msg.channel.createMessage({ embed: errorEmbed(command.error.message) });
        }

        continue;
      }

      onlyErrors = false;

      // Run custom filters, if any
      let filterFailed = false;
      if (command.commandDefinition.options.filters) {
        for (const filterFn of command.commandDefinition.options.filters) {
          if (!await filterFn(msg, command)) {
            filterFailed = true;
            break;
          }
        }
      }

      if (filterFailed) {
        continue;
      }

      // Run the command
      if (command.commandDefinition.options.blocking) {
        // BLOCKING: Wait for this command handler to finish before continuing to the next one
        try {
          await runCommand(command, msg, this.bot);
        } catch (e) {
          if (e instanceof CommandValueTypeError) {
            msg.channel.createMessage({ embed: errorEmbed(e.message) });
            continue;
          } else {
            throw e;
          }
        }
      } else {
        // NON-BLOCKING: Run the command handler and continue to the next one immediately
        runCommand(command, msg, this.bot).catch(e => {
          if (e instanceof CommandValueTypeError) {
            msg.channel.createMessage({ embed: errorEmbed(e.message) });
          } else {
            throw e;
          }
        });
      }
    }
  }
}
