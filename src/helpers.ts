import { Client, Message, Emoji } from "eris";

export function waitForReaction(
  bot: Client,
  msg: Message,
  availableReactions: string[],
  timeout = 15000
): Promise<Emoji> {
  return new Promise(async resolve => {
    for (const reaction of availableReactions) {
      await msg.addReaction(reaction);
    }

    const timeoutTimer = setTimeout(() => {
      msg.removeReactions().catch(() => {}); // tslint:disable-line
      resolve(null);
    }, timeout);

    bot.on("messageReactionAdd", (evMsg, emoji, userId) => {
      if (evMsg.id !== msg.id || userId === bot.user.id) return;
      clearTimeout(timeoutTimer);
      msg.removeReactions();
      resolve(emoji);
    });
  });
}

export function reply(msg: Message, content, file) {
  msg.channel.createMessage(content, file);
}
