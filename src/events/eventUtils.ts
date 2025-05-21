import {
  type Channel,
  type Guild,
  type GuildChannel,
  Message,
  type PartialDMChannel,
  type PartialUser,
  type TextChannel,
  type User,
} from "discord.js";
import type { KnownEvents } from "./eventTypes.ts";

type EventToGuild = {
  [P in keyof KnownEvents]?: (args: KnownEvents[P]) => Guild | null | undefined;
};

type EventToUser = {
  [P in keyof KnownEvents]?: (args: KnownEvents[P]) => User | PartialUser | null | undefined;
};

type EventToChannel = {
  [P in keyof KnownEvents]?: (args: KnownEvents[P]) => Channel | PartialDMChannel | null | undefined;
};

type EventToMessage = {
  [P in keyof KnownEvents]?: (args: KnownEvents[P]) => Message | null | undefined;
};

export const eventToGuild: EventToGuild = {
  autoModerationActionExecution: ({ autoModerationActionExecution }) => autoModerationActionExecution.guild,
  autoModerationRuleCreate: ({ autoModerationRule }) => autoModerationRule.guild,
  autoModerationRuleDelete: ({ autoModerationRule }) => autoModerationRule.guild,
  autoModerationRuleUpdate: ({ newAutoModerationRule }) => newAutoModerationRule.guild,
  channelCreate: ({ channel }) => channel.guild,
  channelDelete: ({ channel }) => (channel as GuildChannel).guild,
  channelUpdate: ({ newChannel }) => (newChannel as GuildChannel).guild,
  entitlementCreate: ({ entitlement }) => entitlement.guild,
  entitlementDelete: ({ entitlement }) => entitlement.guild,
  entitlementUpdate: ({ newEntitlement }) => newEntitlement.guild,
  guildAuditLogEntryCreate: ({ guild }) => guild,
  guildBanAdd: ({ ban }) => ban.guild,
  guildBanRemove: ({ ban }) => ban.guild,
  guildCreate: ({ guild }) => guild,
  guildDelete: ({ guild }) => guild,
  guildMemberAdd: ({ member }) => member.guild,
  guildMemberRemove: ({ member }) => member.guild,
  guildMemberUpdate: ({ newMember }) => newMember.guild,
  guildUnavailable: ({ guild }) => guild,
  guildUpdate: ({ newGuild }) => newGuild,
  guildScheduledEventCreate: ({ guildScheduledEvent }) => guildScheduledEvent.guild,
  guildScheduledEventUpdate: ({ newGuildScheduledEvent }) => newGuildScheduledEvent.guild,
  guildScheduledEventDelete: ({ guildScheduledEvent }) => guildScheduledEvent.guild,
  guildScheduledEventUserAdd: ({ guildScheduledEvent }) => guildScheduledEvent.guild,
  guildScheduledEventUserRemove: ({ guildScheduledEvent }) => guildScheduledEvent.guild,
  guildSoundboardSoundCreate: ({ soundboardSound }) => soundboardSound.guild,
  guildSoundboardSoundDelete: ({ soundboardSound }) => soundboardSound.guild,
  guildSoundboardSoundUpdate: ({ newSoundboardSound }) => newSoundboardSound.guild,
  roleCreate: ({ role }) => role.guild,
  roleDelete: ({ role }) => role.guild,
  roleUpdate: ({ newRole }) => newRole.guild,
  messageCreate: ({ message }) => (message.channel as TextChannel).guild,
  messageDelete: ({ message }) => (message.channel as TextChannel).guild,
  messageDeleteBulk: ({ messages }) => (messages.first()?.channel as TextChannel)?.guild,
  messageReactionAdd: ({ reaction }) => (reaction.message.channel as TextChannel)?.guild,
  messageReactionRemove: ({ reaction }) => (reaction.message.channel as TextChannel)?.guild,
  messageReactionRemoveAll: ({ message }) => (message.channel as TextChannel)?.guild,
  messageUpdate: ({ newMessage }) => (newMessage.channel as TextChannel).guild,
  presenceUpdate: ({ newPresence }) => newPresence.member?.guild,
  typingStart: ({ typing }) => typing.guild,
  voiceStateUpdate: ({ oldState, newState }) => newState?.guild ?? oldState?.guild,
  interactionCreate: ({ interaction }) => interaction.guild ?? undefined,
  soundboardSounds: ({ guild }) => guild,
  threadCreate: ({ thread }) => thread.guild,
  threadDelete: ({ thread }) => thread.guild,
  threadUpdate: ({ oldThread, newThread }) => newThread.guild ?? oldThread.guild,
  threadListSync: ({ threads }) => threads.first()?.guild ?? undefined,
  threadMemberUpdate: ({ oldMember, newMember }) =>
    newMember.guildMember?.guild ?? oldMember.guildMember?.guild ?? undefined,
  threadMembersUpdate: ({ thread }) => thread.guild,
  stageInstanceCreate: ({ stageInstance }) => stageInstance.guild ?? undefined,
  stageInstanceDelete: ({ stageInstance }) => stageInstance.guild ?? undefined,
  stageInstanceUpdate: ({ oldStageInstance, newStageInstance }) =>
    newStageInstance.guild ?? oldStageInstance?.guild ?? undefined,
  emojiCreate: ({ emoji }) => emoji.guild,
  emojiDelete: ({ emoji }) => emoji.guild,
  emojiUpdate: ({ newEmoji }) => newEmoji.guild,
  stickerCreate: ({ sticker }) => sticker.guild ?? undefined,
  stickerDelete: ({ sticker }) => sticker.guild ?? undefined,
  stickerUpdate: ({ oldSticker, newSticker }) => newSticker.guild ?? oldSticker.guild ?? undefined,
  voiceChannelEffectSend: ({ voiceChannelEffect }) => voiceChannelEffect.guild,
};

