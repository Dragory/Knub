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

import {
  CommandManager,
  ICommandConfig,
  IParameter,
  ICommandDefinition,
  findMatchingCommandResultHasError
} from "knub-command-manager";
import {
  IBasePluginConfig,
  IGuildConfig,
  IPermissionLevelDefinitions,
  IPartialPluginOptions,
  IPluginOptions
} from "./configInterfaces";
import { ArbitraryFunction, eventToChannel, eventToGuild, eventToMessage, eventToUser, get } from "./utils";
import {
  getCommandSignature,
  getDefaultPrefix,
  ICommandContext,
  ICommandExtraData,
  ICustomArgumentTypesMap,
  IPluginCommandConfig,
  IPluginCommandDefinition,
  IPluginCommandManager,
  TCommandHandler
} from "./commandUtils";
import { Knub } from "./Knub";
import { getMatchingPluginOptions, IMatchParams, mergeConfig } from "./configUtils";
import { PluginError } from "./PluginError";
import { Lock, LockManager } from "./LockManager";
import { CooldownManager } from "./CooldownManager";
import { ICommandDecoratorData, IEventDecoratorData } from "./decorators";
import { baseParameterTypes } from "./baseParameterTypes";
import { getPluginDecoratorCommands, getPluginDecoratorEventListeners } from "./pluginUtils";

export interface IExtendedMatchParams extends IMatchParams {
  channelId?: string;
  member?: Member;
  message?: Message;
}

export interface IRegisteredCommand {
  command: IPluginCommandDefinition;
  handler: TCommandHandler;
}

/**
 * Base class for Knub plugins
 */
export class Plugin<TConfig extends {} = IBasePluginConfig> {
  // Internal name for the plugin - REQUIRED
  public static pluginName: string;

  // Arbitrary info about the plugin, e.g. description
  // This property is mainly here to set a convention, as it's not actually used in Knub itself
  public static pluginInfo: any;

  protected static customArgumentTypes: ICustomArgumentTypesMap = {};

  // Guild info - these will be null for global plugins
  public readonly guildId: string;
  public guild: Guild;

  // Actual plugin name when the plugin was loaded. This is the same as pluginName unless overridden elsewhere.
  public runtimePluginName: string;

  protected readonly bot: Client;
  protected readonly guildConfig: IGuildConfig;
  protected readonly pluginOptions: IPartialPluginOptions;
  protected mergedPluginOptions: IPluginOptions;

  protected readonly knub: Knub;

  protected locks: LockManager;

  private commandManager: IPluginCommandManager;
  private commandHandlers: Map<number, TCommandHandler>;
  protected eventHandlers: Map<string, any[]>;

