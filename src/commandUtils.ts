import {
  Client,
  Guild,
  GuildChannel,
  TextChannel,
  Message,
  PrivateChannel
} from "eris";
import { getChannelId, getRoleId, getUserId } from "./utils";
import {
  IArgumentMap,
  IMatchedCommand,
  IMatchedOptionMap
} from "./CommandManager";

export function getDefaultPrefix(client: Client) {
  return `/<@!?${client.user.id}> /`;
}

export class CommandArgumentTypeError extends Error {}

export interface ICustomArgumentTypes {
  [key: string]: (value: any, msg: Message, bot: Client) => any;
}

/**
 * Converts `value` to the specified type
 */
export async function convertToType(
  value: any,
  type: string,
  msg: Message,
  bot: Client,
  customTypes: ICustomArgumentTypes = {}
): Promise<any> {
  if (value == null) {
    if (type === "bool" || type === "boolean") return true;
    return null;
  } else if (type === "string") {
    return String(value);
  } else if (type === "number") {
    const result = parseFloat(value);
    if (Number.isNaN(result)) {
      throw new CommandArgumentTypeError(
        `Could not convert ${value} to a number`
      );
    }

    return result;
  } else if (type === "bool" || type === "boolean") {
    return value !== "false" && value !== "0";
  } else if (type === "user") {
    const userId = getUserId(value);
    if (!userId) {
      throw new CommandArgumentTypeError(
        `Could not convert ${value} to a user id`
      );
    }

    const user = bot.users.get(userId);
    if (!user) {
      throw new CommandArgumentTypeError(
        `Could not convert user id ${userId} to a user`
      );
    }

    return user;
  } else if (type === "member") {
    if (!(msg.channel instanceof GuildChannel)) {
      throw new CommandArgumentTypeError(
        `Type 'Member' can only be used in guilds`
      );
    }

    const userId = getUserId(value);
    if (!userId) {
      throw new CommandArgumentTypeError(
        `Could not convert ${value} to a user id`
      );
    }

    const user = bot.users.get(userId);
    if (!user) {
      throw new CommandArgumentTypeError(
        `Could not convert user id ${userId} to a user`
      );
    }

    const member = msg.channel.guild.members.get(user.id);
    if (!member) {
      throw new CommandArgumentTypeError(
        `Could not convert user id ${userId} to a member`
      );
    }

    return member;
  } else if (type === "channel") {
    const channelId = getChannelId(value);
    if (!channelId) {
      throw new CommandArgumentTypeError(
        `Could not convert ${value} to a channel id`
      );
    }

    const channelGuildId = bot.channelGuildMap[channelId];
    const channel = channelGuildId
      ? bot.guilds.get(channelGuildId).channels.get(channelId)
      : null;
    if (!channel) {
      throw new CommandArgumentTypeError(`Channel ${channelId} not found`);
    }

    return channel;
  } else if (type === "role") {
    if (!(msg.channel instanceof GuildChannel)) {
      throw new CommandArgumentTypeError(
        `Type 'Role' can only be used in guilds`
      );
    }

    const roleId = getRoleId(value);
    if (!roleId) {
      throw new CommandArgumentTypeError(
        `Could not convert ${value} to a role id`
      );
    }

    const role = msg.channel.guild.roles.get(roleId);
    if (!role) {
      throw new CommandArgumentTypeError(
        `Could not convert ${roleId} to a Role`
      );
    }

    return role;
  } else if (type === "userid") {
    const userId = getUserId(value);
    if (!userId) {
      throw new CommandArgumentTypeError(
        `Could not convert ${value} to a user id`
      );
    }

    return userId;
  } else if (type === "channelid") {
    const channelId = getChannelId(value);
    if (!channelId) {
      throw new CommandArgumentTypeError(
        `Could not convert ${value} to a channel id`
      );
    }

    return channelId;
  } else if (customTypes[type]) {
    return customTypes[type](value, msg, bot);
  } else {
    throw new CommandArgumentTypeError(`Unknown type: ${type}`);
  }
}

/**
 * Runs convertToType in-place for each argument in 'args'.
 */
export async function convertArgumentTypes(
  args: IArgumentMap,
  msg: Message,
  bot: Client,
  customTypes: ICustomArgumentTypes = {}
): Promise<void> {
  for (const argName in args) {
    const arg = args[argName];

    if (arg.value == null && !arg.parameter.required) {
      continue;
    }

    const type = arg.parameter.type.toLowerCase();

    try {
      if (Array.isArray(arg.value)) {
        for (const [i] of arg.value.entries()) {
          arg.value[i] = await convertToType(
            arg.value[i],
            type,
            msg,
            bot,
            customTypes
          );
        }
      } else {
        arg.value = await convertToType(arg.value, type, msg, bot, customTypes);
      }
    } catch (e) {
      const typeName = `${arg.parameter.type}${arg.parameter.rest ? "[]" : ""}`;
      throw new CommandArgumentTypeError(
        `Could not convert argument ${arg.parameter.name} to ${typeName}`
      );
    }
  }
}

/**
 * Runs convertToType in-place for each option in 'opts'.
 */
export async function convertOptionTypes(
  opts: IMatchedOptionMap,
  msg: Message,
  bot: Client,
  customTypes: ICustomArgumentTypes = {}
) {
  for (const optName in opts) {
    const opt = opts[optName];
    const type = (opt.option.type || "string").toLowerCase();

    try {
      if (Array.isArray(opt.value)) {
        for (const [i] of opt.value.entries()) {
          opt.value[i] = await convertToType(
            opt.value[i],
            type,
            msg,
            bot,
            customTypes
          );
        }
      } else {
        opt.value = await convertToType(opt.value, type, msg, bot, customTypes);
      }
    } catch (e) {
      throw new CommandArgumentTypeError(
        `Could not convert option ${opt.option.name} to ${opt.option.type}`
      );
    }
  }
}

export async function runCommand(
  command: IMatchedCommand,
  msg: Message,
  bot: Client
) {
  const argsToPass: any = {};

  for (const name in command.args) {
    argsToPass[name] = command.args[name].value;
  }

  for (const name in command.opts) {
    argsToPass[name] = command.opts[name].value;
  }

  await command.commandDefinition.handler(msg, argsToPass, command);
}
