import {
  IBasePluginConfig,
  IPartialPluginOptions,
  IPermissionLevelDefinitions,
  IPluginOptions
} from "./configInterfaces";
import { getMatchingPluginConfig, IMatchParams, mergeConfig } from "./configUtils";
import { Channel, GuildChannel, Member, Message, User } from "eris";
import { getMemberLevel } from "./pluginUtils";

export interface IExtendedMatchParams extends IMatchParams {
  channelId?: string;
  member?: Member;
  message?: Message;
}

export type CustomOverrideMatcher<TCustomOverrideCriteria> = (
  criteria: TCustomOverrideCriteria,
  matchParams: IMatchParams
) => boolean;

export class PluginConfigManager<TConfig, TCustomOverrideCriteria = unknown> {
  private readonly levels: IPermissionLevelDefinitions;
  private readonly options: IPluginOptions<TConfig, TCustomOverrideCriteria>;
  private readonly customOverrideMatcher: CustomOverrideMatcher<TCustomOverrideCriteria>;

  constructor(
    defaultOptions: IPluginOptions<TConfig, TCustomOverrideCriteria>,
    userOptions: IPartialPluginOptions<TConfig, TCustomOverrideCriteria>,
    customOverrideMatcher?: CustomOverrideMatcher<TCustomOverrideCriteria>,
    levels: IPermissionLevelDefinitions = {}
  ) {
    this.options = this.mergeOptions(defaultOptions, userOptions);
    this.customOverrideMatcher = customOverrideMatcher;
    this.levels = levels;
  }

  private mergeOptions(
    defaultOptions: IPluginOptions<TConfig, TCustomOverrideCriteria>,
    userOptions: IPartialPluginOptions<TConfig, TCustomOverrideCriteria>
  ): IPluginOptions<TConfig, TCustomOverrideCriteria> {
    return {
      config: mergeConfig(defaultOptions.config ?? {}, userOptions.config ?? {}),
      overrides: userOptions.replaceDefaultOverrides
        ? userOptions.overrides ?? []
        : (userOptions.overrides ?? []).concat(defaultOptions.overrides ?? [])
    };
  }

  public get(): TConfig {
    return this.options.config;
  }

  public getMatchingConfig(matchParams: IExtendedMatchParams): TConfig {
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
    const level = matchParams?.level ?? (member && getMemberLevel(this.levels, member)) ?? null;

    // Passed roles -> passed member's roles
    const memberRoles = matchParams.memberRoles || (member && member.roles);

    const finalMatchParams: IMatchParams = {
      level,
      userId,
      channelId,
      categoryId,
      memberRoles
    };

    return getMatchingPluginConfig<TConfig, TCustomOverrideCriteria>(
      this.options,
      finalMatchParams,
      this.customOverrideMatcher
    );
  }

  public getForMessage(msg: Message): TConfig {
    const level = msg.member ? getMemberLevel(this.levels, msg.member) : null;
    return this.getMatchingConfig({
      level,
      userId: msg.author.id,
      channelId: msg.channel.id,
      categoryId: (msg.channel as GuildChannel).parentID,
      memberRoles: msg.member ? msg.member.roles : []
    });
  }

  public getForChannel(channel: Channel): TConfig {
    return this.getMatchingConfig({
      channelId: channel.id,
      categoryId: (channel as GuildChannel).parentID
    });
  }

  public getForUser(user: User): TConfig {
    return this.getMatchingConfig({
      userId: user.id
    });
  }

  public getForMember(member: Member): TConfig {
    const level = getMemberLevel(this.levels, member);
    return this.getMatchingConfig({
      level,
      userId: member.user.id,
      memberRoles: member.roles
    });
  }
}
