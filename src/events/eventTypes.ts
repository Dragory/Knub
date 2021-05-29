import {
  AnyChannel,
  AnyGuildChannel,
  AnyVoiceChannel,
  Call,
  Channel,
  Emoji,
  FriendSuggestionReasons,
  GroupChannel,
  Guild,
  GuildChannel,
  GuildTextableChannel,
  Invite,
  Member,
  MemberPartial,
  Message,
  OldCall,
  OldGroupChannel,
  OldGuild,
  OldGuildChannel,
  OldGuildTextChannel,
  OldGuildVoiceChannel,
  OldMember,
  OldMessage,
  OldRole,
  OldVoiceState,
  PartialEmoji,
  PartialUser,
  PossiblyUncachedGuild,
  PossiblyUncachedMessage,
  PossiblyUncachedTextableChannel,
  Presence,
  PrivateChannel,
  RawPacket,
  RawRESTRequest,
  Relationship,
  Role,
  TextableChannel,
  UnavailableGuild,
  Uncached,
  User,
  WebhookData,
} from "eris";

export interface Interaction {
  id: string;
  application_id: string;
  type: InteractionType;
  data?: ApplicationCommandInteractionData;
  guild_id?: string;
  guild?: Guild | Uncached;
  channel_id?: string;
  channel?: Channel | Uncached;
  member?: Member | Uncached;
  user?: User | Uncached;
  token: string;
  version: 1;
  message?: Message;
}

enum InteractionType {
  Ping = 1,
  ApplicationCommand,
  MessageComponent,
}

interface ApplicationCommandInteractionData {
  id: string;
  name: string;
  resolved?: ApplicationCommandInteractionDataResolved;
  options?: ApplicationCommandInteractionDataOption[];
  custom_id: string;
  component_type: number;
}

interface ApplicationCommandInteractionDataResolved {
  users?: Record<string, User>;
  members?: Record<string, Partial<Member>>;
  roles?: Record<string, Role>;
  channels?: Pick<GuildChannel, "id" | "name" | "type">; // TODO: permission_overwrites / permissionOverwrites
}

interface ApplicationCommandInteractionDataOption {
  name: string;
  type: ApplicationCommandOptionType;
  value?: any;
  options?: ApplicationCommandInteractionDataOption[];
}

enum ApplicationCommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP = 2,
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
  MENTIONABLE = 9,
}

/**
 * Known event types and their arguments. Based on Eris types.
 * @see https://github.com/abalabahaha/eris/blob/0.15.1/index.d.ts#L493
 */
