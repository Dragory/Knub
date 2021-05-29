import { Channel, Client, Guild, GuildChannel, Member, Message, RawPacket, Uncached, User } from "eris";
import { Interaction, KnownEvents } from "./eventTypes";

type EventToGuild = {
  [P in keyof KnownEvents]?: (args: KnownEvents[P]) => Guild | Uncached | undefined;
};

type EventToUser = {
  [P in keyof KnownEvents]?: (args: KnownEvents[P]) => User | Uncached | undefined;
};

type EventToChannel = {
  [P in keyof KnownEvents]?: (args: KnownEvents[P]) => Channel | Uncached | undefined;
};

type EventToMessage = {
  [P in keyof KnownEvents]?: (args: KnownEvents[P]) => Message<any> | undefined;
};

export const eventToGuild: EventToGuild = {
  channelCreate: ({ channel }) => (channel as GuildChannel).guild,
  channelDelete: ({ channel }) => (channel as GuildChannel).guild,
  channelPinUpdate: ({ channel }) => (channel as GuildChannel).guild,
  channelUpdate: ({ channel }) => (channel as GuildChannel).guild,
  guildBanAdd: ({ guild }) => guild,
  guildBanRemove: ({ guild }) => guild,
  guildCreate: ({ guild }) => guild,
  guildDelete: ({ guild }) => guild,
  guildEmojisUpdate: ({ guild }) => guild,
  guildMemberAdd: ({ guild }) => guild,
  guildMemberRemove: ({ guild }) => guild,
  guildMemberChunk: ({ guild }) => guild,
  guildMemberUpdate: ({ guild }) => guild,
  guildUnavailable: ({ guild }) => guild,
  guildUpdate: ({ guild }) => guild,
  guildRoleCreate: ({ guild }) => guild,
  guildRoleDelete: ({ guild }) => guild,
  guildRoleUpdate: ({ guild }) => guild,
  messageCreate: ({ message }) => (message.channel as GuildChannel).guild,
  messageDelete: ({ message }) => (message.channel as GuildChannel).guild,
  messageDeleteBulk: ({ messages }) =>
    messages[0] && messages[0].channel && (messages[0].channel as GuildChannel).guild,
  messageReactionAdd: ({ message }) => (message.channel as GuildChannel).guild,
  messageReactionRemove: ({ message }) => (message.channel as GuildChannel).guild,
  messageReactionRemoveAll: ({ message }) => (message.channel as GuildChannel).guild,
  messageUpdate: ({ message }) => (message.channel as GuildChannel).guild,
  presenceUpdate: ({ other }) => (other as Member).guild,
  typingStart: ({ channel }) => channel && (channel as GuildChannel).guild,
  voiceChannelJoin: ({ member }) => member.guild,
  voiceChannelLeave: ({ member }) => member.guild,
  voiceChannelSwitch: ({ member }) => member.guild,
  voiceStateUpdate: ({ member }) => member.guild,
  unavailableGuildCreate: () => undefined,
  __interactionCreate: ({ interaction }) => interaction.guild,
};

export const eventToUser: EventToUser = {
  guildBanAdd: ({ user }) => user,
  guildBanRemove: ({ user }) => user,
  guildMemberAdd: ({ member }) => member.user,
  guildMemberChunk: () => undefined,
  guildMemberRemove: ({ member }) => member.user,
  guildMemberUpdate: ({ member }) => member.user,
  messageCreate: ({ message }) => message.author,
  messageDelete: ({ message }) => (message as Message).author,
  messageDeleteBulk: () => undefined,
  messageReactionAdd: ({ member }) => {
    return member instanceof Member ? member.user : undefined;
  },
  messageUpdate: ({ message }) => message.author,
  presenceUpdate: ({ other }) => other.user,
  typingStart: ({ user }) => user,
  userUpdate: ({ user }) => user,
  voiceStateUpdate: ({ member }) => member.user,
  __interactionCreate: ({ interaction }) => interaction.user ?? (interaction.member as Member)?.user,
};

