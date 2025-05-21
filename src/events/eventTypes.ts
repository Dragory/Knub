import {
  type AnyThreadChannel,
  type ApplicationCommandPermissionsUpdateData,
  type AutoModerationActionExecution,
  type AutoModerationRule,
  type ClientEvents,
  type CloseEvent,
  Collection,
  type DMChannel,
  type ForumChannel,
  type Guild,
  type GuildAuditLogsEntry,
  type GuildBan,
  type GuildEmoji,
  type GuildMember,
  type GuildScheduledEvent,
  type Interaction,
  type Invite,
  type MediaChannel,
  type Message,
  type MessageReaction,
  type NewsChannel,
  type NonThreadGuildBasedChannel,
  type PartialGuildMember,
  type PartialGuildScheduledEvent,
  type PartialMessage,
  type PartialMessageReaction,
  type PartialThreadMember,
  type PartialUser,
  type Presence,
  type ReadonlyCollection,
  type Role,
  type Snowflake,
  type StageInstance,
  type Sticker,
  type TextBasedChannel,
  type TextChannel,
  type ThreadMember,
  type Typing,
  type User,
  type VoiceChannel,
  type VoiceState,
} from "discord.js";
import type { GuildMessage } from "../types.ts";

export type ExtendedClientEvents = ClientEvents & { raw: any[] };

type FromDjsArgsConstraint = {
  [Key in keyof ExtendedClientEvents]: (...args: ExtendedClientEvents[Key]) => unknown;
};

const createFromDjsArgsObject = <Obj extends FromDjsArgsConstraint>(obj: Obj): Obj => {
  return obj;
};

/**
 * Each property is a function that converts DJS event listener arguments to Knub's event argument object.
 * @see https://github.com/discordjs/discord.js/blob/669c3cd/packages/discord.js/typings/index.d.ts#L4192
 */