export interface KnownEvents {
  ready: Record<string, never>;
  disconnect: Record<string, never>;
  callCreate: {
    call: Call;
  };
  callRing: {
    call: Call;
  };
  callDelete: {
    call: Call;
  };
  callUpdate: {
    call: Call;
    oldCall: OldCall;
  };
  channelCreate: {
    channel: AnyChannel;
  };
  channelDelete: {
    channel: AnyChannel;
  };
  channelPinUpdate: {
    channel: TextableChannel;
    timestamp: number;
    oldTimestamp: number;
  };
  channelRecipientAdd: {
    channel: GroupChannel;
    user: User;
  };
  channelRecipientRemove: {
    channel: GroupChannel;
    user: User;
  };
  channelUpdate:
    | {
        channel: AnyGuildChannel;
        oldChannel: OldGuildChannel | OldGuildTextChannel | OldGuildVoiceChannel;
      }
    | {
        channel: GroupChannel;
        oldChannel: OldGroupChannel;
      };
  connect: {
    id: number;
  };
  shardPreReady: {
    id: number;
  };
  friendSuggestionCreate: {
    user: User;
    reasons: FriendSuggestionReasons;
  };
  friendSuggestionDelete: {
    user: User;
  };
  guildBanAdd: {
    guild: Guild;
    user: User;
  };
  guildBanRemove: {
    guild: Guild;
    user: User;
  };
  guildAvailable: {
    guild: Guild;
  };
  guildCreate: {
    guild: Guild;
  };
  guildDelete: {
    guild: PossiblyUncachedGuild;
  };
  guildEmojisUpdate: {
    guild: PossiblyUncachedGuild;
    emojis: Emoji[];
    oldEmojis: Emoji[] | null;
  };
  guildMemberAdd: {
    guild: Guild;
    member: Member;
  };
  guildMemberChunk: {
    guild: Guild;
    members: Member[];
  };
  guildMemberRemove: {
    guild: Guild;
    member: Member | MemberPartial;
  };
  guildMemberUpdate: {
    guild: Guild;
    member: Member;
    oldMember: OldMember | null;
  };
  guildRoleCreate: {
    guild: Guild;
    role: Role;
  };
  guildRoleDelete: {
    guild: Guild;
    role: Role;
  };
  guildRoleUpdate: {
    guild: Guild;
    role: Role;
    oldRole: OldRole;
  };
  guildUnavailable: {
    guild: Guild;
  };
  unavailableGuildCreate: {
    guild: UnavailableGuild;
  };
  guildUpdate: {
    guild: Guild;
    oldGuild: OldGuild;
  };
  hello: {
    trace: string[];
    id: number;
  };
  inviteCreate: {
    guild: Guild;
    invite: Invite;
  };
  inviteDelete: {
    guild: Guild;
    invite: Invite;
  };
  messageCreate: {
    message: Message<PossiblyUncachedTextableChannel>;
  };
  messageDelete: {
    message: PossiblyUncachedMessage;
  };
  messageReactionRemoveAll: {
    message: PossiblyUncachedMessage;
  };
  messageReactionRemoveEmoji: {
    message: PossiblyUncachedMessage;
    emoji: PartialEmoji;
  };
  messageDeleteBulk: {
    messages: PossiblyUncachedMessage[];
  };
  messageReactionAdd: {
    message: PossiblyUncachedMessage;
    emoji: PartialEmoji;
    member: Member | Uncached;
  };
  messageReactionRemove: {
    message: PossiblyUncachedMessage;
    emoji: PartialEmoji;
    userID: string;
  };
  messageUpdate: {
    message: Message<PossiblyUncachedTextableChannel>;
    oldMessage: OldMessage | null;
  };
  presenceUpdate: {
    other: Member | Relationship;
    oldPresence: Presence | null;
  };
  rawREST: {
    request: RawRESTRequest;
  };
  rawWS: {
    packet: RawPacket;
    id: number;
  };
  relationshipAdd: {
    relationship: Relationship;
  };
  relationshipRemove: {
    relationship: Relationship;
  };
  relationshipUpdate: {
    relationship: Relationship;
    oldRelationship: { type: number };
  };
  typingStart:
    | {
        channel: GuildTextableChannel | Uncached;
        user: User | Uncached;
        member: Member;
      }
    | {
        channel: PrivateChannel | Uncached;
        user: User | Uncached;
        member: null;
      };
  userUpdate: {
    user: User;
    oldUser: PartialUser | null;
  };
  voiceChannelJoin: {
    member: Member;
    newChannel: AnyVoiceChannel;
  };
  voiceChannelLeave: {
    member: Member;
    oldChannel: AnyVoiceChannel;
  };
  voiceChannelSwitch: {
    member: Member;
    newChannel: AnyVoiceChannel;
    oldChannel: AnyVoiceChannel;
  };
  voiceStateUpdate: {
    member: Member;
    oldState: OldVoiceState;
  };
  warn: {
    message: string;
    id: number;
  };
  debug: {
    message: string;
    id: number;
  };
  webhooksUpdate: {
    data: WebhookData;
  };
  shardReady: {
    id: number;
  };
  shardResume: {
    id: number;
  };
  shardDisconnect: {
    err: Error | undefined;
    id: number;
  };
  end: Record<string, never>;
  start: Record<string, never>;
  pong: {
    latency: number;
  };
  speakingStart: {
    userID: string;
  };
  speakingStop: {
    userID: string;
  };
  userDisconnect: {
    userID: string;
  };
  unknown: {
    packet: RawPacket;
  };

  __interactionCreate: {
    interaction: Interaction;
  };
}

export interface KnownGuildEvents extends KnownEvents {
  channelUpdate: {
    channel: AnyGuildChannel;
    oldChannel: OldGuildChannel | OldGuildTextChannel | OldGuildVoiceChannel;
  };
  messageCreate: {
    message: Message<GuildTextableChannel | Uncached>;
  };
  typingStart: {
    channel: GuildTextableChannel | Uncached;
    user: User | Uncached;
    member: Member;
  };
}

export type EventArguments = KnownEvents;
export type GuildEventArguments = KnownGuildEvents;

type FromErisArgsObj = {
  [P in keyof KnownEvents]: (...args: any[]) => KnownEvents[P];
};

export const globalEvents = [
  "callCreate",
  "callRing",
  "callDelete",
  "callUpdate",
  "debug",
  "disconnect",
  "friendSuggestionCreate",
  "friendSuggestionDelete",
  "guildAvailable",
  "guildUnavailable",
  "hello",
  "rawWS",
  "ready",
  "unknown",
  "userUpdate",
  "warn",
] as const;

export type ValidEvent = keyof KnownEvents;
export type GlobalEvent = typeof globalEvents[number];
export type GuildEvent = Exclude<ValidEvent, GlobalEvent>;

export function isGlobalEvent(ev: ValidEvent): ev is GlobalEvent {
  return globalEvents.includes(ev as any);
}

