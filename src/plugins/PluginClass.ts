import { Client, Guild, Member, TextableChannel } from "eris";
import { BaseConfig, BasePluginConfig, PluginOptions } from "../config/configTypes";
import { CustomArgumentTypes } from "../commands/commandUtils";
import { MatchParams } from "../config/configUtils";
import { LockManager } from "../locks/LockManager";
import { CooldownManager } from "../cooldowns/CooldownManager";
import { getMemberLevel, ResolvablePlugin } from "./pluginUtils";
import { PluginConfigManager } from "../config/PluginConfigManager";
import { PluginData } from "./PluginData";
import { PluginCommandManager } from "../commands/PluginCommandManager";
import { PluginEventManager } from "../events/PluginEventManager";
import { CommandBlueprint } from "../commands/CommandBlueprint";
import { EventListenerBlueprint } from "../events/EventListenerBlueprint";

/**
 * Base class for Knub plugins
 */
export abstract class PluginClass<TConfig extends {} = BasePluginConfig, TCustomOverrideCriteria extends {} = {}> {
  // REQUIRED: Internal name for the plugin
  public static pluginName: string;

  // Arbitrary info about the plugin, e.g. description.
  // This property is mainly here to set a convention, as it's not actually used in Knub itself.
  public static pluginInfo: any;

  // Other plugins that are required for this plugin to function. They will be loaded before this plugin.
  public static dependencies: ResolvablePlugin[];

  // The plugin's default options, including overrides
  public static defaultOptions: PluginOptions<any, any>;

  // Commands that are automatically registered on plugin load
  public static commands: CommandBlueprint[];

  // Event listeners that are automatically registered on plugin load
  public static events: EventListenerBlueprint[];

  // Custom argument types for commands
  public static customArgumentTypes: CustomArgumentTypes;

  // Guild info - these will be null for global plugins
  public readonly guildId: string;
  protected readonly guild: Guild;
  protected readonly guildConfig: BaseConfig;

  protected readonly client: Client;

  protected pluginData: PluginData;
  protected config: PluginConfigManager<TConfig, TCustomOverrideCriteria>;
  protected locks: LockManager;
  protected commandManager: PluginCommandManager;
  protected eventManager: PluginEventManager;
  protected cooldowns: CooldownManager;

  public static _decoratorValuesTransferred = false;

  constructor(pluginData: PluginData<TConfig, TCustomOverrideCriteria>) {
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
   * Function to resolve custom override criteria in the plugin's config.
   * Remember to also set TCustomOverrideCriteria appropriately.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected matchCustomOverrideCriteria(criteria: TCustomOverrideCriteria, matchParams: MatchParams): boolean {
    // Implemented by plugin
    return true;
  }

  /**
   * Returns the plugin's config with overrides matching the given member id and channel id applied to it
   */
  protected getConfigForMemberIdAndChannelId(memberId: string, channelId: string): TConfig {
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
