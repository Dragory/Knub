import { Client, DMChannel, GuildChannel, Message } from "discord.js";
import { getChannelId, getRoleId, getUserId } from "./utils";
import { IArgumentMap, ICommandOptions, IMatchedCommand, IParameter } from "./CommandManager";

export function getDefaultPrefix(client: Client) {
  return `/<@!?${client.user.id}> /`;
}

/**
 * Converts `value` to the specified type.
 * This is separate from CommandManager since CommandManager is designed to be independent from djs/the rest of the framework,
 * while several types here require the djs Client object to work.
 * @param {any} value
 * @param {string} type
 * @param {"discord.js".Message} msg
 * @param {"discord.js".Client} bot
 * @returns {Promise<any>}
 */
export async function convertToType(value: any, type: string, msg: Message, bot: Client): Promise<any> {
  if (type === "string") {
    return String(value);
  } else if (type === "number") {
    return parseFloat(value);
  } else if (type === "user") {
    const userId = getUserId(value);
    if (!userId) {
      throw new Error(`Could not convert ${value} to a user id`);
    }

    const user = bot.users.get(userId);
    if (!user) {
      throw new Error(`Could not convert user id ${userId} to a user`);
    }

    return user;
  } else if (type === "member") {
    if (!(msg.channel instanceof GuildChannel)) {
      throw new Error(`Type 'Member' can only be used in guilds`);
    }

    const userId = getUserId(value);
    if (!userId) {
      throw new Error(`Could not convert ${value} to a user id`);
    }

    const user = bot.users.get(userId);
    if (!user) {
      throw new Error(`Could not convert user id ${userId} to a user`);
    }

    const member = msg.guild.members.get(user.id) || (await msg.guild.fetchMember(user));
    if (!member) {
      throw new Error(`Could not convert user id ${userId} to a member`);
    }

    return member;
  } else if (type === "channel") {
    const channelId = getChannelId(value);
    if (!channelId) {
      throw new Error(`Could not convert ${value} to a channel id`);
    }

    const channel = bot.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    return channel;
  } else if (type === "role") {
    if (!(msg.channel instanceof GuildChannel)) {
      throw new Error(`Type 'Role' can only be used in guilds`);
    }

    const roleId = getRoleId(value);
    if (!roleId) {
      throw new Error(`Could not convert ${value} to a role id`);
    }

    const role = msg.channel.guild.roles.get(roleId);
    if (!role) {
      throw new Error(`Could not convert ${roleId} to a Role`);
    }

    return role;
  } else {
    throw new Error(`Unknown type: ${type}`);
  }
}

/**
 * Runs convertToType in-place for each argument in 'args'.
 * @param {IArgumentMap} args
 * @param {"discord.js".Message} msg
 * @param {"discord.js".Client} bot
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
        for (const [i, value] of arg.value.entries()) {
          arg.value[i] = await convertToType(arg.value[i], type, msg, bot);
        }
      } else {
        arg.value = await convertToType(arg.value, type, msg, bot);
      }
    } catch (e) {
      const typeName = `${arg.parameter.type}${arg.parameter.rest ? "[]" : ""}`;
      throw new Error(`Could not convert argument ${arg.parameter.name} to ${typeName}`);
    }
  }
}

export async function maybeRunCommand(command: IMatchedCommand, msg: Message) {
  if (msg.channel instanceof DMChannel) {
    if (!command.commandDefinition.options.allowDMs) {
      return;
    }
  } else if (!(msg.channel instanceof GuildChannel)) {
    return;
  }

  // Convert arg types
  convertArgumentTypes(command.args, msg, this.bot);

  // Run custom filters, if any
  let filterFailed = false;
  if (command.commandDefinition.options.filters) {
    for (const filterFn of command.commandDefinition.options.filters) {
      if (!await Promise.resolve(filterFn(msg, command))) {
        filterFailed = true;
        break;
      }
    }
  }

  if (filterFailed) {
    return;
  }

  const argsToPass: any = {};
  for (const name in command.args) {
    argsToPass[name] = command.args[name].value;
  }

  await command.commandDefinition.handler(msg, argsToPass, command);
}
