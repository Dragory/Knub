import { Client, Message } from "eris";

export function waitForReaction(bot: Client, msg: Message, availableReactions: string[]) {
  return new Promise(async resolve => {
    for (const reaction in availableReactions) {
      await msg.addReaction(reaction);
    }

    bot.on("messageReactionAdd", (evMsg, emoji) => {
      if (evMsg.id !== msg.id) return;
      msg.removeReactions();
      resolve(emoji);
    });
  });
}

export function reply(msg: Message, content, file) {
  msg.channel.createMessage(content, file);
}
