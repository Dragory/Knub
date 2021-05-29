import {
  bool,
  createTypeHelper,
  defaultTypeConverters,
  string,
  switchOption,
  TypeConversionError,
} from "knub-command-manager";
import { disableCodeBlocks } from "../helpers";
import { getChannelId, getRoleId, getUserId } from "../utils";
import { Channel, GuildChannel, GuildMember, Role, TextChannel, User, VoiceChannel } from "discord.js";
import { AnyPluginData } from "../plugins/PluginData";
import { CommandContext } from "./commandUtils";

// TODO: Remove eslint-disable below after `this: void` has been added to the functions in knub-command-manager
/* eslint-disable @typescript-eslint/unbound-method */

export const baseTypeConverters = {
  ...defaultTypeConverters,

  boolean: defaultTypeConverters.bool,

  number(value: string): number {
    const result = parseFloat(value);
    if (Number.isNaN(result)) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid number`);
    }

    return result;
  },

  user(value: string, { pluginData: { client } }: CommandContext<AnyPluginData<any>>): User {
    const userId = getUserId(value);
    if (!userId) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid user`);
    }

    const user = client.users.cache.get(userId);
    if (!user) {
      throw new TypeConversionError(`Could not find user for user id \`${userId}\``);
    }

    return user;
  },

  member(value: string, { message, pluginData: { client } }: CommandContext<AnyPluginData<any>>): GuildMember {
    if (!(message.channel instanceof GuildChannel)) {
      throw new TypeConversionError(`Type 'Member' can only be used in guilds`);
    }

    const userId = getUserId(value);
    if (!userId) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid user id`);
    }

    const user = client.users.cache.get(userId);
    if (!user) {
      throw new TypeConversionError(`Could not find user for user id \`${userId}\``);
    }

    const member = message.channel.guild.members.cache.get(user.id);
    if (!member) {
      throw new TypeConversionError(`Could not find guild member for user id \`${userId}\``);
    }

    return member;
  },

  channel(value: string, { message }: CommandContext<AnyPluginData<any>>): Channel {
    const channelId = getChannelId(value);
    if (!channelId) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid channel`);
    }

    if (!(message.channel instanceof GuildChannel)) {
      throw new TypeConversionError(`Type 'Channel' can only be used in guilds`);
    }

    const guild = message.channel.guild;
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      throw new TypeConversionError(`Could not find channel for channel id \`${channelId}\``);
    }

    return channel;
  },

  textChannel(value: string, { message }: CommandContext<AnyPluginData<any>>): TextChannel {
    const channelId = getChannelId(value);
    if (!channelId) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid channel`);
    }

    if (!(message.channel instanceof GuildChannel)) {
      throw new TypeConversionError(`Type 'Channel' can only be used in guilds`);
    }

    const guild = message.channel.guild;
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      throw new TypeConversionError(`Could not find channel for channel id \`${channelId}\``);
    }

    if (!(channel instanceof TextChannel)) {
      throw new TypeConversionError(`Channel \`${channel.name}\` is not a text channel`);
    }

    return channel;
  },

  voiceChannel(value: string, { message }: CommandContext<AnyPluginData<any>>): VoiceChannel {
    const channelId = getChannelId(value);
    if (!channelId) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid channel`);
    }

    if (!(message.channel instanceof GuildChannel)) {
      throw new TypeConversionError(`Type 'Channel' can only be used in guilds`);
    }

    const guild = message.channel.guild;
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      throw new TypeConversionError(`Could not find channel for channel id \`${channelId}\``);
    }

    if (!(channel instanceof VoiceChannel)) {
      throw new TypeConversionError(`Channel \`${channel.name}\` is not a voice channel`);
    }

    return channel;
  },

  role(value: string, { message }: CommandContext<AnyPluginData<any>>): Role {
    if (!(message.channel instanceof GuildChannel)) {
      throw new TypeConversionError(`Type 'Role' can only be used in guilds`);
    }

    const roleId = getRoleId(value);
    if (!roleId) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid role`);
    }

    const role = message.channel.guild.roles.cache.get(roleId);
    if (!role) {
      throw new TypeConversionError(`Could not find role for role id \`${roleId}\``);
    }

    return role;
  },

  userId(value: string): string {
    const userId = getUserId(value);
    if (!userId) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid user`);
    }

    return userId;
  },

  channelId(value: string): string {
    const channelId = getChannelId(value);
    if (!channelId) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid channel`);
    }

    return channelId;
  },
};

export const baseCommandParameterTypeHelpers = {
  // knub-command-manager defaults
  string,
  bool,
  switchOption,

  // Knub-specific types
  // knub-command-manager also has a number() helper, but we have slightly different error handling here
  number: createTypeHelper<number>(baseTypeConverters.number),
  user: createTypeHelper<User>(baseTypeConverters.user),
  member: createTypeHelper<GuildMember>(baseTypeConverters.member),
  channel: createTypeHelper<Channel>(baseTypeConverters.channel),
  textChannel: createTypeHelper<TextChannel>(baseTypeConverters.textChannel),
  voiceChannel: createTypeHelper<VoiceChannel>(baseTypeConverters.voiceChannel),
  role: createTypeHelper<Role>(baseTypeConverters.role),
  userId: createTypeHelper<string>(baseTypeConverters.userId),
  channelId: createTypeHelper<string>(baseTypeConverters.channelId),
};
