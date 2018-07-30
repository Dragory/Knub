import { Client, Guild, GuildChannel, TextChannel, Message, PrivateChannel } from "eris";
import { getChannelId, getRoleId, getUserId } from "./utils";
import { IArgumentMap, IMatchedCommand } from "./CommandManager";

export function getDefaultPrefix(client: Client) {
  return `/<@!?${client.user.id}> /`;
}

export class CommandValueTypeError extends Error {}

/**
 * Converts `value` to the specified type
 * @param {any} value
 * @param {string} type
 * @param {Message} msg
 * @param {Client} bot
 * @returns {Promise<any>}
 */
export async function convertToType(value: any, type: string, msg: Message, bot: Client): Promise<any> {
  if (value == null) {
    return null;
  } else if (type === "string") {
    return String(value);
  } else if (type === "number") {
    const result = parseFloat(value);
    if (Number.isNaN(result)) {
      throw new CommandValueTypeError(`Could not convert ${value} to a number`);
    }

    return result;
  } else if (type === "user") {
    const userId = getUserId(value);
    if (!userId) {
      throw new CommandValueTypeError(`Could not convert ${value} to a user id`);
    }

    const user = bot.users.get(userId);
    if (!user) {
      throw new CommandValueTypeError(`Could not convert user id ${userId} to a user`);
    }

    return user;
  } else if (type === "member") {
    if (!(msg.channel instanceof GuildChannel)) {
      throw new CommandValueTypeError(`Type 'Member' can only be used in guilds`);
    }

    const userId = getUserId(value);
    if (!userId) {
      throw new CommandValueTypeError(`Could not convert ${value} to a user id`);
    }

    const user = bot.users.get(userId);
    if (!user) {
      throw new CommandValueTypeError(`Could not convert user id ${userId} to a user`);
    }

    const member = msg.channel.guild.members.get(user.id);
    if (!member) {
      throw new CommandValueTypeError(`Could not convert user id ${userId} to a member`);
    }

    return member;
  } else if (type === "channel") {
    const channelId = getChannelId(value);
    if (!channelId) {
      throw new CommandValueTypeError(`Could not convert ${value} to a channel id`);
    }

    const channelGuildId = bot.channelGuildMap[channelId];
    const channel = channelGuildId ? bot.guilds.get(channelGuildId).channels.get(channelId) : null;
    if (!channel) {
      throw new CommandValueTypeError(`Channel ${channelId} not found`);
    }

    return channel;
  } else if (type === "role") {
    if (!(msg.channel instanceof GuildChannel)) {
      throw new CommandValueTypeError(`Type 'Role' can only be used in guilds`);
    }

    const roleId = getRoleId(value);
    if (!roleId) {
      throw new CommandValueTypeError(`Could not convert ${value} to a role id`);
    }

    const role = msg.channel.guild.roles.get(roleId);
    if (!role) {
      throw new CommandValueTypeError(`Could not convert ${roleId} to a Role`);
    }

    return role;
  } else if (type === "userId") {
    const userId = getUserId(value);
    if (!userId) {
      throw new CommandValueTypeError(`Could not convert ${value} to a user id`);
    }

    return userId;
  } else if (type === "channelId") {
    const channelId = getChannelId(value);
    if (!channelId) {
      throw new CommandValueTypeError(`Could not convert ${value} to a channel id`);
    }

    return channelId;
  } else {
    throw new CommandValueTypeError(`Unknown type: ${type}`);
  }
}

/**
 * Runs convertToType in-place for each argument in 'args'.
 * @param {IArgumentMap} args
 * @param {Message} msg
 * @param {Client} bot
 * @returns {Promise<void>}
 */
export async function convertArgumentTypes(args: IArgumentMap, msg: Message, bot: Client) {
  for (const argName in args) {
    const arg = args[argName];

    if (arg.value == null && !arg.parameter.required) {
      continue;
    }

    const type = arg.parameter.type.toLowerCase();

    try {
      if (Array.isArray(arg.value)) {
        for (const [i] of arg.value.entries()) {
          arg.value[i] = await convertToType(arg.value[i], type, msg, bot);
        }
      } else {
        arg.value = await convertToType(arg.value, type, msg, bot);
      }
    } catch (e) {
      const typeName = `${arg.parameter.type}${arg.parameter.rest ? "[]" : ""}`;
      throw new CommandValueTypeError(`Could not convert argument ${arg.parameter.name} to ${typeName}`);
    }
  }
}

export async function runCommand(command: IMatchedCommand, msg: Message, bot: Client) {
  const argsToPass: any = {};
  for (const name in command.args) {
    argsToPass[name] = command.args[name].value;
  }

  await command.commandDefinition.handler(msg, argsToPass, command);
}
