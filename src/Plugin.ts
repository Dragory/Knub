import "reflect-metadata";
import {
  Channel,
  Client,
  PrivateChannel,
  GroupChannel,
  GuildChannel,
  Guild,
  Member,
  Message,
  User,
  TextableChannel
} from "eris";
const at = require("lodash.at");

import { CommandManager, ICommandConfig } from "./CommandManager";
import {
  IBasePluginConfig,
  IGuildConfig,
  IPermissionLevelDefinitions,
  IPartialPluginOptions,
  IPluginOptions
} from "./configInterfaces";
import { ArbitraryFunction, eventToChannel, eventToGuild, eventToMessage, eventToUser } from "./utils";
import {
  convertArgumentTypes,
  convertOptionTypes,
  getCommandSignature,
  getDefaultPrefix,
  ICustomArgumentTypes,
  runCommand
} from "./commandUtils";
import { Knub } from "./Knub";
import { getMatchingPluginOptions, IMatchParams, mergeConfig } from "./configUtils";
import { PluginError } from "./PluginError";
import { Lock, LockManager } from "./LockManager";
import { CooldownManager } from "./CooldownManager";

export interface IExtendedMatchParams extends IMatchParams {
  channelId?: string;
  member?: Member;
  message?: Message;
}

/**
 * Base class for Knub plugins
 */
export class Plugin<TConfig extends {} = IBasePluginConfig> {
  // Guild info - these will be null for global plugins
  public guildId: string;
  public guild: Guild;

  // Internal name for the plugin - REQUIRED
  public static pluginName: string;

  // Actual plugin name when the plugin was loaded. This is the same as pluginName unless overridden elsewhere.
  public runtimePluginName: string;

  // Plugin name and description for e.g. dashboards
  public name: string;
  public description: string;

  protected bot: Client;
  protected readonly guildConfig: IGuildConfig;
  protected readonly pluginOptions: IPartialPluginOptions;
  protected mergedPluginOptions: IPluginOptions;

  protected knub: Knub;

  protected locks: LockManager;

  protected commands: CommandManager;
  protected eventHandlers: Map<string, any[]>;

  protected cooldowns: CooldownManager;

  protected customArgumentTypes: ICustomArgumentTypes = {};