export const eventToChannel: EventToChannel = {
  messageCreate: ({ message }) => message.channel,
  messageDelete: ({ message }) => message.channel,
  messageDeleteBulk: ({ messages }) => messages[0] && messages[0].channel,
  messageReactionAdd: ({ message }) => message.channel,
  messageReactionRemove: ({ message }) => message.channel,
  messageReactionRemoveEmoji: ({ message }) => message.channel,
  messageReactionRemoveAll: ({ message }) => message.channel,
  channelCreate: ({ channel }) => channel,
  channelDelete: ({ channel }) => channel,
  channelPinUpdate: ({ channel }) => channel,
  channelUpdate: ({ channel }) => channel,
  channelRecipientAdd: ({ channel }) => channel,
  channelRecipientRemove: ({ channel }) => channel,
  typingStart: ({ channel }) => channel,
  voiceChannelJoin: ({ newChannel }) => newChannel,
  voiceChannelLeave: ({ oldChannel }) => oldChannel,
  voiceChannelSwitch: ({ newChannel }) => newChannel,
  __interactionCreate: ({ interaction }) => interaction.channel,
};

export const eventToMessage: EventToMessage = {
  messageCreate: ({ message }) => message,
  messageDelete: ({ message }) => (message instanceof Message ? message : undefined),
  messageDeleteBulk: ({ messages }) => (messages[0] instanceof Message ? messages[0] : undefined),
  messageReactionAdd: ({ message }) => (message instanceof Message ? message : undefined),
  messageReactionRemove: ({ message }) => (message instanceof Message ? message : undefined),
  messageReactionRemoveAll: ({ message }) => (message instanceof Message ? message : undefined),
  messageUpdate: ({ message }) => message,
  __interactionCreate: ({ interaction }) => interaction.message,
};

// Any events created from raw packets must be prefixed with __ to avoid future naming conflicts with Eris events
export type UnknownEventConverter = (
  client: Client,
  packet: RawPacket
) => [keyof KnownEvents & `__${string}`, any[]] | null;
export const unknownEventConverters: Record<string, UnknownEventConverter> = {
  INTERACTION_CREATE(client, packet) {
    const data = packet.d as Readonly<Interaction>;
    const interaction: Interaction = {
      id: data.id,
      application_id: data.application_id,
      type: data.type,
      data: data.data,
      guild_id: data.guild_id,
      channel_id: data.channel_id,
      token: data.token,
      version: data.version,
    };

    if (data.guild_id) {
      interaction.guild = client.guilds.get(data.guild_id) ?? { id: data.guild_id };
    }

    if (data.channel_id) {
      if (client.privateChannels.has(data.channel_id)) {
        interaction.channel = client.privateChannels.get(data.channel_id);
      } else if (client.groupChannels.has(data.channel_id)) {
        interaction.channel = client.groupChannels.get(data.channel_id);
      } else {
        const channelGuildId = client.channelGuildMap[data.channel_id];
        const guild = channelGuildId ? client.guilds.get(channelGuildId) : undefined;
        interaction.channel = guild?.channels.get(data.channel_id);
      }

      if (!interaction.channel) {
        interaction.channel = { id: data.channel_id };
      }
    }

    if (data.user) {
      let user = client.users.get(data.user.id);
      if (!user) {
        user = client.users.add(data.user as User);
      }
      interaction.user = user;
    }

    if (data.member && interaction.guild instanceof Guild) {
      let member = interaction.guild.members.get(data.member.id);
      if (!member) {
        data.member.id = (data.member as Member).user.id;
        member = interaction.guild.members.add(data.member as Member);
      }
      interaction.member = member;
    }

    if (interaction.data?.resolved) {
      if (interaction.data.resolved.users) {
        for (const [userId, userData] of Object.entries(interaction.data.resolved.users)) {
          let user = client.users.get(userId);
          if (!user) {
            user = client.users.add(userData);
          }
          interaction.data.resolved.users[userId] = user;
        }
      }

      if (interaction.data.resolved.members) {
        if (!(interaction.guild instanceof Guild)) {
          delete interaction.data.resolved.members;
        } else {
          for (const [memberId, partialMemberData] of Object.entries(interaction.data.resolved.members)) {
            let member = interaction.guild.members.get(memberId);
            if (!member) {
              member = interaction.guild.members.add(partialMemberData as Member);
            }
            interaction.data.resolved.members[memberId] = member;
          }
        }
      }
    }

    return ["__interactionCreate", [interaction]];
  },
};
