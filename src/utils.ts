import { Channel, Guild, Message, User } from "eris";

export type CallbackFunctionVariadic = (...args: any[]) => void;

const userMentionRegex = /^<@!?([0-9]+)>$/;
const channelMentionRegex = /^<@([0-9]+)>$/;
const roleMentionRegex = /^<&([0-9]+)>$/;

export function getUserId(str: string) {
  str = str.trim();

  if (str.match(/^[0-9]+$/)) {
    // User ID
    return str;
  } else {
    const mentionMatch = str.match(userMentionRegex);
    if (mentionMatch) {
      return mentionMatch[1];
    }
  }

  return null;
}

export function getChannelId(str: string) {
  str = str.trim();

  if (str.match(/^[0-9]+$/)) {
    // Channel ID
    return str;
  } else {
    const mentionMatch = str.match(channelMentionRegex);
    if (mentionMatch) {
      return mentionMatch[1];
    }
  }

  return null;
}

export function getRoleId(str: string) {
  str = str.trim();

  if (str.match(/^[0-9]+$/)) {
    // Role ID
    return str;
  } else {
    const mentionMatch = str.match(roleMentionRegex);
    if (mentionMatch) {
      return mentionMatch[1];
    }
  }

  return null;
}

export function errorEmbed(str: string) {
  return {
    description: str,
    color: parseInt("ee4400", 16)
  };
}

const id = v => v;

export interface IEventToGuild {
  [key: string]: (...args: any[]) => Guild | undefined;
}

export interface IEventToUser {
  [key: string]: (...args: any[]) => User | undefined;
}

export interface IEventToChannel {
  [key: string]: (...args: any[]) => Channel | undefined;
}

export interface IEventToMessage {
  [key: string]: (...args: any[]) => Message | undefined;
}

export const eventToGuild: IEventToGuild = {
  channelCreate: c => c.guild,
  channelDelete: c => c.guild,
  channelPinUpdate: c => c.guild,
  channelUpdate: c => c.guild,
  guildBanAdd: id,
  guildBanRemove: id,
  guildCreate: id,
  guildDelete: id,
  guildEmojisUpdate: id,
  guildMemberAdd: id,
  guildMemberRemove: id,
  guildMemberChunk: id,
  guildMemberUpdate: id,
  guildUnavailable: id,
  guildUpdate: id,
  guildRoleCreate: id,
  guildRoleDelete: id,
  guildRoleUpdate: id,
  messageCreate: m => m.channel.guild,
  messageDelete: m => m.channel.guild,
  messageDeleteBulk: c => c[0] && c[0].channel && c[0].channel.guild_id,
  messageReactionAdd: m => m.channel.guild,
  messageReactionRemove: m => m.channel.guild,
  messageReactionRemoveAll: m => m.channel.guild,
  messageUpdate: m => m.channel.guild,
  presenceUpdate: m => m.guild,
  typingStart: c => c.guild,
  typingStop: c => c.guild,
  voiceChannelJoin: m => m.guild,
  voiceChannelLeave: m => m.guild,
  voiceChannelSwitch: m => m.guild,
  voiceStateUpdate: m => m.guild,
  unavailableGuildCreate: id
};

export const eventToUser: IEventToUser = {
  guildBanAdd: (_, u) => u,
  guildBanRemove: (_, u) => u,
  guildMemberAdd: (_, m) => m.user,
  guildMemberChunk: (_, m) => m[0] && m[0].user,
  guildMemberRemove: m => m.user,
  guildMemberUpdate: (_, m) => m.user,
  messageCreate: m => m.author,
  messageDelete: m => m.author,
  messageDeleteBulk: m => m[0] && m.author,
  messageReactionAdd: (m, _, uId) => {
    const member = m.channel.guild && m.channel.guild.members.get(uId);
    return member && member.user;
  },
  messageReactionRemove: (m, _, uId) => {
    const member = m.channel.guild && m.channel.guild.members.get(uId);
    return member && member.user;
  },
  messageUpdate: m => m.author,
  presenceUpdate: m => m.user,
  typingStart: (_, u) => u,
  typingStop: (_, u) => u,
  userUpdate: id,
  voiceStateUpdate: m => m.user
};

export const eventToChannel: IEventToChannel = {
  channelCreate: id,
  channelDelete: id,
  channelPinsUpdate: id,
  channelUpdate: id,
  channelRecipientAdd: id,
  channelRecipientRemove: id,
  typingStart: id
};

export const eventToMessage: IEventToMessage = {
  messageCreate: id,
  messageDelete: id,
  messageDeleteBulk: m => m[0],
  messageReactionAdd: id,
  messageReactionRemove: id,
  messageReactionRemoveAll: id,
  messageUpdate: id
};
