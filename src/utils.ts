import { MessageEmbed } from "discord.js";

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
    embed: new MessageEmbed({
      description: str,
      color: parseInt("ee4400", 16)
    })
  };
}
