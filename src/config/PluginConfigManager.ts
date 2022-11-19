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
import { getMemberLevel, getMemberRoles } from "../plugins/pluginUtils";
import { AnyPluginData, isGuildPluginData } from "../plugins/PluginData";
import { BasePluginType } from "../plugins/pluginTypes";
import { APIInteractionGuildMember, Channel, GuildChannel, GuildMember, Message, PartialUser, User } from "discord.js";

export interface ExtendedMatchParams extends MatchParams {
  channelId?: string | null;
  member?: GuildMember | APIInteractionGuildMember | null;
  message?: Message | null;
  channel?: Channel | null;
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

  protected getMemberLevel(member: GuildMember | APIInteractionGuildMember): number | null {
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

    const userId =
      // Directly passed userId
      matchParams.userId ||
      // Passed member's ID
      (matchParams.member && ("id" in matchParams.member) && matchParams.member.id) ||
      // Passed member's user ID
      (matchParams.member && matchParams.member.user.id) ||
      // Passed message's author's ID
      (message && message.author && message.author.id) ||
      null;

    const channelId =
      // Directly passed channelId
      matchParams.channelId ||
      // Passed non-thread channel's ID
      (matchParams.channel && ! matchParams.channel.isThread() && matchParams.channel.id) ||
      // Passed thread channel's parent ID
      (matchParams.channel?.isThread?.() && matchParams.channel.parentId) ||
      // Passed message's thread's parent ID
      (message?.channel?.isThread?.() && message.channel.parentId) ||
      // Passed message's non-thread channel's ID
      (message && message.channel && message.channel.id) ||
      null;

    const categoryId =
      // Directly passed categoryId
      matchParams.categoryId ||
      // Passed non-thread channel's parent ID
      (matchParams.channel && ! matchParams.channel.isThread() && (matchParams.channel as GuildChannel).parentId) ||
      // Passed thread channel's parent ID
      (matchParams.channel?.isThread?.() && matchParams.channel.parent?.parentId) ||
      // Passed message's thread's channel's parent ID
      (message?.channel?.isThread?.() && message.channel.parent?.parentId) ||
      // Passed message's non-thread channel's parent ID
      (message?.channel && (message.channel as GuildChannel).parentId) ||
      null;

    // Passed thread id -> passed message's thread id
    const threadId =
      // Directly passed threadId
      matchParams.threadId ||
      // Passed thread channel's ID
      (matchParams.channel?.isThread?.() && matchParams.channel.id) ||
      // Passed message's thread channel's ID
      (message?.channel?.isThread?.() && message.channel.id) ||
      null;

    // Passed value -> whether message's channel is a thread
    const isThread = matchParams.isThread ??
      matchParams?.channel?.isThread?.() ??
      message?.channel?.isThread?.() ??
      null;

    // Passed member -> passed message's member
    const member = matchParams.member || (message && message.member);

    // Passed level -> passed member's level
    const level = matchParams?.level ?? (member && this.getMemberLevel(member)) ?? null;

    // Passed roles -> passed member's roles
    const memberRoles = matchParams.memberRoles ?? (member ? getMemberRoles(member) : []);

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
