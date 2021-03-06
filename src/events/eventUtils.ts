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
  message: ({ message }) => (message.channel as TextChannel).guild,
  messageDelete: ({ message }) => (message.channel as TextChannel).guild,
  messageDeleteBulk: ({ messages }) => (messages.first()?.channel as TextChannel)?.guild,
  messageReactionAdd: ({ reaction }) => (reaction.message.channel as TextChannel)?.guild,
  messageReactionRemove: ({ reaction }) => (reaction.message.channel as TextChannel)?.guild,
  messageReactionRemoveAll: ({ message }) => (message.channel as TextChannel)?.guild,
  messageUpdate: ({ newMessage }) => (newMessage.channel as TextChannel).guild,
  presenceUpdate: ({ newPresence }) => newPresence.member?.guild,
  typingStart: ({ channel }) => (channel as TextChannel)?.guild,
  voiceStateUpdate: ({ oldState, newState }) => newState?.guild ?? oldState?.guild,
  interaction: ({ interaction }) => interaction.guild ?? undefined,
};

export const eventToUser: EventToUser = {
  guildBanAdd: ({ ban }) => ban.user,
  guildBanRemove: ({ ban }) => ban.user,
  guildMemberAdd: ({ member }) => member.user,
  guildMemberRemove: ({ member }) => member.user ?? undefined,
  guildMemberUpdate: ({ newMember }) => newMember.user,
  message: ({ message }) => message.author,
  messageDelete: ({ message }) => (message as Message).author,
  messageReactionAdd: ({ user }) => user,
  messageUpdate: ({ newMessage }) => newMessage.author ?? undefined,
  presenceUpdate: ({ newPresence }) => newPresence.user ?? undefined,
  typingStart: ({ user }) => user,
  userUpdate: ({ newUser }) => newUser,
  voiceStateUpdate: ({ newState }) => newState.member?.user,
  interaction: ({ interaction }) => interaction.user ?? undefined,
};

export const eventToChannel: EventToChannel = {
  message: ({ message }) => message.channel,
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
  interaction: ({ interaction }) => interaction.channel ?? undefined,
};

export const eventToMessage: EventToMessage = {
  message: ({ message }) => message,
  messageDelete: ({ message }) => (message instanceof Message ? message : undefined),
  messageDeleteBulk: ({ messages }) => {
    const message = messages.first();
    return message && message instanceof Message ? message : undefined;
  },
  messageReactionAdd: ({ reaction }) => (reaction.message instanceof Message ? reaction.message : undefined),
  messageReactionRemove: ({ reaction }) => (reaction.message instanceof Message ? reaction.message : undefined),
  messageReactionRemoveAll: ({ message }) => (message instanceof Message ? message : undefined),
  messageUpdate: ({ newMessage }) => (newMessage instanceof Message ? newMessage : undefined),
  interaction: ({ interaction }) => (interaction.isMessageComponent() ? (interaction.message as Message) : undefined),
};
