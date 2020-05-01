import { Channel, Guild, GuildChannel, Member, Message, User } from "eris";
import { KnownEventArguments } from "./eventArguments";

type EventToGuild = {
  [P in keyof KnownEventArguments]?: (args: KnownEventArguments[P]) => Guild | undefined;
};

type EventToUser = {
  [P in keyof KnownEventArguments]?: (args: KnownEventArguments[P]) => User | undefined;
};

type EventToChannel = {
  [P in keyof KnownEventArguments]?: (args: KnownEventArguments[P]) => Channel | undefined;
};

type EventToMessage = {
  [P in keyof KnownEventArguments]?: (args: KnownEventArguments[P]) => Message | undefined;
};

export const eventToGuild: EventToGuild = {
  channelCreate: ({ channel }) => (channel as GuildChannel).guild,
  channelDelete: ({ channel }) => (channel as GuildChannel).guild,
  channelPinUpdate: ({ channel }) => (channel as GuildChannel).guild,
  channelUpdate: ({ channel }) => (channel as GuildChannel).guild,
  guildBanAdd: ({ guild }) => guild,
  guildBanRemove: ({ guild }) => guild,
  guildCreate: ({ guild }) => guild,
  guildDelete: ({ guild }) => guild,
  guildEmojisUpdate: ({ guild }) => guild,
  guildMemberAdd: ({ guild }) => guild,
  guildMemberRemove: ({ guild }) => guild,
  guildMemberChunk: ({ guild }) => guild,
  guildMemberUpdate: ({ guild }) => guild,
  guildUnavailable: ({ guild }) => guild,
  guildUpdate: ({ guild }) => guild,
  guildRoleCreate: ({ guild }) => guild,
  guildRoleDelete: ({ guild }) => guild,
  guildRoleUpdate: ({ guild }) => guild,
  messageCreate: ({ message }) => (message.channel as GuildChannel).guild,
  messageDelete: ({ message }) => (message.channel as GuildChannel).guild,
  messageDeleteBulk: ({ messages }) =>
    messages[0] && messages[0].channel && (messages[0].channel as GuildChannel).guild,
  messageReactionAdd: ({ message }) => (message.channel as GuildChannel).guild,
  messageReactionRemove: ({ message }) => (message.channel as GuildChannel).guild,
  messageReactionRemoveAll: ({ message }) => (message.channel as GuildChannel).guild,
  messageUpdate: ({ message }) => (message.channel as GuildChannel).guild,
  presenceUpdate: ({ other }) => (other as Member).guild,
  typingStart: ({ channel }) => (channel as GuildChannel).guild,
  voiceChannelJoin: ({ member }) => member.guild,
  voiceChannelLeave: ({ member }) => member.guild,
  voiceChannelSwitch: ({ member }) => member.guild,
  voiceStateUpdate: ({ member }) => member.guild,
  unavailableGuildCreate: () => undefined,
};

export const eventToUser: EventToUser = {
  guildBanAdd: ({ user }) => user,
  guildBanRemove: ({ user }) => user,
  guildMemberAdd: ({ member }) => member.user,
  guildMemberChunk: () => undefined,
  guildMemberRemove: ({ member }) => member.user,
  guildMemberUpdate: ({ member }) => member.user,
  messageCreate: ({ message }) => message.author,
  messageDelete: ({ message }) => (message as Message).author,
  messageDeleteBulk: () => undefined,
  messageReactionAdd: ({ message, userID }) => {
    const member =
      (message.channel as GuildChannel).guild && (message.channel as GuildChannel).guild.members.get(userID);
    return member && member.user;
  },
  messageReactionRemove: ({ message, userID }) => {
    const member =
      (message.channel as GuildChannel).guild && (message.channel as GuildChannel).guild.members.get(userID);
    return member && member.user;
  },
  messageUpdate: ({ message }) => message.author,
  presenceUpdate: ({ other }) => other.user,
  typingStart: ({ user }) => user,
  userUpdate: ({ user }) => user,
  voiceStateUpdate: ({ member }) => member.user,
};

export const eventToChannel: EventToChannel = {
  messageCreate: ({ message }) => message.channel,
  messageDelete: ({ message }) => message.channel,
  messageDeleteBulk: ({ messages }) => messages[0] && messages[0].channel,
  messageReactionAdd: ({ message }) => message.channel,
  messageReactionRemove: ({ message }) => message.channel,
  messageReactionRemoveEmoji: ({ message }) => message.channel,
  messageReactionRemoveAll: ({ message }) => message.channel,
  channelCreate: ({ channel }) => channel,
  channelDelete: ({ channel }) => channel,
  channelPinUpdate: ({ channel }) => channel,
  channelUpdate: ({ channel }) => channel,
  channelRecipientAdd: ({ channel }) => channel,
  channelRecipientRemove: ({ channel }) => channel,
  typingStart: ({ channel }) => channel,
  voiceChannelJoin: ({ newChannel }) => newChannel,
  voiceChannelLeave: ({ oldChannel }) => oldChannel,
  voiceChannelSwitch: ({ newChannel }) => newChannel,
};

export const eventToMessage: EventToMessage = {
  messageCreate: ({ message }) => message,
  messageDelete: ({ message }) => (message instanceof Message ? message : undefined),
  messageDeleteBulk: ({ messages }) => (messages[0] instanceof Message ? messages[0] : undefined),
  messageReactionAdd: ({ message }) => (message instanceof Message ? message : undefined),
  messageReactionRemove: ({ message }) => (message instanceof Message ? message : undefined),
  messageReactionRemoveAll: ({ message }) => (message instanceof Message ? message : undefined),
  messageUpdate: ({ message }) => message,
};
