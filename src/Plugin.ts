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
  findMatchingCommandResultHasError,
  IMatchedCommand,
  IArgumentMap,
  IMatchedOptionMap,
  parseParameters
} from "knub-command-manager";
import {
  IBasePluginConfig,
  IGuildConfig,
  IPermissionLevelDefinitions,
  IPartialPluginOptions,
  IPluginOptions
} from "./configInterfaces";
import { ArbitraryFunction, eventToChannel, eventToGuild, eventToMessage, eventToUser, get, noop } from "./utils";
import {
  getCommandSignature,
  getDefaultPrefix,
  CommandContext,
  ICustomArgumentTypesMap,
  PluginCommandConfig,
  PluginCommandDefinition,
  CommandFn,
  CommandEventMiddleware
} from "./commandUtils";
import { Knub } from "./Knub";
import { getMatchingPluginConfig, IMatchParams, mergeConfig } from "./configUtils";
import { PluginError } from "./PluginError";
import { Lock, LockManager } from "./LockManager";
import { CooldownManager } from "./CooldownManager";
import { ILegacyCommandDecoratorData, IEventDecoratorData } from "./decorators";
import { baseParameterTypes } from "./baseParameterTypes";
import {
  getMemberLevel,
  getPluginDecoratorCommands,
  getPluginDecoratorEventListeners,
  getPluginLegacyDecoratorCommands,
  getPluginLegacyDecoratorEventListeners
} from "./pluginUtils";
import cloneDeep from "lodash.clonedeep";
import { IExtendedMatchParams, PluginConfigManager } from "./PluginConfigManager";
import { PluginClassData, PluginData } from "./PluginData";
import { PluginCommandManager } from "./PluginCommandManager";
import { PluginEventManager } from "./PluginEventManager";
import {
  onlyDM,
  onlyGroup,
  onlyPluginGuild,
  ignoreSelf as ignoreSelfFilter,
  requirePermission,
  EventMiddleware,
  chainMiddleware,
  lock
} from "./pluginEventMiddleware";
import { deprecationWarning } from "./logger";

export interface IRegisteredCommand {
  command: PluginCommandDefinition;
  handler: TCommandHandler;
}

/**
 * @deprecated Used for deprecated Plugin.addCommand(). See Plugin.addCommand() deprecation notes for more details.
 */
export interface ICommandHandlerArgsArg {
  [key: string]: any;
}

/**
 * @deprecated Used for deprecated Plugin.addCommand(). See Plugin.addCommand() deprecation notes for more details.
 */
export type TCommandHandler = (
  msg: Message,
  argsToPass: ICommandHandlerArgsArg,
  command: PluginCommandDefinition
) => void | Promise<void>;

/**
 * Base class for Knub plugins
 */
export class Plugin<TConfig extends {} = IBasePluginConfig, TCustomOverrideCriteria extends {} = {}> {
  // Internal name for the plugin - REQUIRED
  public static pluginName: string;

  // Arbitrary info about the plugin, e.g. description
  // This property is mainly here to set a convention, as it's not actually used in Knub itself
  public static pluginInfo: any;

  public static defaultOptions: IPluginOptions<any, any>;

  // Custom argument types for commands
  protected static customArgumentTypes: ICustomArgumentTypesMap = {};

  // Guild info - these will be null for global plugins
  protected readonly guildId: string;
  protected readonly guild: Guild;
  protected readonly guildConfig: IGuildConfig;

  protected readonly bot: Client;

  private pluginData: PluginClassData;
  protected config: PluginConfigManager<TConfig, TCustomOverrideCriteria>;
  protected locks: LockManager;
  protected commands: PluginCommandManager;
  protected events: PluginEventManager;
  protected cooldowns: CooldownManager;

  /**
   * @deprecated Kept here for backwards compatibility. Not recommended to use directly.
   */
  protected knub: Knub;

  /**
   * Actual plugin name when the plugin was loaded. This is the same as pluginName unless overridden elsewhere.
   * @deprecated Always the same as pluginName
   */
  public runtimePluginName: string;

  constructor(pluginData: PluginClassData<TConfig, TCustomOverrideCriteria>) {
    this.pluginData = pluginData;

    this.bot = pluginData.client;
    this.guildId = pluginData.guild?.id;
    this.guild = pluginData.guild;
    this.guildConfig = pluginData.guildConfig;
    this.cooldowns = pluginData.cooldowns;
    this.locks = pluginData.locks;
    this.knub = pluginData.knub;

    // Backwards compatibility
    this.runtimePluginName = (this.constructor as typeof Plugin).pluginName;
  }