  protected cooldowns: CooldownManager;

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
    this.knub = knub;
    this.locks = locks;
  }

  /**
   * Run basic initialization and the plugin-defined onLoad() function
   */
  public async runLoad(): Promise<any> {
    // Basic initialization
    this.guild = this.guildId ? this.bot.guilds.get(this.guildId) : null;

    this.commandManager = new CommandManager<ICommandContext, ICommandExtraData>({
      prefix: this.guildConfig.prefix || getDefaultPrefix(this.bot),
      types: {
        ...baseParameterTypes,
        ...this.knub.getCustomArgumentTypes(),
        ...(this.constructor as typeof Plugin).customArgumentTypes
      }
    });
    this.commandHandlers = new Map();

    this.eventHandlers = new Map();

    this.cooldowns = new CooldownManager();

    // Run plugin-defined onLoad() function
    await this.onLoad();

    // Register decorator-defined commands
    const decoratorCommands = getPluginDecoratorCommands(this.constructor as typeof Plugin);
    for (const command of decoratorCommands) {
      this.addCommand(command.trigger, command.parameters, this[command._prop].bind(this), command.config);
    }

    // Register decorator-defined event listeners
    const decoratorEventListeners = getPluginDecoratorEventListeners(this.constructor as typeof Plugin);
    for (const eventListener of decoratorEventListeners) {
      this.on(
        eventListener.eventName,
        this[eventListener._prop].bind(this),
        eventListener.restrict,
        eventListener.ignoreSelf,
        eventListener.requiredPermission,
        eventListener.locks
      );
    }

    this.registerCommandMessageListener();
  }

  /**
   * Clear event handlers and run plugin-defined onUnload() function
   */
  public async runUnload(): Promise<any> {
    this.clearEventHandlers();
    await this.onUnload();
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
    this.on("messageCreate", this.runCommandFromMessage.bind(this));
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
        config: mergeConfig(defaultOptions.config || {}, this.pluginOptions.config || {}),
        overrides: this.pluginOptions.replaceDefaultOverrides
          ? this.pluginOptions.overrides || []
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
    return get(config, requiredPermission) === true;
  }

  protected addCommand(
    trigger: string | RegExp,
    parameters: string | IParameter[],
    handler: TCommandHandler,
    config: IPluginCommandConfig
  ) {
    config.preFilters = config.preFilters || [];
    config.preFilters.unshift(
      // Make sure the command is in a guild channel unless explicitly allowed for DMs
      (cmd: IPluginCommandDefinition, context: ICommandContext) => {
        if (context.message.channel instanceof PrivateChannel) {
          if (!cmd.config.extra.allowDMs) {
            return false;
          }
        } else if (!(context.message.channel instanceof GuildChannel)) {
          return false;
        }

        return true;
      },

      // Check required permissions
      (cmd: IPluginCommandDefinition, context: ICommandContext) => {
        const requiredPermission = cmd.config.extra.requiredPermission;
        if (requiredPermission && !this.hasPermission(requiredPermission, { message: context.message })) {
          return false;
        }

        return true;
      }
    );

    config.postFilters = config.postFilters || [];
    config.postFilters.unshift(
      // Check for cooldowns
      (cmd: IPluginCommandDefinition, context: ICommandContext) => {
        if (cmd.config.extra.cooldown) {
          const cdKey = `${cmd.id}-${context.message.author.id}`;
          let cdApplies = true;
          if (cmd.config.extra.cooldownPermission) {
            cdApplies = !this.hasPermission(cmd.config.extra.cooldownPermission, { message: context.message });
          }

          if (cdApplies && this.cooldowns.isOnCooldown(cdKey)) {
            // We're on cooldown
            return false;
          }

          this.cooldowns.setCooldown(cdKey, cmd.config.extra.cooldown);
        }

        return true;
      },

      // Wait for locks, if any, and bail out if the lock has been interrupted
      async (cmd: IPluginCommandDefinition, context: ICommandContext) => {
        if (cmd.config.extra.locks) {
          cmd.config.extra._lock = await this.locks.acquire(cmd.config.extra.locks);
          if (cmd.config.extra._lock.interrupted) {
            return false;
          }
        }

        return true;
      }
    );

    const command = this.commandManager.add(trigger, parameters, config);
    this.commandHandlers.set(command.id, handler);
  }

  protected removeCommand(id: number) {
    this.commandManager.remove(id);
    this.commandHandlers.delete(id);
  }

  public getRegisteredCommands(): IRegisteredCommand[] {
    const commands = this.commandManager.getAll();
    return commands.map(command => ({ command, handler: this.commandHandlers.get(command.id) }));
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

  protected async runCommandFromMessage(msg: Message): Promise<void> {
    // Ignore messages without text (e.g. images, embeds, etc.)
    if (msg.content == null || msg.content.trim() === "") {
      return;
    }

    const matchedCommand = await this.commandManager.findMatchingCommand(msg.content, {
      message: msg,
      bot: this.bot,
      plugin: this
    });

    if (matchedCommand == null) {
      // No command matched the message
      return;
    }

    if (findMatchingCommandResultHasError(matchedCommand)) {
      // There was a matching command, but we encountered an error
      const usageLine = getCommandSignature(matchedCommand.command);
      this.sendErrorMessage(msg.channel, `${matchedCommand.error}\nUsage: ${usageLine}`);
      return;
    }

    const timerDone = this.knub.startPerformanceDebugTimer(
      `cmd: ${matchedCommand.triggers[0].source} (${matchedCommand.id})`
    );

    // Run the command
    const handler = this.commandHandlers.get(matchedCommand.id);
    await handler(msg, { ...matchedCommand.args, ...matchedCommand.opts }, matchedCommand);
    timerDone();
  }

  protected sendErrorMessage(channel: TextableChannel, body: string) {
    this.knub.sendErrorMessage(channel, body);
  }

  protected sendSuccessMessage(channel: TextableChannel, body: string) {
    this.knub.sendSuccessMessage(channel, body);
  }
}
