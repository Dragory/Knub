import { Client, Message, Emoji } from "eris";

export function waitForReaction(
  bot: Client,
  msg: Message,
  availableReactions: string[],
  restrictToUserId: string = null,
  timeout = 15000
): Promise<Emoji> {
  return new Promise(async resolve => {
    await Promise.all(availableReactions.map(reaction => msg.addReaction(reaction)));

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

export function reply(msg: Message, content, file) {
  msg.channel.createMessage(content, file);
}