export const fromDjsArgs = createFromDjsArgsObject({
  applicationCommandPermissionsUpdate: (data: ApplicationCommandPermissionsUpdateData) => ({ data }),
  autoModerationActionExecution: (autoModerationActionExecution: AutoModerationActionExecution) => ({
    autoModerationActionExecution,
  }),
  autoModerationRuleCreate: (autoModerationRule: AutoModerationRule) => ({ autoModerationRule }),
  autoModerationRuleDelete: (autoModerationRule: AutoModerationRule) => ({ autoModerationRule }),
  autoModerationRuleUpdate: (
    oldAutoModerationRule: AutoModerationRule | null,
    newAutoModerationRule: AutoModerationRule,
  ) => ({ oldAutoModerationRule, newAutoModerationRule }),
  cacheSweep: (message: string) => ({ message }),
  channelCreate: (channel: NonThreadGuildBasedChannel) => ({ channel }),
  channelDelete: (channel: DMChannel | NonThreadGuildBasedChannel) => ({ channel }),
  channelPinsUpdate: (channel: TextBasedChannel, date: Date) => ({ channel, date }),
  channelUpdate: (
    oldChannel: DMChannel | NonThreadGuildBasedChannel,
    newChannel: DMChannel | NonThreadGuildBasedChannel,
  ) => ({ oldChannel, newChannel }),
  debug: (message: string) => ({ message }),
  emojiCreate: (emoji: GuildEmoji) => ({ emoji }),
  emojiDelete: (emoji: GuildEmoji) => ({ emoji }),
  emojiUpdate: (oldEmoji: GuildEmoji, newEmoji: GuildEmoji) => ({ oldEmoji, newEmoji }),
  entitlementCreate: (entitlement) => ({ entitlement }),
  entitlementDelete: (entitlement) => ({ entitlement }),
  entitlementUpdate: (oldEntitlement, newEntitlement) => ({ oldEntitlement, newEntitlement }),
  error: (error: Error) => ({ error }),
  guildAuditLogEntryCreate: (auditLogEntry: GuildAuditLogsEntry, guild: Guild) => ({ auditLogEntry, guild }),
  guildAvailable: (guild: Guild) => ({ guild }),
  guildBanAdd: (ban: GuildBan) => ({ ban }),
  guildBanRemove: (ban: GuildBan) => ({ ban }),
  guildCreate: (guild: Guild) => ({ guild }),
  guildDelete: (guild: Guild) => ({ guild }),
  guildIntegrationsUpdate: (guild: Guild) => ({ guild }),
  guildMemberAdd: (member: GuildMember) => ({ member }),
  guildMemberAvailable: (member: GuildMember | PartialGuildMember) => ({ member }),
  guildMemberRemove: (member: GuildMember | PartialGuildMember) => ({ member }),
  guildMembersChunk: (
    members: ReadonlyCollection<Snowflake, GuildMember>,
    guild: Guild,
    data: { count: number; index: number; nonce: string | undefined },
  ) => ({ members, guild, data }),
  guildMemberUpdate: (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => ({
    oldMember,
    newMember,
  }),
  guildScheduledEventCreate: (guildScheduledEvent: GuildScheduledEvent) => ({ guildScheduledEvent }),
  guildScheduledEventUpdate: (
    oldGuildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent | null,
    newGuildScheduledEvent: GuildScheduledEvent,
  ) => ({ oldGuildScheduledEvent, newGuildScheduledEvent }),
  guildScheduledEventDelete: (guildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent) => ({
    guildScheduledEvent,
  }),
  guildScheduledEventUserAdd: (guildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent, user: User) => ({
    guildScheduledEvent,
    user,
  }),
  guildScheduledEventUserRemove: (
    guildScheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent,
    user: User,
  ) => ({
    guildScheduledEvent,
    user,
  }),
  guildSoundboardSoundCreate: (soundboardSound) => ({ soundboardSound }),
  guildSoundboardSoundDelete: (soundboardSound) => ({ soundboardSound }),
  guildSoundboardSoundUpdate: (oldSoundboardSound, newSoundboardSound) => ({ oldSoundboardSound, newSoundboardSound }),
  guildUnavailable: (guild: Guild) => ({ guild }),
  guildUpdate: (oldGuild: Guild, newGuild: Guild) => ({ oldGuild, newGuild }),
  interactionCreate: (interaction: Interaction) => ({ interaction }),
  invalidated: () => ({}),
  inviteCreate: (invite: Invite) => ({ invite }),
  inviteDelete: (invite: Invite) => ({ invite }),
  messageCreate: (message: Message) => ({ message }),
  messageDelete: (message: Message | PartialMessage) => ({ message }),
  messageDeleteBulk: (messages: ReadonlyCollection<Snowflake, Message | PartialMessage>) => ({ messages }),
  messagePollVoteAdd: (pollAnswer, userId) => ({ pollAnswer, userId }),
  messagePollVoteRemove: (pollAnswer, userId) => ({ pollAnswer, userId }),
  messageReactionAdd: (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => ({
    reaction,
    user,
  }),
  messageReactionRemove: (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => ({
    reaction,
    user,
  }),
  messageReactionRemoveAll: (message: Message | PartialMessage) => ({ message }),
  messageReactionRemoveEmoji: (reaction: MessageReaction | PartialMessageReaction) => ({ reaction }),
  messageUpdate: (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => ({
    oldMessage,
    newMessage,
  }),
  presenceUpdate: (oldPresence: Presence | null, newPresence: Presence) => ({ oldPresence, newPresence }),
  ready: () => ({}),
  roleCreate: (role: Role) => ({ role }),
  roleDelete: (role: Role) => ({ role }),
  roleUpdate: (oldRole: Role, newRole: Role) => ({ oldRole, newRole }),
  shardDisconnect: (closeEvent: CloseEvent, shardID: number) => ({ closeEvent, shardID }),
  shardError: (error: Error, shardID: number) => ({ error, shardID }),
  shardReady: (shardID: number, unavailableGuilds: Set<Snowflake> | undefined) => ({ shardID, unavailableGuilds }),
  shardReconnecting: (shardID: number) => ({ shardID }),
  shardResume: (shardID: number, replayedEvents: number) => ({ shardID, replayedEvents }),
  soundboardSounds: (soundboardSounds, guild) => ({ soundboardSounds, guild }),
  stageInstanceCreate: (stageInstance: StageInstance) => ({ stageInstance }),
  stageInstanceDelete: (stageInstance: StageInstance) => ({ stageInstance }),
  stageInstanceUpdate: (oldStageInstance: StageInstance | null, newStageInstance: StageInstance) => ({
    oldStageInstance,
    newStageInstance,
  }),
  stickerCreate: (sticker: Sticker) => ({ sticker }),
  stickerDelete: (sticker: Sticker) => ({ sticker }),
  stickerUpdate: (oldSticker: Sticker, newSticker: Sticker) => ({ oldSticker, newSticker }),
  subscriptionCreate: (subscription) => ({ subscription }),
  subscriptionDelete: (subscription) => ({ subscription }),
  subscriptionUpdate: (oldSubscription, newSubscription) => ({ oldSubscription, newSubscription }),
  threadCreate: (thread: AnyThreadChannel, newlyCreated: boolean) => ({ thread, newlyCreated }),
  threadDelete: (thread: AnyThreadChannel) => ({ thread }),
  threadListSync: (threads: ReadonlyCollection<Snowflake, AnyThreadChannel>, guild: Guild) => ({ threads, guild }),
  threadMemberUpdate: (oldMember: ThreadMember, newMember: ThreadMember) => ({ oldMember, newMember }),
  threadMembersUpdate: (
    addedMembers: ReadonlyCollection<Snowflake, ThreadMember>,
    removedMembers: ReadonlyCollection<Snowflake, ThreadMember | PartialThreadMember>,
    thread: AnyThreadChannel,
  ) => ({ addedMembers, removedMembers, thread }),
  threadUpdate: (oldThread: AnyThreadChannel, newThread: AnyThreadChannel) => ({ oldThread, newThread }),
  typingStart: (typing: Typing) => ({ typing }),
  userUpdate: (oldUser: User | PartialUser, newUser: User) => ({ oldUser, newUser }),
  voiceChannelEffectSend: (voiceChannelEffect) => ({ voiceChannelEffect }),
  voiceStateUpdate: (oldState: VoiceState, newState: VoiceState) => ({ oldState, newState }),
  warn: (message: string) => ({ message }),
  webhookUpdate: (channel: TextChannel | NewsChannel | VoiceChannel | ForumChannel | MediaChannel) => ({ channel }),
  webhooksUpdate: (channel: TextChannel | NewsChannel | VoiceChannel | ForumChannel | MediaChannel) => ({ channel }),
  raw: (...rawArgs: any[]) => ({ rawArgs }),
});

// Extended event types
export type KnownEvents = {
  [key in keyof typeof fromDjsArgs]: ReturnType<(typeof fromDjsArgs)[key]>;
};

export interface KnownGuildEvents extends KnownEvents {
  channelUpdate: {
    oldChannel: NonThreadGuildBasedChannel;
    newChannel: NonThreadGuildBasedChannel;
  };
  channelDelete: {
    channel: NonThreadGuildBasedChannel;
  };
  messageCreate: {
    message: GuildMessage;
  };
  typingStart: {
    typing: Typing & {
      channel: NonThreadGuildBasedChannel;
    };
  };
}

export type EventArguments = KnownEvents;
export type GuildEventArguments = KnownGuildEvents;

export const globalEvents = [
  "debug",
  "shardDisconnect",
  "shardError",
  "shardReady",
  "shardReconnecting",
  "shardResume",
  "guildCreate",
  "guildUnavailable",
  "error",
  "ready",
  "invalidated",
  "userUpdate",
  "warn",
] as const;

export type ValidEvent = keyof KnownEvents;
export type GlobalEvent = (typeof globalEvents)[number];
export type GuildEvent = Exclude<ValidEvent, GlobalEvent>;

export function isGlobalEvent(ev: ValidEvent): ev is GlobalEvent {
  return globalEvents.includes(ev as (typeof globalEvents)[number]);
}

export function isGuildEvent(ev: ValidEvent): ev is GuildEvent {
  return !globalEvents.includes(ev as (typeof globalEvents)[number]);
}
