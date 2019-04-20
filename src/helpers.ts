import { Client, Message, Emoji, TextChannel } from "eris";

export function waitForReaction(
  bot: Client,
  msg: Message,
  availableReactions: string[],
  restrictToUserId: string = null,
  timeout = 15000
): Promise<Emoji> {
  return new Promise(async resolve => {
    // tslint:disable-next-line
    availableReactions.forEach(reaction => msg.addReaction(reaction).catch(() => {}));

    const timeoutTimer = setTimeout(() => {
      msg.removeReactions().catch(() => {}); // tslint:disable-line
      resolve(null);
    }, timeout);

    bot.on("messageReactionAdd", (evMsg, emoji, userId) => {
      if (evMsg.id !== msg.id || userId === bot.user.id) return;
      if (restrictToUserId && userId !== restrictToUserId) return;

      const user = bot.users.get(userId);
      if (user && user.bot) return;

      clearTimeout(timeoutTimer);
      msg.removeReactions().catch(() => {}); // tslint:disable-line
      resolve(emoji);
    });
  });
}

export function waitForReply(
  bot: Client,
  channel: TextChannel,
  restrictToUserId: string = null,
  timeout = 15000
): Promise<Message> {
  return new Promise(async resolve => {
    const timeoutTimer = setTimeout(() => {
      resolve(null);
    }, timeout);

    bot.on("messageCreate", msg => {
      if (!msg.channel || msg.channel.id !== channel.id) return;
      if (msg.author && msg.author.id === bot.user.id) return;
      if (restrictToUserId && (!msg.author || msg.author.id !== restrictToUserId)) return;

      clearTimeout(timeoutTimer);
      resolve(msg);
    });
  });
}

export function reply(msg: Message, content, file) {
  msg.channel.createMessage(content, file);
}

export function disableLinkPreviews(str: string): string {
  return str.replace(/(?<!<)(https?:\/\/\S+)/gi, "<$1>");
}

export function deactivateMentions(content: string): string {
  return content.replace(/@/g, "@\u200b");
}

export function disableCodeBlocks(content: string): string {
  return content.replace(/`/g, "`\u200b");
}
