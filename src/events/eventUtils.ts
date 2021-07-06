import { KnownEvents } from "./eventTypes";
import { Channel, Guild, GuildChannel, Message, PartialDMChannel, PartialUser, TextChannel, User } from "discord.js";

type EventToGuild = {
  [P in keyof KnownEvents]?: (args: KnownEvents[P]) => Guild | undefined;
};

type EventToUser = {
  [P in keyof KnownEvents]?: (args: KnownEvents[P]) => User | PartialUser | undefined;
};

type EventToChannel = {
  [P in keyof KnownEvents]?: (args: KnownEvents[P]) => Channel | PartialDMChannel | undefined;
};

type EventToMessage = {
  [P in keyof KnownEvents]?: (args: KnownEvents[P]) => Message | undefined;
};

export const eventToGuild: EventToGuild = {
  channelCreate: ({ channel }) => channel.guild,
  channelDelete: ({ channel }) => (channel as GuildChannel).guild,
  channelUpdate: ({ newChannel }) => (newChannel as GuildChannel).guild,
  guildBanAdd: ({ ban }) => ban.guild,
  guildBanRemove: ({ ban }) => ban.guild,
  guildCreate: ({ guild }) => guild,
  guildDelete: ({ guild }) => guild,
  guildMemberAdd: ({ member }) => member.guild,
  guildMemberRemove: ({ member }) => member.guild,
  guildMemberUpdate: ({ newMember }) => newMember.guild,
  guildUnavailable: ({ guild }) => guild,
  guildUpdate: ({ newGuild }) => newGuild,
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
  typingStart: ({ channel }) => (channel as TextChannel)?.guild,
  voiceStateUpdate: ({ oldState, newState }) => newState?.guild ?? oldState?.guild,
  interactionCreate: ({ interaction }) => interaction.guild ?? undefined,
  threadCreate: ({ thread }) => thread.guild,
  threadDelete: ({ thread }) => thread.guild,
  threadUpdate: ({ oldThread, newThread }) => newThread.guild ?? oldThread.guild,
  threadListSync: ({ threads }) => threads.first()?.guild ?? undefined,
  threadMemberUpdate: ({ oldMember, newMember }) =>
    newMember.guildMember?.guild ?? oldMember.guildMember?.guild ?? undefined,
  threadMembersUpdate: ({ oldMembers, newMembers }) =>
    newMembers.first()?.guildMember?.guild ?? oldMembers.first()?.guildMember?.guild ?? undefined,
  stageInstanceCreate: ({ stageInstance }) => stageInstance.guild ?? undefined,
  stageInstanceDelete: ({ stageInstance }) => stageInstance.guild ?? undefined,
  stageInstanceUpdate: ({ oldStageInstance, newStageInstance }) =>
    newStageInstance.guild ?? oldStageInstance.guild ?? undefined,
};

export const eventToUser: EventToUser = {
  guildBanAdd: ({ ban }) => ban.user,
  guildBanRemove: ({ ban }) => ban.user,
  guildMemberAdd: ({ member }) => member.user,
  guildMemberRemove: ({ member }) => member.user ?? undefined,
  guildMemberUpdate: ({ newMember }) => newMember.user,
  messageCreate: ({ message }) => message.author,
  messageDelete: ({ message }) => (message as Message).author,
  messageReactionAdd: ({ user }) => user,
  messageUpdate: ({ newMessage }) => newMessage.author ?? undefined,
  presenceUpdate: ({ newPresence }) => newPresence.user ?? undefined,
  typingStart: ({ user }) => user,
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
  typingStart: ({ channel }) => channel,
  voiceStateUpdate: ({ oldState, newState }) => newState?.channel ?? oldState?.channel ?? undefined,
  interactionCreate: ({ interaction }) => interaction.channel ?? undefined,
  threadCreate: ({ thread }) => thread,
  threadDelete: ({ thread }) => thread,
  threadUpdate: ({ oldThread, newThread }) => newThread ?? oldThread,
  threadMembersUpdate: ({ oldMembers, newMembers }) =>
    newMembers.first()?.thread ?? oldMembers.first()?.thread ?? undefined,
  stageInstanceCreate: ({ stageInstance }) => stageInstance.channel ?? undefined,
  stageInstanceDelete: ({ stageInstance }) => stageInstance.channel ?? undefined,
  stageInstanceUpdate: ({ oldStageInstance, newStageInstance }) =>
    newStageInstance.channel ?? oldStageInstance.channel ?? undefined,
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
  interactionCreate: ({ interaction }) =>
    interaction.isMessageComponent() ? (interaction.message as Message) : undefined,
};
