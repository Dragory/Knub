import { Client, Guild, Member } from "eris";
import { BaseConfig, ConfigPreprocessorFn, ConfigValidatorFn, PluginOptions } from "../config/configTypes";
import { CommandContext } from "../commands/commandUtils";
import { CustomOverrideMatcher } from "../config/configUtils";
import { LockManager } from "../locks/LockManager";
import { CooldownManager } from "../cooldowns/CooldownManager";
import { getMemberLevel, ResolvablePlugin } from "./pluginUtils";
import { PluginConfigManager } from "../config/PluginConfigManager";
import { PluginData } from "./PluginData";
import { PluginCommandManager } from "../commands/PluginCommandManager";
import { PluginEventManager } from "../events/PluginEventManager";
import { CommandBlueprint } from "../commands/CommandBlueprint";
import { EventListenerBlueprint } from "../events/EventListenerBlueprint";
import { BasePluginType } from "./pluginTypes";
import { TTypeConverterFn } from "knub-command-manager";

/**
 * Base class for Knub plugins
 */
export abstract class PluginClass<TPluginType extends BasePluginType = BasePluginType> {
  /**
   * **[Required]** Internal name for the plugin
   */
  public static pluginName: string;

  /**
   * Arbitrary info about the plugin, e.g. description.
   * This property is mainly here to set a convention, as it's not actually used in Knub itself.
   */
  public static pluginInfo: any;

  /**
   * Other plugins that are required for this plugin to function. They will be loaded before this plugin.
   */
  public static dependencies: ResolvablePlugin[];

  /**
   * The plugin's default options, including overrides
   */
  public static defaultOptions: PluginOptions<any>;

  /**
   * Commands that are automatically registered on plugin load
   */
  public static commands: Array<CommandBlueprint<any, any>>;

  /**
   * Event listeners that are automatically registered on plugin load
   */
  public static events: Array<EventListenerBlueprint<any>>;

  /**
   * Custom argument types for commands
   */
  public static customArgumentTypes: Record<string, TTypeConverterFn<any, CommandContext<any>>>;

  /**
   * If this plugin includes any custom overrides, this function evaluates them
   */
  public static customOverrideMatcher: CustomOverrideMatcher<any>;

  /**
   * Preprocesses the plugin's config after it's been merged with the default options
   * but before it's validated by `this.configValidator`.
   *
   * (Merge with default options) -> configPreprocessor -> configValidator
   */
  public static configPreprocessor: ConfigPreprocessorFn<any>;

  /**
   * Validates the plugin's config after it's been merged with the default options
   * and run through `this.configPreprocessor`.
   *
   * (Merge with default options) -> configPreprocessor -> configValidator
   */
  public static configValidator: ConfigValidatorFn<any>;

  // Guild info - these will be null for global plugins
  public readonly guildId: string;
  protected readonly guild: Guild;
  protected readonly guildConfig: BaseConfig<TPluginType>;

  protected readonly client: Client;

  protected pluginData: PluginData<TPluginType>;
  protected config: PluginConfigManager<TPluginType>;
  protected locks: LockManager;
  protected commandManager: PluginCommandManager<TPluginType>;
  protected eventManager: PluginEventManager<TPluginType>;
  protected cooldowns: CooldownManager;

  public static _decoratorValuesTransferred = false;

  constructor(pluginData: PluginData<TPluginType>) {
    this.pluginData = pluginData;

    this.client = pluginData.client;
    this.guildId = pluginData.guild?.id;
    this.guild = pluginData.guild;
    this.guildConfig = pluginData.guildConfig;
    this.config = pluginData.config;
    this.eventManager = pluginData.events;
    this.commandManager = pluginData.commands;
    this.cooldowns = pluginData.cooldowns;
    this.locks = pluginData.locks;
  }

  /**
   * Code to run when the plugin is loaded
   */
  public onLoad(): any {
    // Implemented by plugin
  }

  /**
   * Code to run when the plugin is unloaded
   */
  public onUnload(): any {
    // Implemented by plugin
  }

  /**
   * Returns the plugin's config with overrides matching the given member id and channel id applied to it
   */
  protected getConfigForMemberIdAndChannelId(memberId: string, channelId: string): TPluginType["config"] {
    const guildId = this.client.channelGuildMap[channelId];
    const guild = this.client.guilds.get(guildId);
    const member = guild.members.get(memberId);
    const level = member ? this.getMemberLevel(member) : null;
    const categoryId = guild.channels.has(channelId) ? guild.channels.get(channelId).parentID : null;

    return this.config.getMatchingConfig({
      level,
      userId: memberId,
      channelId,
      categoryId,
      memberRoles: member ? member.roles : [],
    });
  }

  /**
   * Returns the member's permission level
   */
  protected getMemberLevel(member: Partial<Member>): number {
    return getMemberLevel(this.guildConfig.levels, member as Member);
  }
}

export class AnyExtendedPluginClass extends PluginClass<any> {}
