/* eslint-disable @typescript-eslint/restrict-plus-operands */
import {
  ConfigParserFn,
  CustomOverrideCriteriaFunctions,
  PermissionLevels,
  pluginBaseOptionsSchema,
  PluginOptions,
  PluginOverride
} from "./configTypes";
import { getMatchingPluginConfig, MatchParams, mergeConfig } from "./configUtils";
import { getMemberLevel } from "../plugins/pluginUtils";
import { AnyPluginData, isGuildPluginData } from "../plugins/PluginData";
import { BasePluginType } from "../plugins/pluginTypes";
import { Channel, GuildChannel, GuildMember, Message, PartialUser, User } from "discord.js";

export interface ExtendedMatchParams extends MatchParams {
  channelId?: string | null;
  member?: GuildMember | null;
  message?: Message | null;
}

export interface PluginConfigManagerOpts<TPluginType extends BasePluginType> {
  levels: PermissionLevels;
  parser: ConfigParserFn<TPluginType["config"]>;
  customOverrideCriteriaFunctions?: CustomOverrideCriteriaFunctions<AnyPluginData<TPluginType>>;
}

export class PluginConfigManager<TPluginType extends BasePluginType> {
  private readonly defaultOptions: PluginOptions<TPluginType>;
  private readonly userInput: unknown;
  private readonly levels: PermissionLevels;
  private readonly customOverrideCriteriaFunctions?: CustomOverrideCriteriaFunctions<AnyPluginData<TPluginType>>;
  private readonly parser: ConfigParserFn<TPluginType["config"]>;
  private pluginData?: AnyPluginData<TPluginType>;

  private initialized = false;
  private parsedOptions: PluginOptions<TPluginType> | null = null;

  constructor(
    defaultOptions: PluginOptions<TPluginType>,
    userInput: unknown,
    opts: PluginConfigManagerOpts<TPluginType>,
  ) {
    this.defaultOptions = defaultOptions;
    this.userInput = userInput;
    this.levels = opts.levels;
    this.parser = opts.parser;
    this.customOverrideCriteriaFunctions = opts.customOverrideCriteriaFunctions;
  }

  public async init(): Promise<void> {
    if (this.initialized) {
      throw new Error("Already initialized");
    }

    const parsedUserInput = pluginBaseOptionsSchema.parse(this.userInput);

    const config = mergeConfig(this.defaultOptions.config ?? {}, parsedUserInput.config ?? {});
    const parsedValidConfig = await this.parser(config);

    const overrides = parsedUserInput.overrides ?? this.defaultOptions.overrides ?? [];
    const parsedValidOverrides: Array<PluginOverride<TPluginType>> = [];
    for (const override of overrides) {
      if (! ("config" in override)) {
        throw new Error("Overrides must include the config property");
      }
      const overrideConfig = mergeConfig(parsedValidConfig, override.config ?? {});
      // Validate the override config as if it was already merged with the base config
      // In reality, overrides are merged with the base config when they are evaluated
      await this.parser(overrideConfig);
      parsedValidOverrides.push(override as PluginOverride<TPluginType>);
    }

    this.parsedOptions = {
      config: parsedValidConfig,
      overrides: parsedValidOverrides,
    };
    this.initialized = true;
  }

  protected getParsedOptions(): PluginOptions<TPluginType> {
    if (! this.initialized) {
      throw new Error("Not initialized");
    }

    return this.parsedOptions!;
  }

  protected getMemberLevel(member: GuildMember): number | null {
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
    return this.getParsedOptions().config;
  }

  public getMatchingConfig(matchParams: ExtendedMatchParams): Promise<TPluginType["config"]> {
    const message = matchParams.message;

    // Passed userId -> passed member's id -> passed message's author's id
    const userId =
      matchParams.userId ||
      (matchParams.member && matchParams.member.id) ||
      (message && message.author && message.author.id);

    // Passed channelId -> passed message's thread's parent id -> passed message's channel id
    const channelId =
      matchParams.channelId ||
      (message?.channel?.isThread?.() && message.channel.parentId) ||
      (message && message.channel && message.channel.id);

    // Passed category id -> passed message's thread's channel's category id -> passed message's channel's category id
    const categoryId =
      matchParams.categoryId ||
      (message?.channel?.isThread?.() && message.channel.parent?.parentId) ||
      (message?.channel && (message.channel as GuildChannel).parentId);

    // Passed thread id -> passed message's thread id
    const threadId = matchParams.threadId || (message?.channel?.isThread?.() && message.channel.id) || null;

    // Passed value -> whether message's channel is a thread
    const isThread = matchParams.isThread ?? message?.channel?.isThread?.() ?? null;

    // Passed member -> passed message's member
    const member = matchParams.member || (message && message.member);

    // Passed level -> passed member's level
    const level = matchParams?.level ?? (member && this.getMemberLevel(member)) ?? null;

    // Passed roles -> passed member's roles
    const memberRoles = matchParams.memberRoles ?? [...(member?.roles.cache.keys() ?? [])];

    const finalMatchParams: MatchParams = {
      level,
      userId,
      channelId,
      categoryId,
      threadId,
      isThread,
      memberRoles,
    };

    return getMatchingPluginConfig<TPluginType, AnyPluginData<TPluginType>>(
      this.pluginData!,
      this.getParsedOptions(),
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
      categoryId: (msg.channel as GuildChannel).parentId,
      memberRoles: msg.member ? [...msg.member.roles.cache.keys()] : [],
    });
  }

  public getForChannel(channel: Channel): Promise<TPluginType["config"]> {
    return this.getMatchingConfig({
      channelId: channel.id,
      categoryId: (channel as GuildChannel).parentId,
    });
  }

  public getForUser(user: User | PartialUser): Promise<TPluginType["config"]> {
    return this.getMatchingConfig({
      userId: user.id,
    });
  }

  public getForMember(member: GuildMember): Promise<TPluginType["config"]> {
    const level = this.getMemberLevel(member);
    return this.getMatchingConfig({
      level,
      userId: member.user.id,
      memberRoles: [...member.roles.cache.keys()],
    });
  }
}
