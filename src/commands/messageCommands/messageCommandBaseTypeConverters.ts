import { Channel, ChannelType, GuildMember, GuildTextBasedChannel, Role, User, VoiceChannel } from "discord.js";
import {
  TypeConversionError,
  bool,
  createTypeHelper,
  defaultTypeConverters,
  string,
  switchOption,
} from "knub-command-manager";
import { disableCodeBlocks } from "../../helpers.ts";
import { AnyPluginData } from "../../plugins/PluginData.ts";
import { getChannelId, getRoleId, getUserId } from "../../utils.ts";
import { CommandContext } from "./messageCommandUtils.ts";

export const messageCommandBaseTypeConverters = {
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
    if (message.channel.type === ChannelType.DM) {
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

    const member = "guild" in message.channel && message.channel.guild.members.cache.get(user.id);
    if (!member) {
      throw new TypeConversionError(`Could not find guild member for user id \`${userId}\``);
    }

    return member;
  },

  channel(value: string, { message }: CommandContext<AnyPluginData<any>>): Channel {
    if (message.channel.type === ChannelType.DM) {
      throw new TypeConversionError(`Type 'Channel' can only be used in guilds`);
    }

    const channelId = getChannelId(value);
    if (!channelId) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid channel`);
    }

    const channel = "guild" in message.channel && message.channel.guild.channels.cache.get(channelId);
    if (!channel) {
      throw new TypeConversionError(`Could not find channel for channel id \`${channelId}\``);
    }

    return channel;
  },

  textChannel(value: string, { message }: CommandContext<AnyPluginData<any>>): GuildTextBasedChannel {
    if (message.channel.type === ChannelType.DM) {
      throw new TypeConversionError(`Type 'textChannel' can only be used in guilds`);
    }

    const channelId = getChannelId(value);
    if (!channelId) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid channel`);
    }

    const channel = "guild" in message.channel && message.channel.guild.channels.cache.get(channelId);
    if (!channel) {
      throw new TypeConversionError(`Could not find channel for channel id \`${channelId}\``);
    }

    if (!channel.isTextBased()) {
      throw new TypeConversionError(`Channel \`${channel.name}\` is not a text channel`);
    }

    return channel;
  },

  voiceChannel(value: string, { message }: CommandContext<AnyPluginData<any>>): VoiceChannel {
    if (message.channel.type === ChannelType.DM) {
      throw new TypeConversionError(`Type 'voiceChannel' can only be used in guilds`);
    }

    const channelId = getChannelId(value);
    if (!channelId) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid channel`);
    }

    const channel = "guild" in message.channel && message.channel.guild.channels.cache.get(channelId);
    if (!channel) {
      throw new TypeConversionError(`Could not find channel for channel id \`${channelId}\``);
    }

    if (channel.type !== ChannelType.GuildVoice) {
      throw new TypeConversionError(`Channel \`${channel.name}\` is not a voice channel`);
    }

    return channel;
  },

  role(value: string, { message }: CommandContext<AnyPluginData<any>>): Role {
    if (message.channel.type === ChannelType.DM) {
      throw new TypeConversionError(`Type 'Role' can only be used in guilds`);
    }

    const roleId = getRoleId(value);
    if (!roleId) {
      throw new TypeConversionError(`\`${disableCodeBlocks(value)}\` is not a valid role`);
    }

    const role = "guild" in message.channel && message.channel.guild.roles.cache.get(roleId);
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
  number: createTypeHelper<number>(messageCommandBaseTypeConverters.number),
  user: createTypeHelper<User>(messageCommandBaseTypeConverters.user),
  member: createTypeHelper<GuildMember>(messageCommandBaseTypeConverters.member),
  channel: createTypeHelper<Channel>(messageCommandBaseTypeConverters.channel),
  textChannel: createTypeHelper<GuildTextBasedChannel>(messageCommandBaseTypeConverters.textChannel),
  voiceChannel: createTypeHelper<VoiceChannel>(messageCommandBaseTypeConverters.voiceChannel),
  role: createTypeHelper<Role>(messageCommandBaseTypeConverters.role),
  userId: createTypeHelper<string>(messageCommandBaseTypeConverters.userId),
  channelId: createTypeHelper<string>(messageCommandBaseTypeConverters.channelId),
};