export function isGuildEvent(ev: ValidEvent): ev is GuildEvent {
  return !globalEvents.includes(ev as any);
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Each property is a function that converts Eris event listener arguments to
 * Knub's event argument object.
 *
 * @see the EventListeners interface at the following link for Eris types:
 * @see https://github.com/abalabahaha/eris/blob/27bb9cd02ae990606ab50b32ac186da53d8ca45a/index.d.ts#L836
 */
export const fromErisArgs: FromErisArgsObj = {
  ready: () => ({}),
  disconnect: () => ({}),
  callCreate: (call) => ({ call }),
  callRing: (call) => ({ call }),
  callDelete: (call) => ({ call }),
  callUpdate: (call, oldCall) => ({ call, oldCall }),
  channelCreate: (channel) => ({ channel }),
  channelDelete: (channel) => ({ channel }),
  channelPinUpdate: (channel, timestamp, oldTimestamp) => ({ channel, timestamp, oldTimestamp }),
  channelRecipientAdd: (channel, user) => ({ channel, user }),
  channelRecipientRemove: (channel, user) => ({ channel, user }),
  channelUpdate: (channel, oldChannel) => ({ channel, oldChannel }),
  connect: (id) => ({ id }),
  shardPreReady: (id) => ({ id }),
  friendSuggestionCreate: (user, reasons) => ({ user, reasons }),
  friendSuggestionDelete: (user) => ({ user }),
  guildBanAdd: (guild, user) => ({ guild, user }),
  guildBanRemove: (guild, user) => ({ guild, user }),
  guildAvailable: (guild) => ({ guild }),
  guildCreate: (guild) => ({ guild }),
  guildDelete: (guild) => ({ guild }),
  guildEmojisUpdate: (guild, emojis, oldEmojis) => ({ guild, emojis, oldEmojis }),
  guildMemberAdd: (guild, member) => ({ guild, member }),
  guildMemberChunk: (guild, members) => ({ guild, members }),
  guildMemberRemove: (guild, member) => ({ guild, member }),
  guildMemberUpdate: (guild, member, oldMember) => ({ guild, member, oldMember }),
  guildRoleCreate: (guild, role) => ({ guild, role }),
  guildRoleDelete: (guild, role) => ({ guild, role }),
  guildRoleUpdate: (guild, role, oldRole) => ({ guild, role, oldRole }),
  guildUnavailable: (guild) => ({ guild }),
  unavailableGuildCreate: (guild) => ({ guild }),
  guildUpdate: (guild, oldGuild) => ({ guild, oldGuild }),
  hello: (trace, id) => ({ trace, id }),
  inviteCreate: (guild, invite) => ({ guild, invite }),
  inviteDelete: (guild, invite) => ({ guild, invite }),
  messageCreate: (message) => ({ message }),
  messageDelete: (message) => ({ message }),
  messageReactionRemoveAll: (message) => ({ message }),
  messageReactionRemoveEmoji: (message, emoji) => ({ message, emoji }),
  messageDeleteBulk: (messages) => ({ messages }),
  messageReactionAdd: (message, emoji, member) => ({ message, emoji, member }),
  messageReactionRemove: (message, emoji, userID) => ({ message, emoji, userID }),
  messageUpdate: (message, oldMessage) => ({ message, oldMessage }),
  presenceUpdate: (other, oldPresence) => ({ other, oldPresence }),
  rawREST: (request) => ({ request }),
  rawWS: (packet, id) => ({ packet, id }),
  relationshipAdd: (relationship) => ({ relationship }),
  relationshipRemove: (relationship) => ({ relationship }),
  relationshipUpdate: (relationship, oldRelationship) => ({ relationship, oldRelationship }),
  typingStart: (channel, user, member) => ({ channel, user, member }),
  userUpdate: (user, oldUser) => ({ user, oldUser }),
  voiceChannelJoin: (member, newChannel) => ({ member, newChannel }),
  voiceChannelLeave: (member, oldChannel) => ({ member, oldChannel }),
  voiceChannelSwitch: (member, newChannel, oldChannel) => ({ member, newChannel, oldChannel }),
  voiceStateUpdate: (member, oldState) => ({ member, oldState }),
  warn: (message, id) => ({ message, id }),
  debug: (message, id) => ({ message, id }),
  webhooksUpdate: (data) => ({ data }),
  shardReady: (id) => ({ id }),
  shardResume: (id) => ({ id }),
  shardDisconnect: (err, id) => ({ err, id }),
  end: () => ({}),
  start: () => ({}),
  pong: (latency) => ({ latency }),
  speakingStart: (userID) => ({ userID }),
  speakingStop: (userID) => ({ userID }),
  userDisconnect: (userID) => ({ userID }),
  unknown: (packet, id) => ({ packet, id }),
  __interactionCreate: (interaction) => ({ interaction }),
};
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
