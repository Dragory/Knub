import { Channel, ClientUserGuildSettings, Guild, Message, RichEmbed, User } from "discord.js";

export type CallbackFunctionVariadic = (...args: any[]) => void;

export interface IArbitraryObj {
  [key: string]: any;
}

const userMentionRegex = /^<@\!?([0-9]+)>$/;
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
    embed: new RichEmbed({
      description: str,
      color: parseInt("ee4400", 16)
    })
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
  channelPinsUpdate: c => c.guild,
  channelUpdate: (_, c) => c.guild,
  clientUserGuildSettingsUpdate: (s: ClientUserGuildSettings) => s.client.guilds.get(s.guildID),
  emojiCreate: e => e.guild,
  emojiDelete: e => e.guild,
  emojiUpdate: (_, e) => e.guild,
  guildBanAdd: id,
  guildBanRemove: id,
  guildCreate: id,
  guildDelete: id,
  guildMemberAdd: m => m.guild,
  guildMemberAvailable: m => m.guild,
  guildMemberRemove: m => m.guild,
  guildMembersChunk: (_, g) => g,
  guildMemberSpeaking: m => m.guild,
  guildMemberUpdate: (_, m) => m.guild,
  guildUnavailable: id,
  guildUpdate: (_, g) => g,
  message: m => m.guild,
  messageDelete: m => m.guild,
  messageDeleteBulk: c => (c.size ? c.first.guild : undefined),
  messageReactionAdd: r => r.message.guild,
  messageReactionRemove: r => r.message.guild,
  messageReactionRemoveAll: m => m.guild,
  messageUpdate: (_, m) => m.guild,
  presenceUpdate: (_, m) => m.guild,
  roleCreate: r => r.guild,
  roleDelete: r => r.guild,
  roleUpdate: (_, r) => r.guild,
  typingStart: c => c.guild,
  typingStop: c => c.guild,
  voiceStateUpdate: (_, m) => m.guild
};

export const eventToUser: IEventToUser = {
  clientUserGuildSettingsUpdate: (s: ClientUserGuildSettings) => s.client.user,
  guildBanAdd: (_, u) => u,
  guildBanRemove: (_, u) => u,
  guildMemberAdd: m => m.user,
  guildMemberAvailable: m => m.user,
  guildMemberRemove: m => m.user,
  guildMemberSpeaking: m => m.user,
  guildMemberUpdate: (_, m) => m.user,
  message: m => m.author,
  messageReactionAdd: (_, u) => u,
  messageReactionRemove: (_, u) => u,
  messageUpdate: (_, m) => m.author,
  presenceUpdate: (_, m) => m.user,
  typingStart: (_, u) => u,
  typingStop: (_, u) => u,
  userNoteUpdate: id,
  userUpdate: id,
  voiceStateUpdate: (_, m) => m.user
};

export const eventToChannel: IEventToChannel = {
  channelCreate: id,
  channelDelete: id,
  channelPinsUpdate: id,
  channelUpdate: (_, c) => c,
  typingStart: id,
  typingStop: id
};

export const eventToMessage: IEventToMessage = {
  message: id,
  messageDelete: id,
  messageReactionAdd: r => r.message,
  messageReactionRemove: r => r.message,
  messageReactionRemoveAll: id,
  messageUpdate: (_, m) => m
};
