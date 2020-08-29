import {
  AnyChannel,
  AnyGuildChannel,
  BaseInvite,
  Call,
  Emoji,
  FriendSuggestionReasons,
  GroupChannel,
  Guild,
  Member,
  MemberPartial,
  Message,
  OldCall,
  OldGuild,
  OldGuildChannel,
  OldMessage,
  OldRole,
  OldVoiceState,
  PartialEmoji,
  PossiblyUncachedMessage,
  Presence,
  RawPacket,
  Relationship,
  Role,
  TextableChannel,
  UnavailableGuild,
  User,
  VoiceChannel,
} from "eris";

/**
 * Known event types and their arguments. Based on Eris types.
 * @see https://github.com/abalabahaha/eris/blob/27bb9cd02ae990606ab50b32ac186da53d8ca45a/index.d.ts#L836
 */
export interface KnownEvents {
  ready: {};
  disconnect: {};
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
  channelUpdate: {
    channel: AnyGuildChannel;
    oldChannel: OldGuildChannel;
  };
  friendSuggestionCreate: {
    user: User;
    reasons: FriendSuggestionReasons;
  };
  friendSuggestionDelete: {
    user: User;
  };
  guildAvailable: {
    guild: Guild;
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
  guildDelete: {
    guild: Guild;
  };
  guildUnavailable: {
    guild: Guild;
  };
  guildCreate: {
    guild: Guild;
  };
  guildEmojisUpdate: {
    guild: Guild;
    emojis: Emoji[];
    oldEmojis: Emoji[];
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
    oldMember: { roles: string[]; nick?: string };
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
    invite: BaseInvite;
  };
  inviteDelete: {
    guild: Guild;
    invite: BaseInvite;
  };
  messageCreate: {
    message: Message;
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
    emoji: Emoji;
    userID: string;
  };
  messageReactionRemove: {
    message: PossiblyUncachedMessage;
    emoji: Emoji;
    userID: string;
  };
  messageUpdate: {
    message: Message;
    oldMessage?: OldMessage;
  };
  presenceUpdate: {
    other: Member | Relationship;
    oldPresence?: Presence;
  };
  rawWS: {
    packet: RawPacket;
    id: number;
  };
  unknown: {
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
  typingStart: {
    channel: TextableChannel;
    user: User;
  };
  unavailableGuildCreate: {
    guild: UnavailableGuild;
  };
  userUpdate: {
    user: User;
    oldUser: { username: string; discriminator: string; avatar?: string };
  };
  voiceChannelJoin: {
    member: Member;
    newChannel: VoiceChannel;
  };
  voiceChannelLeave: {
    member: Member;
    oldChannel: VoiceChannel;
  };
  voiceChannelSwitch: {
    member: Member;
    newChannel: VoiceChannel;
    oldChannel: VoiceChannel;
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
}

export type EventArguments = KnownEvents;

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
  friendSuggestionCreate: (user, reasons) => ({ user, reasons }),
  friendSuggestionDelete: (user) => ({ user }),
  guildAvailable: (guild, user) => ({ guild, user }),
  guildBanAdd: (guild, user) => ({ guild, user }),
  guildBanRemove: (guild, user) => ({ guild, user }),
  guildDelete: (guild) => ({ guild }),
  guildUnavailable: (guild) => ({ guild }),
  guildCreate: (guild) => ({ guild }),
  guildEmojisUpdate: (guild, emojis, oldEmojis) => ({ guild, emojis, oldEmojis }),
  guildMemberAdd: (guild, member) => ({ guild, member }),
  guildMemberChunk: (guild, members) => ({ guild, members }),
  guildMemberRemove: (guild, member) => ({ guild, member }),
  guildMemberUpdate: (guild, member, oldMember) => ({ guild, member, oldMember }),
  guildRoleCreate: (guild, role) => ({ guild, role }),
  guildRoleDelete: (guild, role) => ({ guild, role }),
  guildRoleUpdate: (guild, role, oldRole) => ({ guild, role, oldRole }),
  guildUpdate: (guild, oldGuild) => ({ guild, oldGuild }),
  hello: (trace, id) => ({ trace, id }),
  inviteCreate: (guild, invite) => ({ guild, invite }),
  inviteDelete: (guild, invite) => ({ guild, invite }),
  messageCreate: (message) => ({ message }),
  messageDelete: (message) => ({ message }),
  messageReactionRemoveAll: (message) => ({ message }),
  messageReactionRemoveEmoji: (message, emoji) => ({ message, emoji }),
  messageDeleteBulk: (messages) => ({ messages }),
  messageReactionAdd: (message, emoji, userID) => ({ message, emoji, userID }),
  messageReactionRemove: (message, emoji, userID) => ({ message, emoji, userID }),
  messageUpdate: (message, oldMessage) => ({ message, oldMessage }),
  presenceUpdate: (other, oldPresence) => ({ other, oldPresence }),
  rawWS: (packet, id) => ({ packet, id }),
  unknown: (packet, id) => ({ packet, id }),
  relationshipAdd: (relationship) => ({ relationship }),
  relationshipRemove: (relationship) => ({ relationship }),
  relationshipUpdate: (relationship, oldRelationship) => ({ relationship, oldRelationship }),
  typingStart: (channel, user) => ({ channel, user }),
  unavailableGuildCreate: (guild) => ({ guild }),
  userUpdate: (user, oldUser) => ({ user, oldUser }),
  voiceChannelJoin: (member, newChannel) => ({ member, newChannel }),
  voiceChannelLeave: (member, oldChannel) => ({ member, oldChannel }),
  voiceChannelSwitch: (member, newChannel, oldChannel) => ({ member, newChannel, oldChannel }),
  voiceStateUpdate: (member, oldState) => ({ member, oldState }),
  warn: (message, id) => ({ message, id }),
  debug: (message, id) => ({ message, id }),
};
