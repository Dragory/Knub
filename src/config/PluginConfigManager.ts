import type {
  APIInteractionGuildMember,
  Channel,
  GuildChannel,
  GuildMember,
  Interaction,
  Message,
  PartialUser,
  User,
} from "discord.js";
import type z from "zod/v4";
import { type BasePluginData, isGuildPluginData } from "../plugins/PluginData.ts";
import type { BasePluginType } from "../plugins/pluginTypes.ts";
import { getMemberLevel, getMemberRoles } from "../plugins/pluginUtils.ts";
import { ConfigValidationError } from "./ConfigValidationError.ts";
import {
  type ConfigParserFn,
  type CustomOverrideCriteriaFunctions,
  type PermissionLevels,
  type PluginOptions,
  type PluginOverride,
  pluginBaseOptionsSchema,
} from "./configTypes.ts";
import { type MatchParams, getMatchingPluginConfig, mergeConfig } from "./configUtils.ts";

export interface ExtendedMatchParams extends MatchParams {
  channelId?: string | null;
  member?: GuildMember | APIInteractionGuildMember | null;
  message?: Message | null;
  channel?: Channel | null;
  interaction?: Interaction | null;
}

export interface PluginConfigManagerOpts<TPluginData extends BasePluginData<BasePluginType>> {
  configSchema: TPluginData["_pluginType"]["configSchema"];
  defaultOverrides: Array<PluginOverride<TPluginData["_pluginType"]>>;
  levels: PermissionLevels;
  customOverrideCriteriaFunctions?: CustomOverrideCriteriaFunctions<TPluginData>;
}

export class PluginConfigManager<TPluginData extends BasePluginData<BasePluginType>> {
  private readonly userInput: unknown;

  private readonly configSchema: TPluginData["_pluginType"]["configSchema"];
  private readonly defaultOverrides: Array<PluginOverride<TPluginData["_pluginType"]>>;
  private readonly levels: PermissionLevels;
  private readonly customOverrideCriteriaFunctions?: CustomOverrideCriteriaFunctions<TPluginData>;

  private pluginData?: TPluginData;

  private initialized = false;
  private parsedOptions: PluginOptions<TPluginData["_pluginType"]> | null = null;

  constructor(userInput: unknown, opts: PluginConfigManagerOpts<TPluginData>) {
    this.userInput = userInput;

    this.configSchema = opts.configSchema;
    this.defaultOverrides = opts.defaultOverrides;
    this.levels = opts.levels;
    this.customOverrideCriteriaFunctions = opts.customOverrideCriteriaFunctions;
  }

  public async init(): Promise<void> {
    if (this.initialized) {
      throw new Error("Already initialized");
    }

    const userInputBaseParseResult = pluginBaseOptionsSchema.safeParse(this.userInput);
    if (!userInputBaseParseResult.success) {
      throw new ConfigValidationError(userInputBaseParseResult.error.message);
    }

    const baseParsedUserInput = userInputBaseParseResult.data;
    const parsedValidConfig = await this.configSchema.parseAsync(baseParsedUserInput.config ?? {});

    const parsedUserInputOverrides = baseParsedUserInput.overrides as
      | Array<PluginOverride<TPluginData["_pluginType"]>>
      | undefined;
    const overrides: Array<PluginOverride<TPluginData["_pluginType"]>> = baseParsedUserInput.replaceDefaultOverrides
      ? (parsedUserInputOverrides ?? [])
      : this.defaultOverrides.concat(parsedUserInputOverrides ?? []);
    const parsedValidOverrides: Array<PluginOverride<TPluginData["_pluginType"]>> = [];
    for (const override of overrides) {
      if (!("config" in override)) {
        throw new ConfigValidationError("Overrides must include the config property");
      }
      if (!parsedValidConfig) {
        // FIXME: Debug
        console.debug(
          "!! DEBUG !! PluginConfigManager.init config missing",
          this.pluginData && isGuildPluginData(this.pluginData) ? this.pluginData.guild.id : "(global)",
        );
      }
      const overrideConfig = mergeConfig(baseParsedUserInput.config ?? {}, override.config ?? {});
      // Validate the override config as if it was already merged with the base config
      // In reality, overrides are merged with the base config when they are evaluated
      await this.configSchema.parseAsync(overrideConfig);
      parsedValidOverrides.push(override);
    }

    this.parsedOptions = {
      config: parsedValidConfig,
      overrides: parsedValidOverrides,
    };
    this.initialized = true;
  }

  protected getParsedOptions(): PluginOptions<TPluginData["_pluginType"]> {
    if (!this.initialized) {
      throw new Error("Not initialized");
    }

    return this.parsedOptions!;
  }

  protected getMemberLevel(member: GuildMember | APIInteractionGuildMember): number | null {
    if (!this.pluginData || !isGuildPluginData(this.pluginData)) {
      return null;
    }

    return getMemberLevel(this.levels, member, this.pluginData.guild);
  }

  public setPluginData(pluginData: TPluginData): void {
    if (this.pluginData) {
      throw new Error("Plugin data already set");
    }

    this.pluginData = pluginData;
  }

  public get(): z.output<TPluginData["_pluginType"]["configSchema"]> {
    return this.getParsedOptions().config;
  }