  /**
   * Run basic initialization and the plugin-defined onLoad() function
   */
  public async runLoad(): Promise<any> {
    // Run plugin-defined onLoad() function
    await this.onLoad();

    // Register decorator-defined commands
    const decoratorCommands = getPluginDecoratorCommands(this.constructor as typeof Plugin);
    for (const commandData of decoratorCommands) {
      const createdCommand = this.commands.create({
        trigger: commandData.trigger,
        parameters: commandData.parameters,
        config: commandData.config
      });
      commandData._matcherMiddleware = createdCommand.middleware;
      this.events.on("messageCreate", this[commandData._prop].bind(this));
    }

    // Register decorator-defined event listeners
    const decoratorEventListeners = getPluginDecoratorEventListeners(this.constructor as typeof Plugin);
    for (let eventListener of decoratorEventListeners) {
      eventListener = cloneDeep(eventListener);
      this.events.on(eventListener.eventName, this[eventListener._prop].bind(this), eventListener.opts);
    }

    // [LEGACY] Register legacy decorator-defined commands
    const legacyDecoratorCommands = getPluginLegacyDecoratorCommands(this.constructor as typeof Plugin);
    for (let command of legacyDecoratorCommands) {
      command = cloneDeep(command);
      this.addCommand(command.trigger, command.parameters, this[command._prop].bind(this), command.config);
    }

    // [LEGACY] Register legacy decorator-defined event listeners
    const legacyDecoratorEventListeners = getPluginLegacyDecoratorEventListeners(this.constructor as typeof Plugin);
    for (let eventListener of legacyDecoratorEventListeners) {
      eventListener = cloneDeep(eventListener);
      this.on(
        eventListener.eventName,
        this[eventListener._prop].bind(this),
        eventListener.restrict,
        eventListener.ignoreSelf,
        eventListener.requiredPermission,
        eventListener.locks
      );
    }
  }

