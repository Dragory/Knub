import {
  ApplicationCommandPermissionsUpdateData,
  ClientEvents,
  CloseEvent,
  Collection,
  DMChannel,
  Guild,
  GuildBan,
  GuildEmoji,
  GuildMember,
  Interaction,
  Invite,
  Message,
  MessageReaction,
  NonThreadGuildBasedChannel,
  PartialGuildMember,
  PartialMessage,
  PartialUser,
  Presence,
  Role,
  Snowflake,
  StageInstance,
  Sticker,
  TextBasedChannel,
  TextChannel,
  ThreadMember,
  User,
  VoiceState,
  AnyThreadChannel,
  PartialThreadMember,
  Typing,
  NewsChannel,
  VoiceChannel,
  PartialMessageReaction,
  GuildScheduledEvent,
  ForumChannel,
} from "discord.js";
import { GuildMessage } from "../types";

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
  cacheSweep: (message: string) => ({ message }),
  channelCreate: (channel: NonThreadGuildBasedChannel) => ({ channel }),
  channelDelete: (channel: DMChannel | NonThreadGuildBasedChannel) => ({ channel }),
  channelPinsUpdate: (channel: TextBasedChannel, date: Date) => ({ channel, date }),
  channelUpdate: (
    oldChannel: DMChannel | NonThreadGuildBasedChannel,
    newChannel: DMChannel | NonThreadGuildBasedChannel
  ) => ({ oldChannel, newChannel }),
  debug: (message: string) => ({ message }),
  emojiCreate: (emoji: GuildEmoji) => ({ emoji }),
  emojiDelete: (emoji: GuildEmoji) => ({ emoji }),
  emojiUpdate: (oldEmoji: GuildEmoji, newEmoji: GuildEmoji) => ({ oldEmoji, newEmoji }),
  error: (error: Error) => ({ error }),
  guildBanAdd: (ban: GuildBan) => ({ ban }),
  guildBanRemove: (ban: GuildBan) => ({ ban }),
  guildCreate: (guild: Guild) => ({ guild }),
  guildDelete: (guild: Guild) => ({ guild }),
  guildIntegrationsUpdate: (guild: Guild) => ({ guild }),
  guildMemberAdd: (member: GuildMember) => ({ member }),
  guildMemberAvailable: (member: GuildMember | PartialGuildMember) => ({ member }),
  guildMemberRemove: (member: GuildMember | PartialGuildMember) => ({ member }),
  guildMembersChunk: (
    members: Collection<Snowflake, GuildMember>,
    guild: Guild,
    data: { count: number; index: number; nonce: string | undefined }
  ) => ({ members, guild, data }),
  guildMemberUpdate: (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => ({
    oldMember,
    newMember,
  }),
  guildScheduledEventCreate: (guildScheduledEvent: GuildScheduledEvent) => ({ guildScheduledEvent }),
  guildScheduledEventUpdate: (
    oldGuildScheduledEvent: GuildScheduledEvent | null,
    newGuildScheduledEvent: GuildScheduledEvent
  ) => ({ oldGuildScheduledEvent, newGuildScheduledEvent }),
  guildScheduledEventDelete: (guildScheduledEvent: GuildScheduledEvent) => ({ guildScheduledEvent }),
  guildScheduledEventUserAdd: (guildScheduledEvent: GuildScheduledEvent, user: User) => ({ guildScheduledEvent, user }),
  guildScheduledEventUserRemove: (guildScheduledEvent: GuildScheduledEvent, user: User) => ({
    guildScheduledEvent,
    user,
  }),
  guildUnavailable: (guild: Guild) => ({ guild }),
  guildUpdate: (oldGuild: Guild, newGuild: Guild) => ({ oldGuild, newGuild }),
  interactionCreate: (interaction: Interaction) => ({ interaction }),
  invalidated: () => ({}),
  inviteCreate: (invite: Invite) => ({ invite }),
  inviteDelete: (invite: Invite) => ({ invite }),
  messageCreate: (message: Message) => ({ message }),
  messageDelete: (message: Message | PartialMessage) => ({ message }),
  messageDeleteBulk: (messages: Collection<Snowflake, Message | PartialMessage>) => ({ messages }),
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
  stageInstanceCreate: (stageInstance: StageInstance) => ({ stageInstance }),
  stageInstanceDelete: (stageInstance: StageInstance) => ({ stageInstance }),
  stageInstanceUpdate: (oldStageInstance: StageInstance | null, newStageInstance: StageInstance) => ({
    oldStageInstance,
    newStageInstance,
  }),
  stickerCreate: (sticker: Sticker) => ({ sticker }),
  stickerDelete: (sticker: Sticker) => ({ sticker }),
  stickerUpdate: (oldSticker: Sticker, newSticker: Sticker) => ({ oldSticker, newSticker }),
  threadCreate: (thread: AnyThreadChannel, newlyCreated: boolean) => ({ thread, newlyCreated }),
  threadDelete: (thread: AnyThreadChannel) => ({ thread }),
  threadListSync: (threads: Collection<Snowflake, AnyThreadChannel>, guild: Guild) => ({ threads, guild }),
  threadMemberUpdate: (oldMember: ThreadMember, newMember: ThreadMember) => ({ oldMember, newMember }),
  threadMembersUpdate: (
    addedMembers: Collection<Snowflake, ThreadMember>,
    removedMembers: Collection<Snowflake, ThreadMember | PartialThreadMember>,
    thread: AnyThreadChannel
  ) => ({ addedMembers, removedMembers, thread }),
  threadUpdate: (oldThread: AnyThreadChannel, newThread: AnyThreadChannel) => ({ oldThread, newThread }),
  typingStart: (typing: Typing) => ({ typing }),
  userUpdate: (oldUser: User | PartialUser, newUser: User) => ({ oldUser, newUser }),
  voiceStateUpdate: (oldState: VoiceState, newState: VoiceState) => ({ oldState, newState }),
  warn: (message: string) => ({ message }),
  webhookUpdate: (channel: TextChannel | NewsChannel | VoiceChannel | ForumChannel) => ({ channel }),
  raw: (...rawArgs: any[]) => ({ rawArgs }),
});

// Extended event types
export type KnownEvents = {
  [key in keyof typeof fromDjsArgs]: ReturnType<typeof fromDjsArgs[key]>;
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
export type GlobalEvent = typeof globalEvents[number];
export type GuildEvent = Exclude<ValidEvent, GlobalEvent>;

export function isGlobalEvent(ev: ValidEvent): ev is GlobalEvent {
  return globalEvents.includes(ev as typeof globalEvents[number]);
}

export function isGuildEvent(ev: ValidEvent): ev is GuildEvent {
  return !globalEvents.includes(ev as typeof globalEvents[number]);
}