  public getMatchingConfig(
    matchParams: ExtendedMatchParams,
  ): Promise<z.output<TPluginData["_pluginType"]["configSchema"]>> {
    const { message, interaction } = matchParams;

    const userId =
      // Directly passed userId
      matchParams.userId ||
      // Passed member's ID
      (matchParams.member && "id" in matchParams.member && matchParams.member.id) ||
      // Passed member's user ID
      matchParams.member?.user.id ||
      // Passed message's author's ID
      message?.author?.id ||
      // Passed interaction's author's ID
      interaction?.user?.id ||
      null;

    const channelId =
      // Directly passed channelId
      matchParams.channelId ||
      // Passed non-thread channel's ID
      (matchParams.channel && !matchParams.channel.isThread() && matchParams.channel.id) ||
      // Passed thread channel's parent ID
      (matchParams.channel?.isThread() && matchParams.channel.parentId) ||
      // Passed message's thread's parent ID
      (message?.channel?.isThread() && message.channel.parentId) ||
      // Passed message's non-thread channel's ID
      message?.channel?.id ||
      // Passed interaction's author's ID
      interaction?.channel?.id ||
      null;

    const categoryId =
      // Directly passed categoryId
      matchParams.categoryId ||
      // Passed non-thread channel's parent ID
      (matchParams.channel && !matchParams.channel.isThread() && (matchParams.channel as GuildChannel).parentId) ||
      // Passed thread channel's parent ID
      (matchParams.channel?.isThread?.() && matchParams.channel.parent?.parentId) ||
      // Passed message's thread's channel's parent ID
      (message?.channel?.isThread?.() && message.channel.parent?.parentId) ||
      // Passed message's non-thread channel's parent ID
      (message?.channel && (message.channel as GuildChannel).parentId) ||
      // Passed interaction's thread's channel's parent ID
      (interaction?.channel?.isThread?.() && interaction.channel.parent?.parentId) ||
      // Passed interaction's non-thread channel's parent ID
      (interaction?.channel && (interaction.channel as GuildChannel).parentId) ||
      null;

    // Passed thread id -> passed message's thread id
    const threadId =
      // Directly passed threadId
      matchParams.threadId ||
      // Passed thread channel's ID
      (matchParams.channel?.isThread?.() && matchParams.channel.id) ||
      // Passed message's thread channel's ID
      (message?.channel?.isThread?.() && message.channel.id) ||
      // Passed interaction's thread channel's ID
      (interaction?.channel?.isThread?.() && interaction.channel.id) ||
      null;

    // Passed value -> whether message's channel is a thread -> whether interaction's channel is a thread
    const isThread =
      matchParams.isThread ??
      matchParams?.channel?.isThread?.() ??
      message?.channel?.isThread?.() ??
      interaction?.channel?.isThread?.() ??
      null;

    const threadType =
      matchParams.threadType ??
      (matchParams.channel?.isThread?.() ? (matchParams.channel.type === 12 ? "private" : "public") : null) ??
      (message?.channel?.isThread?.() ? (message.channel.type === 12 ? "private" : "public") : null) ??
      (interaction?.channel?.isThread?.() ? (interaction.channel.type === 12 ? "private" : "public") : null);

    // Passed member -> passed message's member -> passed interaction's member
    const member = matchParams.member || message?.member || interaction?.member;

    // Passed level -> passed member's level
    const level = matchParams?.level ?? (member && this.getMemberLevel(member)) ?? null;

    // Passed roles -> passed member's roles
    const memberRoles = matchParams.memberRoles ?? (member ? getMemberRoles(member) : []);

    const finalMatchParams: MatchParams<TPluginData["_pluginType"]["customOverrideMatchParams"]> = {
      level,
      userId,
      channelId,
      categoryId,
      threadId,
      isThread,
      threadType,
      memberRoles,
    };

    return getMatchingPluginConfig<TPluginData["_pluginType"], TPluginData>(
      this.pluginData!,
      this.getParsedOptions(),
      finalMatchParams,
      this.customOverrideCriteriaFunctions,
    );
  }

  public getForMessage(msg: Message): Promise<z.output<TPluginData["_pluginType"]["configSchema"]>> {
    const level = msg.member ? this.getMemberLevel(msg.member) : null;
    return this.getMatchingConfig({
      level,
      userId: msg.author.id,
      channelId: msg.channel.id,
      categoryId: (msg.channel as GuildChannel).parentId,
      memberRoles: msg.member ? [...msg.member.roles.cache.keys()] : [],
    });
  }

  public getForInteraction(interaction: Interaction): Promise<z.output<TPluginData["_pluginType"]["configSchema"]>> {
    return this.getMatchingConfig({ interaction });
  }

  public getForChannel(channel: Channel): Promise<z.output<TPluginData["_pluginType"]["configSchema"]>> {
    return this.getMatchingConfig({
      channelId: channel.id,
      categoryId: (channel as GuildChannel).parentId,
    });
  }

  public getForUser(user: User | PartialUser): Promise<z.output<TPluginData["_pluginType"]["configSchema"]>> {
    return this.getMatchingConfig({
      userId: user.id,
    });
  }

  public getForMember(member: GuildMember): Promise<z.output<TPluginData["_pluginType"]["configSchema"]>> {
    const level = this.getMemberLevel(member);
    return this.getMatchingConfig({
      level,
      userId: member.user.id,
      memberRoles: [...member.roles.cache.keys()],
    });
  }
}