  constructor(
    bot: Client,
    guildId: string,
    guildConfig: IGuildConfig,
    pluginOptions: IPartialPluginOptions,
    runtimePluginName: string,
    knub: Knub,
    locks: LockManager
  ) {
    this.bot = bot;
    this.guildId = guildId;
    this.guildConfig = guildConfig;
    this.pluginOptions = pluginOptions;
    this.runtimePluginName = runtimePluginName;
    this.locks = locks;

    this.knub = knub;

    this.guild = this.guildId ? this.bot.guilds.get(this.guildId) : null;

    this.commands = new CommandManager();
    this.eventHandlers = new Map();

    this.cooldowns = new CooldownManager();

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
      const locks = Reflect.getMetadata("locks", this, prop);
      const cooldown: {
        time: number;
        permission: string;
      } = Reflect.getMetadata("cooldown", this, prop);

      // Command handlers from decorators
      const metaCommands = Reflect.getMetadata("commands", this, prop);
      if (metaCommands) {
        for (const metaCommand of metaCommands) {
          const commandConfig: ICommandConfig = metaCommand.options || {};

          if (requiredPermission && requiredPermission.permission) {
            commandConfig.requiredPermission = requiredPermission.permission;
          }

          commandConfig.locks = locks || [];
          if (cooldown) {
            commandConfig.cooldown = cooldown.time;
            commandConfig.cooldownPermission = cooldown.permission;
          }

          this.commands.add(metaCommand.command, metaCommand.parameters, value.bind(this), commandConfig);
        }
      }

      // Event listener from decorator
      const metaEvents = Reflect.getMetadata("events", this, prop);
      if (metaEvents) {
        for (const metaEvent of metaEvents) {
          this.on(
            metaEvent.eventName,
            value.bind(this),
            metaEvent.restrict,
            metaEvent.ignoreSelf,
            requiredPermission && requiredPermission.permission,
            locks || []
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
  protected getDefaultOptions(): IPluginOptions<TConfig> {
    // Implemented by plugin
    return {} as IPluginOptions<TConfig>;
  }

  /**
   * Returns the plugin's default options merged with its loaded options
   */
  protected getMergedOptions(): IPluginOptions<TConfig> {
    if (!this.mergedPluginOptions) {
      const defaultOptions = this.getDefaultOptions();
      this.mergedPluginOptions = {
        config: mergeConfig({}, defaultOptions.config || {}, this.pluginOptions.config || {}),
        overrides: this.pluginOptions["=overrides"]
          ? this.pluginOptions["=overrides"]
          : (this.pluginOptions.overrides || []).concat(defaultOptions.overrides || [])
      };
    }

    return this.mergedPluginOptions as IPluginOptions<TConfig>;
  }

  /**
   * Resets the cached mergedPluginOptions object
   */
  protected clearMergedOptions() {
    this.mergedPluginOptions = null;
  }

  /**
   * Returns the base config from the merged options that's currently being used without applying any overrides
   */
  protected getConfig(): TConfig {
    const mergedOptions = this.getMergedOptions();
    return mergedOptions.config;
  }

  /**
   * Returns the plugin's config with overrides matching the given match params applied to it
   */
  protected getMatchingConfig(matchParams: IExtendedMatchParams = {}): TConfig {
    const message = matchParams.message;

    // Passed userId -> passed member's id -> passed message's author's id
    const userId =
      matchParams.userId ||
      (matchParams.member && matchParams.member.id) ||
      (message && message.author && message.author.id);

    // Passed channelId -> passed message's channel id
    const channelId = matchParams.channelId || (message && message.channel && message.channel.id);

    // Passed category id -> passed message's channel's category id
    const categoryId =
      matchParams.categoryId || (message && message.channel && (message.channel as GuildChannel).parentID);

    // Passed member -> passed message's member
    const member = matchParams.member || (message && message.member);

    // Passed level -> passed member's level
    const level = matchParams.level != null ? matchParams.level : member ? this.getMemberLevel(member) : null;

    // Passed roles -> passed member's roles
    const memberRoles = matchParams.memberRoles || (member && member.roles);

    const finalMatchParams: IMatchParams = {
      level,
      userId,
      channelId,
      categoryId,
      memberRoles
    };

    const mergedOptions = this.getMergedOptions();
    const matchingOptions = getMatchingPluginOptions<IPluginOptions<TConfig>>(mergedOptions, finalMatchParams);
    return matchingOptions.config;
  }

  /**
   * Returns the plugin's config with overrides matching the given member id and channel id applied to it
   */
  protected getConfigForMemberIdAndChannelId(memberId: string, channelId: string): TConfig {
    const guildId = this.bot.channelGuildMap[channelId];
    const guild = this.bot.guilds.get(guildId);
    const member = guild.members.get(memberId);
    const level = member ? this.getMemberLevel(member) : null;
    const categoryId = guild.channels.has(channelId) ? guild.channels.get(channelId).parentID : null;

    return this.getMatchingConfig({
      level,
      userId: memberId,
      channelId,
      categoryId,
      memberRoles: member ? member.roles : []
    });
  }

  /**
   * Returns the plugin's config with overrides matching the given message applied to it
   */
  protected getConfigForMsg(msg: Message): TConfig {
    const level = msg.member ? this.getMemberLevel(msg.member) : null;
    return this.getMatchingConfig({
      level,
      userId: msg.author.id,
      channelId: msg.channel.id,
      categoryId: (msg.channel as GuildChannel).parentID,
      memberRoles: msg.member ? msg.member.roles : []
    });
  }

  /**
   * Returns the plugin's config with overrides matching the given channel applied to it
   */
  protected getConfigForChannel(channel: Channel): TConfig {
    return this.getMatchingConfig({
      channelId: channel.id,
      categoryId: (channel as GuildChannel).parentID
    });
  }

  /**
   * Returns the plugin's config with overrides matching the given user applied to it
   */
  protected getConfigForUser(user: User): TConfig {
    return this.getMatchingConfig({
      userId: user.id
    });
  }

  /**
   * Returns the plugin's config with overrides matching the given member applied to it
   */
  protected getConfigForMember(member: Member): TConfig {
    const level = this.getMemberLevel(member);
    return this.getMatchingConfig({
      level,
      userId: member.user.id,
      memberRoles: member.roles
    });
  }

  /**
   * Returns the member's permission level
   */
  protected getMemberLevel(member: Partial<Member>): number {
    if (this.guild.ownerID === member.id) {
      return 99999;
    }

    const levels: IPermissionLevelDefinitions = this.guildConfig.levels;

    for (const id in levels) {
      if (member.id === id || (member.roles && member.roles.includes(id))) {
        return levels[id];
      }
    }

    return 0;
  }

  /**
   * Wrapper for getting a matching config and checking the permission value is true
   */
  protected hasPermission(requiredPermission: string, matchParams: IExtendedMatchParams): boolean {
    const config = this.getMatchingConfig(matchParams);
    return at(config, requiredPermission)[0] === true;
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
    locks: string | string[] = []
  ): () => void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }

    // Create a wrapper for the listener that checks:
    // 1) That the event matches the restrict param (guild/dm/group)
    // 2) That we ignore our own events if ignoreSelf is true
    // 3) That the event's guild (if present) matches this plugin's guild
    // 4) If the event has a message, that the message author has the permissions to trigger events
    const wrappedListener = async (...args: any[]): Promise<void> => {
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
        const userId = user && user.id;
        const channelId = channel && channel.id;
        const categoryId = channel && (channel as GuildChannel).parentID;
        if (
          !this.hasPermission(requiredPermission, {
            message,
            userId,
            channelId,
            categoryId
          })
        ) {
          return;
        }
      }

      let lock: Lock;
      if (locks.length) {
        lock = await this.locks.acquire(locks);
        if (lock.interrupted) return;

        // Add the lock as the final argument for the listener
        args.push(lock);
      }

      const timerDone =
        listener.name !== "bound runCommandsInMessage" ? this.knub.startPerformanceDebugTimer(listener.name) : null;

      // Call the original listener
      try {
        await listener(...args);
      } catch (err) {
        throw new PluginError(err);
      } finally {
        if (lock) lock.unlock();
        timerDone && timerDone(); // tslint:disable-line
      }
    };

    // The listener is registered on both the Eris client and our own Map that we use to unregister listeners on unload
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
  protected off(eventName: string, listener: ArbitraryFunction): void {
    this.bot.off(eventName, listener);

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
        this.bot.off(eventName, listener);
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
  protected async runCommandsInMessage(msg: Message): Promise<void> {
    // Ignore messages without text (e.g. images, embeds, etc.)
    if (msg.content == null || msg.content.trim() === "") {
      return;
    }

    const prefix = this.guildConfig.prefix || getDefaultPrefix(this.bot);
    const matchedCommands = this.commands.findCommandsInString(msg.content, prefix);

    // NOTE: "Variable initializer is redundant" inspection in WebStorm is incorrect here
    let onlyErrors = true;
    let lastError;

    // Attempt to run each matching command.
    // Only one command - the first one that passes all checks below - is actually run.
    for (const command of matchedCommands) {
      // Make sure this command is supposed to be run here
      if (msg.channel instanceof PrivateChannel) {
        if (!command.commandDefinition.config.allowDMs) {
          return;
        }
      } else if (!(msg.channel instanceof GuildChannel)) {
        return;
      }

      // Check permissions
      const requiredPermission = command.commandDefinition.config.requiredPermission;
      if (requiredPermission && !this.hasPermission(requiredPermission, { message: msg })) {
        continue;
      }

      // Run custom pre-filters, if any
      let preFilterFailed = false;
      if (command.commandDefinition.config.filters) {
        for (const filterFn of command.commandDefinition.config.preFilters) {
          const boundFilterFn = filterFn.bind(this);
          if (!(await boundFilterFn(msg, command, this))) {
            preFilterFailed = true;
            break;
          }
        }
      }

      if (preFilterFailed) {
        continue;
      }

      // Use both global custom argument types + plugin-specific custom argument types
      const customArgumentTypes: ICustomArgumentTypes = {
        ...this.knub.getCustomArgumentTypes(),
        ...this.customArgumentTypes
      };

      // Convert arg types
      if (!command.error) {
        try {
          await convertArgumentTypes(command.args, msg, this.bot, customArgumentTypes);
        } catch (e) {
          command.error = e;
        }
      }

      // Convert opt types
      if (!command.error) {
        try {
          await convertOptionTypes(command.opts, msg, this.bot, customArgumentTypes);
        } catch (e) {
          command.error = e;
        }
      }

      // Keep track of errors
      if (command.error) {
        lastError = command.error;
        continue;
      }

      // Run custom filters, if any
      let filterFailed = false;
      if (command.commandDefinition.config.filters) {
        for (const filterFn of command.commandDefinition.config.filters) {
          const boundFilterFn = filterFn.bind(this);
          if (!(await boundFilterFn(msg, command, this))) {
            filterFailed = true;
            break;
          }
        }
      }

      if (filterFailed) {
        lastError = null;
        continue;
      }

      // Check for cooldowns
      if (command.commandDefinition.config.cooldown) {
        const cdKey = `${command.name}-${msg.author.id}`;
        let cdApplies = true;
        if (command.commandDefinition.config.cooldownPermission) {
          cdApplies = !this.hasPermission(command.commandDefinition.config.cooldownPermission, { message: msg });
        }

        if (cdApplies && this.cooldowns.isOnCooldown(cdKey)) {
          // We're on cooldown, bail out
          onlyErrors = false;
          break;
        }

        this.cooldowns.setCooldown(cdKey, command.commandDefinition.config.cooldown);
      }

      // Wait for locks, if any, and bail out if the lock has been interrupted
      if (command.commandDefinition.config.locks) {
        command.lock = await this.locks.acquire(command.commandDefinition.config.locks);
        if (command.lock.interrupted) {
          onlyErrors = false;
          break;
        }
      }

      const timerDone = this.knub.startPerformanceDebugTimer(`cmd: ${command.name}`);

      // Run the command
      await runCommand(command, msg, this.bot);
      command.lock.unlock();
      timerDone();

      // A command was run: don't continue trying to run the rest of the matched commands
      onlyErrors = false;
      break;
    }

    // Only post the last error in the matched set of commands. This way if there are multiple "overlapping" commands,
    // an error won't be reported when some of them match, nor will there be tons of spam if all of them have errors.
    if (onlyErrors && lastError) {
      const usageLines = matchedCommands.map(cmd => {
        const usageLine = getCommandSignature(
          cmd.prefix,
          cmd.name,
          cmd.commandDefinition.parameters,
          cmd.commandDefinition.config.options
        );
        return `\`${usageLine}\``;
      });

      const errorMessage =
        usageLines.length === 1
          ? `${lastError.message}\nUsage: ${usageLines[0]}`
          : `${lastError.message}\n\nUsage:\n${usageLines.join("\n")}`;

      this.sendErrorMessage(msg.channel, errorMessage);
    }
  }

  protected sendErrorMessage(channel: TextableChannel, body: string) {
    this.knub.sendErrorMessage(channel, body);
  }

  protected sendSuccessMessage(channel: TextableChannel, body: string) {
    this.knub.sendSuccessMessage(channel, body);
  }
}
