import {
  ApplicationCommand,
  Channel,
  ClientEvents,
  CloseEvent,
  Collection,
  DMChannel,
  Guild,
  GuildBan,
  GuildChannel,
  GuildEmoji,
  GuildMember,
  Interaction,
  InvalidRequestWarningData,
  Invite,
  Message,
  MessageReaction,
  PartialDMChannel,
  PartialGuildMember,
  PartialMessage,
  PartialUser,
  Presence,
  RateLimitData,
  Role,
  Snowflake,
  StageInstance,
  Sticker,
  TextChannel,
  ThreadChannel,
  ThreadMember,
  User,
  VoiceState,
} from "discord.js";
import { GuildMessage } from "../types";

export type ExtendedClientEvents = ClientEvents & { raw: any[] };

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/**
 * Each property is a function that converts DJS event listener arguments to Knub's event argument object.
 * @see https://github.com/discordjs/discord.js/blob/e300518597955abf4bf3c3d2634b47b9b3964274/typings/index.d.ts#L2591
 */
export const fromDjsArgs = {
  applicationCommandCreate: (command: ApplicationCommand) => ({ command }),
  applicationCommandDelete: (command: ApplicationCommand) => ({ command }),
  applicationCommandUpdate: (oldCommand: ApplicationCommand | null, newCommand: ApplicationCommand) => ({
    oldCommand,
    newCommand,
  }),
  channelCreate: (channel: GuildChannel) => ({ channel }),
  channelDelete: (channel: DMChannel | GuildChannel) => ({ channel }),
  channelPinsUpdate: (channel: Channel | PartialDMChannel, date: Date) => ({ channel, date }),
  channelUpdate: (oldChannel: Channel, newChannel: Channel) => ({ oldChannel, newChannel }),
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
  guildUnavailable: (guild: Guild) => ({ guild }),
  guildUpdate: (oldGuild: Guild, newGuild: Guild) => ({ oldGuild, newGuild }),
  interactionCreate: (interaction: Interaction) => ({ interaction }),
  invalidated: () => ({}),
  invalidRequestWarning: (invalidRequestWarningData: InvalidRequestWarningData) => ({ invalidRequestWarningData }),
  inviteCreate: (invite: Invite) => ({ invite }),
  inviteDelete: (invite: Invite) => ({ invite }),
  messageCreate: (message: Message) => ({ message }),
  messageDelete: (message: Message | PartialMessage) => ({ message }),
  messageDeleteBulk: (messages: Collection<Snowflake, Message | PartialMessage>) => ({ messages }),
  messageReactionAdd: (reaction: MessageReaction, user: User | PartialUser) => ({ reaction, user }),
  messageReactionRemove: (reaction: MessageReaction, user: User | PartialUser) => ({ reaction, user }),
  messageReactionRemoveAll: (message: Message | PartialMessage) => ({ message }),
  messageReactionRemoveEmoji: (reaction: MessageReaction) => ({ reaction }),
  messageUpdate: (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => ({
    oldMessage,
    newMessage,
  }),
  presenceUpdate: (oldPresence: Presence | undefined, newPresence: Presence) => ({ oldPresence, newPresence }),
  rateLimit: (rateLimitData: RateLimitData) => ({ rateLimitData }),
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
  stageInstanceUpdate: (oldStageInstance: StageInstance, newStageInstance: StageInstance) => ({
    oldStageInstance,
    newStageInstance,
  }),
  stickerCreate: (sticker: Sticker) => ({ sticker }),
  stickerDelete: (sticker: Sticker) => ({ sticker }),
  stickerUpdate: (oldSticker: Sticker, newSticker: Sticker) => ({ oldSticker, newSticker }),
  threadCreate: (thread: ThreadChannel) => ({ thread }),
  threadDelete: (thread: ThreadChannel) => ({ thread }),
  threadListSync: (threads: Collection<Snowflake, ThreadChannel>) => ({ threads }),
  threadMembersUpdate: (
    oldMembers: Collection<Snowflake, ThreadMember>,
    newMembers: Collection<Snowflake, ThreadMember>
  ) => ({ oldMembers, newMembers }),
  threadMemberUpdate: (oldMember: ThreadMember, newMember: ThreadMember) => ({ oldMember, newMember }),
  threadUpdate: (oldThread: ThreadChannel, newThread: ThreadChannel) => ({ oldThread, newThread }),
  typingStart: (channel: Channel | PartialDMChannel, user: User | PartialUser) => ({ channel, user }),
  userUpdate: (oldUser: User | PartialUser, newUser: User) => ({ oldUser, newUser }),
  voiceStateUpdate: (oldState: VoiceState, newState: VoiceState) => ({ oldState, newState }),
  warn: (message: string) => ({ message }),
  webhookUpdate: (channel: TextChannel) => ({ channel }),
  raw: (...rawArgs: any[]) => ({ rawArgs }),
};
/* eslint-enable @typescript-eslint/explicit-module-boundary-types */

/*
// Validate the above types against DJS types
type ValidFromDjsArgs = {
  [key in keyof ExtendedClientEvents]: (...args: ExtendedClientEvents[key]) => unknown;
};
type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fromDjsArgsIsValid: AssertEquals<typeof fromDjsArgs, ValidFromDjsArgs> = true;
*/

// Extended event types
export type KnownEvents = {
  [key in keyof typeof fromDjsArgs]: ReturnType<typeof fromDjsArgs[key]>;
};

export interface KnownGuildEvents extends KnownEvents {
  channelUpdate: {
    oldChannel: GuildChannel;
    newChannel: GuildChannel;
  };
  channelDelete: {
    channel: GuildChannel;
  };
  messageCreate: {
    message: GuildMessage;
  };
  typingStart: {
    channel: GuildChannel;
    user: User | PartialUser;
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
  "rateLimit",
  "invalidRequestWarning",
  "ready",
  "invalidated",
  "userUpdate",
  "warn",
] as const;

export type ValidEvent = keyof KnownEvents;
export type GlobalEvent = typeof globalEvents[number];
export type GuildEvent = Exclude<ValidEvent, GlobalEvent>;

export function isGlobalEvent(ev: ValidEvent): ev is GlobalEvent {
  return globalEvents.includes(ev as any);
}

export function isGuildEvent(ev: ValidEvent): ev is GuildEvent {
  return !globalEvents.includes(ev as any);
}
