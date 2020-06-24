import {
  ConfigPreprocessorFn,
  ConfigValidatorFn,
  PartialPluginOptions,
  PermissionLevels,
  PluginOptions,
} from "./configTypes";
import { CustomOverrideMatcher, getMatchingPluginConfig, MatchParams, mergeConfig } from "./configUtils";
import { Channel, GuildChannel, Member, Message, User } from "eris";
import { getMemberLevel } from "../plugins/pluginUtils";
import { PluginData } from "../plugins/PluginData";
import { BasePluginType } from "../plugins/pluginTypes";

export interface ExtendedMatchParams extends MatchParams {
  channelId?: string;
  member?: Member;
  message?: Message;
}

export class PluginConfigManager<TPluginType extends BasePluginType> {
  private readonly levels: PermissionLevels;
  private options: PluginOptions<TPluginType>;
  private readonly customOverrideMatcher: CustomOverrideMatcher<TPluginType>;
  private readonly preprocessor: ConfigPreprocessorFn<TPluginType>;
  private readonly validator: ConfigValidatorFn<TPluginType>;
  private pluginData: PluginData<TPluginType>;

  constructor(
    defaultOptions: PluginOptions<TPluginType>,
    userOptions: PartialPluginOptions<TPluginType>,
    levels: PermissionLevels = {},
    customOverrideMatcher?: CustomOverrideMatcher<TPluginType>,
    preprocessor?: ConfigPreprocessorFn<TPluginType>,
    validator?: ConfigValidatorFn<TPluginType>
  ) {
    this.options = this.mergeOptions(defaultOptions, userOptions);
    this.levels = levels;
    this.customOverrideMatcher = customOverrideMatcher;
    this.preprocessor = preprocessor;
    this.validator = validator;
  }

  public async init() {
    if (this.preprocessor) {
      this.options = await this.preprocessor(this.options);
    }

    if (this.validator) {
      await this.validator(this.options);
    }
  }

  private mergeOptions(
    defaultOptions: PluginOptions<TPluginType>,
    userOptions: PartialPluginOptions<TPluginType>
  ): PluginOptions<TPluginType> {
    return {
      config: mergeConfig(defaultOptions.config ?? {}, userOptions.config ?? {}),
      overrides: userOptions.replaceDefaultOverrides
        ? userOptions.overrides ?? []
        : (userOptions.overrides ?? []).concat(defaultOptions.overrides ?? []),
    };
  }

  public setPluginData(pluginData: PluginData<TPluginType>) {
    if (this.pluginData) {
      throw new Error("Plugin data already set");
    }

    this.pluginData = pluginData;
  }

  public get(): TPluginType["config"] {
    return this.options.config;
  }

  public getMatchingConfig(matchParams: ExtendedMatchParams): TPluginType["config"] {
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

    const finalMatchParams: MatchParams = {
      level,
      userId,
      channelId,
      categoryId,
      memberRoles,
    };

    return getMatchingPluginConfig<TPluginType>(
      this.pluginData,
      this.options,
      finalMatchParams,
      this.customOverrideMatcher
    );
  }

  public getForMessage(msg: Message): TPluginType["config"] {
    const level = msg.member ? getMemberLevel(this.levels, msg.member) : null;
    return this.getMatchingConfig({
      level,
      userId: msg.author.id,
      channelId: msg.channel.id,
      categoryId: (msg.channel as GuildChannel).parentID,
      memberRoles: msg.member ? msg.member.roles : [],
    });
  }

  public getForChannel(channel: Channel): TPluginType["config"] {
    return this.getMatchingConfig({
      channelId: channel.id,
      categoryId: (channel as GuildChannel).parentID,
    });
  }

  public getForUser(user: User): TPluginType["config"] {
    return this.getMatchingConfig({
      userId: user.id,
    });
  }

  public getForMember(member: Member): TPluginType["config"] {
    const level = getMemberLevel(this.levels, member);
    return this.getMatchingConfig({
      level,
      userId: member.user.id,
      memberRoles: member.roles,
    });
  }
}
