import {
  ConfigPreprocessorFn,
  ConfigValidatorFn,
  CustomOverrideCriteriaFunctions,
  PartialPluginOptions,
  PermissionLevels,
  PluginOptions,
} from "./configTypes";
import { getMatchingPluginConfig, MatchParams, mergeConfig } from "./configUtils";
import { Channel, GuildChannel, Member, Message, User } from "eris";
import { getMemberLevel } from "../plugins/pluginUtils";
import { AnyPluginData, isGuildPluginData } from "../plugins/PluginData";
import { BasePluginType } from "../plugins/pluginTypes";

export interface ExtendedMatchParams extends MatchParams {
  channelId?: string | null;
  member?: Member | null;
  message?: Message | null;
}

export interface PluginConfigManagerOpts<TPluginType extends BasePluginType> {
  customOverrideCriteriaFunctions?: CustomOverrideCriteriaFunctions<AnyPluginData<TPluginType>>;
  preprocessor?: ConfigPreprocessorFn<TPluginType>;
  validator?: ConfigValidatorFn<TPluginType>;
}

export class PluginConfigManager<TPluginType extends BasePluginType> {
  private readonly levels: PermissionLevels;
  private options: PluginOptions<TPluginType>;
  private readonly customOverrideCriteriaFunctions?: CustomOverrideCriteriaFunctions<AnyPluginData<TPluginType>>;
  private readonly preprocessor?: ConfigPreprocessorFn<TPluginType>;
  private readonly validator?: ConfigValidatorFn<TPluginType>;
  private pluginData?: AnyPluginData<TPluginType>;

  constructor(
    defaultOptions: PluginOptions<TPluginType>,
    userOptions: PartialPluginOptions<TPluginType>,
    levels: PermissionLevels = {},
    opts: PluginConfigManagerOpts<TPluginType> = {}
  ) {
    this.options = this.mergeOptions(defaultOptions, userOptions);
    this.levels = levels;
    this.customOverrideCriteriaFunctions = opts.customOverrideCriteriaFunctions;
    this.preprocessor = opts.preprocessor;
    this.validator = opts.validator;
  }

  public async init(): Promise<void> {
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
        : (defaultOptions.overrides ?? []).concat(userOptions.overrides ?? []),
    };
  }

  protected getMemberLevel(member: Member): number | null {
    if (!isGuildPluginData(this.pluginData!)) {
      return null;
    }

    return getMemberLevel(this.levels, member, this.pluginData.guild);
  }

  public setPluginData(pluginData: AnyPluginData<TPluginType>): void {
    if (this.pluginData) {
      throw new Error("Plugin data already set");
    }

    this.pluginData = pluginData;
  }

  public get(): TPluginType["config"] {
    return this.options.config;
  }

  public getMatchingConfig(matchParams: ExtendedMatchParams): Promise<TPluginType["config"]> {
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
    const level = matchParams?.level ?? (member && this.getMemberLevel(member)) ?? null;

    // Passed roles -> passed member's roles
    const memberRoles = matchParams.memberRoles || (member && member.roles);

    const finalMatchParams: MatchParams = {
      level,
      userId,
      channelId,
      categoryId,
      memberRoles,
    };

    return getMatchingPluginConfig<TPluginType, AnyPluginData<TPluginType>>(
      this.pluginData!,
      this.options,
      finalMatchParams,
      this.customOverrideCriteriaFunctions
    );
  }

  public getForMessage(msg: Message): Promise<TPluginType["config"]> {
    const level = msg.member ? this.getMemberLevel(msg.member) : null;
    return this.getMatchingConfig({
      level,
      userId: msg.author.id,
      channelId: msg.channel.id,
      categoryId: (msg.channel as GuildChannel).parentID,
      memberRoles: msg.member ? msg.member.roles : [],
    });
  }

  public getForChannel(channel: Channel): Promise<TPluginType["config"]> {
    return this.getMatchingConfig({
      channelId: channel.id,
      categoryId: (channel as GuildChannel).parentID,
    });
  }

  public getForUser(user: User): Promise<TPluginType["config"]> {
    return this.getMatchingConfig({
      userId: user.id,
    });
  }

  public getForMember(member: Member): Promise<TPluginType["config"]> {
    const level = this.getMemberLevel(member);
    return this.getMatchingConfig({
      level,
      userId: member.user.id,
      memberRoles: member.roles,
    });
  }
}