export const eventToUser: EventToUser = {
  guildBanAdd: ({ ban }) => ban.user,
  guildBanRemove: ({ ban }) => ban.user,
  guildMemberAdd: ({ member }) => member.user,
  guildMemberRemove: ({ member }) => member.user ?? undefined,
  guildMemberUpdate: ({ newMember }) => newMember.user,
  guildSoundboardSoundCreate: ({ soundboardSound }) => soundboardSound.user,
  guildSoundboardSoundDelete: ({ soundboardSound }) => soundboardSound.user,
  guildSoundboardSoundUpdate: ({ newSoundboardSound }) => newSoundboardSound.user,
  messageCreate: ({ message }) => message.author,
  messageDelete: ({ message }) => (message as Message).author,
  messageReactionAdd: ({ user }) => user,
  messageUpdate: ({ newMessage }) => newMessage.author ?? undefined,
  presenceUpdate: ({ newPresence }) => newPresence.user ?? undefined,
  typingStart: ({ typing }) => typing.user,
  userUpdate: ({ newUser }) => newUser,
  voiceStateUpdate: ({ newState }) => newState.member?.user,
  interactionCreate: ({ interaction }) => interaction.user ?? undefined,
};

export const eventToChannel: EventToChannel = {
  messageCreate: ({ message }) => message.channel,
  messageDelete: ({ message }) => message.channel,
  messageDeleteBulk: ({ messages }) => messages.first()?.channel,
  messageReactionAdd: ({ reaction }) => reaction.message.channel,
  messageReactionRemove: ({ reaction }) => reaction.message.channel,
  messageReactionRemoveEmoji: ({ reaction }) => reaction.message.channel,
  messageReactionRemoveAll: ({ message }) => message.channel,
  channelCreate: ({ channel }) => channel,
  channelDelete: ({ channel }) => channel,
  channelUpdate: ({ newChannel }) => newChannel,
  typingStart: ({ typing }) => typing.channel,
  voiceStateUpdate: ({ oldState, newState }) => newState?.channel ?? oldState?.channel ?? undefined,
  interactionCreate: ({ interaction }) => interaction.channel ?? undefined,
  threadCreate: ({ thread }) => thread,
  threadDelete: ({ thread }) => thread,
  threadUpdate: ({ oldThread, newThread }) => newThread ?? oldThread,
  threadMembersUpdate: ({ thread }) => thread.parent,
  stageInstanceCreate: ({ stageInstance }) => stageInstance.channel ?? undefined,
  stageInstanceDelete: ({ stageInstance }) => stageInstance.channel ?? undefined,
  stageInstanceUpdate: ({ oldStageInstance, newStageInstance }) =>
    newStageInstance.channel ?? oldStageInstance?.channel ?? undefined,
  voiceChannelEffectSend: ({ voiceChannelEffect }) => voiceChannelEffect.channel,
};

export const eventToMessage: EventToMessage = {
  messageCreate: ({ message }) => message,
  messageDelete: ({ message }) => (message instanceof Message ? message : undefined),
  messageDeleteBulk: ({ messages }) => {
    const message = messages.first();
    return message && message instanceof Message ? message : undefined;
  },
  messageReactionAdd: ({ reaction }) => (reaction.message instanceof Message ? reaction.message : undefined),
  messageReactionRemove: ({ reaction }) => (reaction.message instanceof Message ? reaction.message : undefined),
  messageReactionRemoveAll: ({ message }) => (message instanceof Message ? message : undefined),
  messageUpdate: ({ newMessage }) => (newMessage instanceof Message ? newMessage : undefined),
  interactionCreate: ({ interaction }) => (interaction.isMessageComponent() ? interaction.message : undefined),
};