  /**
   * Clear event handlers and run plugin-defined onUnload() function
   */
  public async runUnload(): Promise<any> {
    await this.onUnload();
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
   * Function to resolve custom override criteria in the plugin's config.
   * Remember to also set TCustomOverrideCriteria appropriately.
   */
  protected matchCustomOverrideCriteria(criteria: TCustomOverrideCriteria, matchParams: IMatchParams): boolean {
    // Implemented by plugin
    return true;
  }

  /**
   * Returns this plugin's default configuration
   */
  protected getDefaultOptions(): IPluginOptions<TConfig, TCustomOverrideCriteria> {
    // Implemented by plugin
    return {} as IPluginOptions<TConfig, TCustomOverrideCriteria>;
  }

  /**
   * Returns the base config from the merged options that's currently being used without applying any overrides
   *
   * @deprecated Use this.config.get() instead
   */
  protected getConfig(): TConfig {
    return this.config.get();
  }

  /**
   * Returns the plugin's config with overrides matching the given match params applied to it
   *
   * @deprecated Use this.config.getMatchingConfig() instead
   */
  protected getMatchingConfig(matchParams: IExtendedMatchParams = {}): TConfig {
    return this.config.getMatchingConfig(matchParams);
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

    return this.config.getMatchingConfig({
      level,
      userId: memberId,
      channelId,
      categoryId,
      memberRoles: member ? member.roles : []
    });
  }

  /**
   * Returns the plugin's config with overrides matching the given message applied to it
   *
   * @deprecated Use this.config.getConfigForMsg() instead
   */
  protected getConfigForMsg(msg: Message): TConfig {
    deprecationWarning("Plugin.getConfigForMsg()", "Use this.config.getConfigForMsg() instead");
    return this.config.getForMessage(msg);
  }

  /**
   * Returns the plugin's config with overrides matching the given channel applied to it
   *
   * @deprecated Use this.config.getForChannel() instead
   */
  protected getConfigForChannel(channel: Channel): TConfig {
    deprecationWarning("Plugin.getConfigForChannel()", "Use this.config.getForChannel() instead.");
    return this.config.getForChannel(channel);
  }

  /**
   * Returns the plugin's config with overrides matching the given user applied to it
   *
   * @deprecated Use this.config.getForUser() instead
   */
  protected getConfigForUser(user: User): TConfig {
    deprecationWarning("Plugin.getConfigForUser()", "Use this.config.getForUser() instead.");
    return this.config.getForUser(user);
  }

  /**
   * Returns the plugin's config with overrides matching the given member applied to it
   *
   * @deprecated Use this.config.getForMember() instead
   */
  protected getConfigForMember(member: Member): TConfig {
    deprecationWarning("Plugin.getConfigForMember()", "Use this.config.getForMember() instead.");
    return this.config.getForMember(member);
  }

  /**
   * Returns the member's permission level
   */
  protected getMemberLevel(member: Partial<Member>): number {
    return getMemberLevel(this.guildConfig.levels, member as Member);
  }

  /**
   * Wrapper for getting a matching config and checking the permission value is true
   */
  protected hasPermission(requiredPermission: string, matchParams: IExtendedMatchParams): boolean {
    const config = this.config.getMatchingConfig(matchParams);
    return get(config, requiredPermission) === true;
  }

  /**
   * @deprecated Use Plugin.commands.add() or the cmd() decorator instead
   */
  protected addCommand(
    trigger: string,
    parameters: string | IParameter[],
    handler: TCommandHandler,
    config: PluginCommandConfig
  ) {
    deprecationWarning("Plugin.addCommand()", "Use Plugin.commands.add() or the cmd() decorator instead.");

    // Backwards compatibility wrapper
    const wrapper: CommandEventMiddleware = ([msg], { command, args }) => {
      return handler(msg, args, command as PluginCommandDefinition);
    };

    const createdCommand = this.commands.create({
      trigger,
      parameters: typeof parameters === "string" ? parseParameters(parameters) : parameters,
      config
    });

    this.events.on("messageCreate", chainMiddleware([createdCommand.middleware, wrapper]));
  }

  protected removeCommand(id: number) {
    this.commands.remove(id);
  }

  public getRegisteredCommands(): PluginCommandDefinition[] {
    return this.commands.getAll();
  }

  /**
   * Adds a guild-specific event listener for the given event
   * @deprecated Use Plugin.events.on() or the ev() decorator instead
   */
  protected on(
    eventName: string,
    listener: ArbitraryFunction,
    restrict: string = "guild",
    ignoreSelf: boolean = true,
    requiredPermission: string = null,
    locks: string | string[] = []
  ): () => void {
    deprecationWarning("Plugin.on()", "Use Plugin.events.on() or the ev() decorator instead.");

    // For backwards compatibility, convert the listener to the original signature
    const convertedlistener = args => {
      return listener(...args);
    };

    let chain: EventMiddleware = noop;

    if (restrict === "guild") {
      chain = chainMiddleware([chain, onlyPluginGuild()]);
    } else if (restrict === "dm") {
      chain = chainMiddleware([chain, onlyDM()]);
    } else if (restrict === "group") {
      chain = chainMiddleware([chain, onlyGroup()]);
    }

    if (ignoreSelf) {
      chain = chainMiddleware([chain, ignoreSelfFilter()]);
    }

    if (requiredPermission) {
      chain = chainMiddleware([chain, requirePermission(requiredPermission)]);
    }

    if (locks && locks.length) {
      chain = chainMiddleware([chain, lock(locks, true)]);
    }

    chain = chainMiddleware([chain, convertedlistener]);

    const finalListener = this.events.on(eventName, chain, {
      // We apply these manually above based on arguments, so ignore the implicit restrictions
      respectImplicitGuildRestriction: false,
      respectImplicitIgnoreSelf: false,
      respectImplicitIgnoreBots: false
    });

    return () => {
      this.events.off(eventName, finalListener);
    };
  }

  /**
   * Removes the given listener from the event
   */
  protected off(eventName: string, listener: ArbitraryFunction): void {
    this.events.off(eventName, listener);
  }

  /**
   * Clears all event listeners registered with on()
   */
  protected clearEventHandlers(): void {
    this.events.clearAllListeners();
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

  protected sendErrorMessage(channel: TextableChannel, body: string) {
    this.knub.sendErrorMessage(channel, body);
  }

  protected sendSuccessMessage(channel: TextableChannel, body: string) {
    this.knub.sendSuccessMessage(channel, body);
  }
}
