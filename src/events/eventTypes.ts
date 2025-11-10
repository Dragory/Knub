import type { ClientEvents, NonThreadGuildBasedChannel, Typing } from "discord.js";
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
  applicationCommandPermissionsUpdate: (data) => ({ data }),
  autoModerationActionExecution: (autoModerationActionExecution) => ({
    autoModerationActionExecution,
  }),
  autoModerationRuleCreate: (autoModerationRule) => ({ autoModerationRule }),
  autoModerationRuleDelete: (autoModerationRule) => ({ autoModerationRule }),
  autoModerationRuleUpdate: (oldAutoModerationRule, newAutoModerationRule) => ({
    oldAutoModerationRule,
    newAutoModerationRule,
  }),
  cacheSweep: (message) => ({ message }),
  channelCreate: (channel) => ({ channel }),
  channelDelete: (channel) => ({ channel }),
  channelPinsUpdate: (channel, date) => ({ channel, date }),
  channelUpdate: (oldChannel, newChannel) => ({ oldChannel, newChannel }),
  clientReady: (client) => ({ client }),
  debug: (message) => ({ message }),
  emojiCreate: (emoji) => ({ emoji }),
  emojiDelete: (emoji) => ({ emoji }),
  emojiUpdate: (oldEmoji, newEmoji) => ({ oldEmoji, newEmoji }),
  entitlementCreate: (entitlement) => ({ entitlement }),
  entitlementDelete: (entitlement) => ({ entitlement }),
  entitlementUpdate: (oldEntitlement, newEntitlement) => ({ oldEntitlement, newEntitlement }),
  error: (error) => ({ error }),
  guildAuditLogEntryCreate: (auditLogEntry, guild) => ({ auditLogEntry, guild }),
  guildAvailable: (guild) => ({ guild }),
  guildBanAdd: (ban) => ({ ban }),
  guildBanRemove: (ban) => ({ ban }),
  guildCreate: (guild) => ({ guild }),
  guildDelete: (guild) => ({ guild }),
  guildIntegrationsUpdate: (guild) => ({ guild }),
  guildMemberAdd: (member) => ({ member }),
  guildMemberAvailable: (member) => ({ member }),
  guildMemberRemove: (member) => ({ member }),
  guildMembersChunk: (members, guild, data) => ({ members, guild, data }),
  guildMemberUpdate: (oldMember, newMember) => ({
    oldMember,
    newMember,
  }),
  guildScheduledEventCreate: (guildScheduledEvent) => ({ guildScheduledEvent }),
  guildScheduledEventUpdate: (oldGuildScheduledEvent, newGuildScheduledEvent) => ({
    oldGuildScheduledEvent,
    newGuildScheduledEvent,
  }),
  guildScheduledEventDelete: (guildScheduledEvent) => ({
    guildScheduledEvent,
  }),
  guildScheduledEventUserAdd: (guildScheduledEvent, user) => ({
    guildScheduledEvent,
    user,
  }),
  guildScheduledEventUserRemove: (guildScheduledEvent, user) => ({
    guildScheduledEvent,
    user,
  }),
  guildSoundboardSoundCreate: (soundboardSound) => ({ soundboardSound }),
  guildSoundboardSoundDelete: (soundboardSound) => ({ soundboardSound }),
  guildSoundboardSoundUpdate: (oldSoundboardSound, newSoundboardSound) => ({ oldSoundboardSound, newSoundboardSound }),
  guildSoundboardSoundsUpdate: (soundboardSounds, guild) => ({ soundboardSounds, guild }),
  guildUnavailable: (guild) => ({ guild }),
  guildUpdate: (oldGuild, newGuild) => ({ oldGuild, newGuild }),
  interactionCreate: (interaction) => ({ interaction }),
  invalidated: () => ({}),
  inviteCreate: (invite) => ({ invite }),
  inviteDelete: (invite) => ({ invite }),
  messageCreate: (message) => ({ message }),
  messageDelete: (message) => ({ message }),
  messageDeleteBulk: (messages) => ({ messages }),
  messagePollVoteAdd: (pollAnswer, userId) => ({ pollAnswer, userId }),
  messagePollVoteRemove: (pollAnswer, userId) => ({ pollAnswer, userId }),
  messageReactionAdd: (reaction, user) => ({
    reaction,
    user,
  }),
  messageReactionRemove: (reaction, user) => ({
    reaction,
    user,
  }),
  messageReactionRemoveAll: (message) => ({ message }),
  messageReactionRemoveEmoji: (reaction) => ({ reaction }),
  messageUpdate: (oldMessage, newMessage) => ({
    oldMessage,
    newMessage,
  }),
  presenceUpdate: (oldPresence, newPresence) => ({ oldPresence, newPresence }),
  ready: () => ({}),
  roleCreate: (role) => ({ role }),
  roleDelete: (role) => ({ role }),
  roleUpdate: (oldRole, newRole) => ({ oldRole, newRole }),
  shardDisconnect: (closeEvent, shardID) => ({ closeEvent, shardID }),
  shardError: (error, shardID) => ({ error, shardID }),
  shardReady: (shardID, unavailableGuilds) => ({ shardID, unavailableGuilds }),
  shardReconnecting: (shardID) => ({ shardID }),
  shardResume: (shardID, replayedEvents) => ({ shardID, replayedEvents }),
  soundboardSounds: (soundboardSounds, guild) => ({ soundboardSounds, guild }),
  stageInstanceCreate: (stageInstance) => ({ stageInstance }),
  stageInstanceDelete: (stageInstance) => ({ stageInstance }),
  stageInstanceUpdate: (oldStageInstance, newStageInstance) => ({
    oldStageInstance,
    newStageInstance,
  }),
  stickerCreate: (sticker) => ({ sticker }),
  stickerDelete: (sticker) => ({ sticker }),
  stickerUpdate: (oldSticker, newSticker) => ({ oldSticker, newSticker }),
  subscriptionCreate: (subscription) => ({ subscription }),
  subscriptionDelete: (subscription) => ({ subscription }),
  subscriptionUpdate: (oldSubscription, newSubscription) => ({ oldSubscription, newSubscription }),
  threadCreate: (thread, newlyCreated) => ({ thread, newlyCreated }),
  threadDelete: (thread) => ({ thread }),
  threadListSync: (threads, guild) => ({ threads, guild }),
  threadMemberUpdate: (oldMember, newMember) => ({ oldMember, newMember }),
  threadMembersUpdate: (addedMembers, removedMembers, thread) => ({ addedMembers, removedMembers, thread }),
  threadUpdate: (oldThread, newThread) => ({ oldThread, newThread }),
  typingStart: (typing) => ({ typing }),
  userUpdate: (oldUser, newUser) => ({ oldUser, newUser }),
  voiceChannelEffectSend: (voiceChannelEffect) => ({ voiceChannelEffect }),
  voiceStateUpdate: (oldState, newState) => ({ oldState, newState }),
  warn: (message) => ({ message }),
  webhookUpdate: (channel) => ({ channel }),
  webhooksUpdate: (channel) => ({ channel }),
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
