/**
 * @file Public helper functions/types
 */

import { get } from "./utils";
import { GuildPluginData } from "./plugins/PluginData";
import { getMemberLevel as _getMemberLevel } from "./plugins/pluginUtils";
import { Client, GuildMember, Invite, Message, TextBasedChannelFields, TextChannel } from "discord.js";

/**
 * Splits a string into chunks, preferring to split at newlines if possible
 */
export function splitIntoCleanChunks(str: string, maxChunkLength = 2000): string[] {
  if (str.length < maxChunkLength) {
    return [str];
  }

  const chunks: string[] = [];

  while (str.length) {
    if (str.length <= maxChunkLength) {
      chunks.push(str);
      break;
    }

    const slice = str.slice(0, maxChunkLength);

    const lastLineBreakIndex = slice.lastIndexOf("\n");
    if (lastLineBreakIndex === -1) {
      chunks.push(str.slice(0, maxChunkLength));
      str = str.slice(maxChunkLength);
    } else {
      chunks.push(str.slice(0, lastLineBreakIndex));
      str = str.slice(lastLineBreakIndex + 1);
    }
  }

  return chunks;
}

/**
 * Splits a message into chunks that fit into Discord's message length limit (2000) while also retaining leading and
 * trailing line breaks, open code blocks, etc. between chunks
 */
export function splitMessageIntoChunks(str: string, chunkLength = 1990): string[] {
  // We don't split at exactly 2000 since some of the stuff below adds extra length to the chunks
  const chunks = splitIntoCleanChunks(str, chunkLength);

  let openCodeBlock = false;
  return chunks.map((chunk) => {
    // If the chunk starts with a newline, add an invisible unicode char so Discord doesn't strip it away
    if (chunk[0] === "\n") chunk = "\u200b" + chunk;
    // If the chunk ends with a newline, add an invisible unicode char so Discord doesn't strip it away
    if (chunk[chunk.length - 1] === "\n") chunk = chunk + "\u200b";
    // If the previous chunk had an open code block, open it here again
    if (openCodeBlock) {
      openCodeBlock = false;
      if (chunk.startsWith("```")) {
        // Edge case: Chunk starts with a code block delimiter after the last one ended with an open code block.
        // This can happen if we split immediately before a code block ends.
        // Fix: Just strip the code block delimiter away from here, we don't need it anymore
        chunk = chunk.slice(3);
      } else {
        chunk = "```" + chunk;
      }
    }
    // If the chunk has an open code block, close it and open it again in the next chunk
    const codeBlockDelimiters = chunk.match(/```/g);
    if (codeBlockDelimiters && codeBlockDelimiters.length % 2 !== 0) {
      chunk += "```";
      openCodeBlock = true;
    }

    return chunk;
  });
}

/**
 * Sends a message to the specified channel, splitting it into multiple shorter messages if the message text goes over
 * the Discord message length limit (2000)
 */
export async function createChunkedMessage(channel: TextBasedChannelFields, messageText: string): Promise<Message[]> {
  const chunks = splitMessageIntoChunks(messageText);
  const messages: Message[] = [];

  for (const chunk of chunks) {
    messages.push(await channel.send(chunk));
  }

  return messages;
}

/**
 * Returns a promise that resolves when the specified channel gets a new message, optionally restricted to a message by
 * a specific user only
 */
export function waitForReply(
  client: Client,
  channel: TextChannel,
  restrictToUserId?: string,
  timeout = 15000
): Promise<Message | null> {
  return new Promise((resolve) => {
    const timeoutTimer = setTimeout(() => {
      resolve(null);
    }, timeout);

    client.on("messageCreate", (msg) => {
      if (!msg.channel || msg.channel.id !== channel.id) return;
      if (msg.author && msg.author.id === client.user!.id) return;
      if (restrictToUserId && (!msg.author || msg.author.id !== restrictToUserId)) return;

      clearTimeout(timeoutTimer);
      resolve(msg);
    });
  });
}

/**
 * Disables link previews in the string by wrapping detected links in < and >
 */
export function disableLinkPreviews(str: string): string {
  return str.replace(/(?<!<)(https?:\/\/\S+)/gi, "<$1>");
}

/**
 * Deactivates user/role mentions in the string by adding an invisible unicode char after each @-character
 */
export function deactivateMentions(str: string): string {
  return str.replace(/@/g, "@\u200b");
}

/**
 * Disables code blocks in the string by adding an invisible unicode char after each backtick
 */
export function disableCodeBlocks(str: string): string {
  return str.replace(/`/g, "`\u200b");
}

/**
 * Returns the full invite link for an invite object
 */
export function getInviteLink(inv: Invite): string {
  return `https://discord.gg/${inv.code}`;
}

export function hasPermission(config: unknown, permission: string): boolean {
  return get(config, permission) === true;
}

export function getMemberLevel(pluginData: GuildPluginData<any>, member: GuildMember): number {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
  const levels = pluginData.fullConfig.levels ?? {};
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return _getMemberLevel(levels, member, pluginData.guild);
}

export { userMentionRegex, channelMentionRegex, roleMentionRegex, snowflakeRegex } from "./utils";
