import { noop } from "./utils";
import events = require("events");
import {
  AnyThreadChannel,
  ChannelManager,
  ChannelType,
  Client,
  DMChannel,
  Guild,
  GuildChannel,
  GuildChannelManager,
  GuildManager,
  GuildMember,
  GuildMemberManager,
  Message,
  NewsChannel,
  Options,
  Role,
  RoleManager,
  Snowflake,
  TextChannel,
  ThreadChannel,
  User,
  UserManager,
  WebSocketManager,
} from "discord.js";
import { Knub } from "./Knub";
import { KnubArgs } from "./types";

const EventEmitter = events.EventEmitter;

const persisted = new WeakMap<any, Map<string | number | symbol, any>>();
function persist<T, TProp extends keyof T>(that: T, prop: TProp, initial: T[TProp]): T[TProp] {
  if (!persisted.has(that)) {
    persisted.set(that, new Map());
  }

  const thatProps = persisted.get(that)!;
  if (!thatProps.has(prop)) {
    thatProps.set(prop, initial);
  }

  return thatProps.get(prop)! as T[TProp];
}

function createMockWebSocketManager(): WebSocketManager {
  return new Proxy<WebSocketManager>(new EventEmitter() as WebSocketManager, {
    get(target, p: string) {
      if (p in target) {
        return target[p] as unknown;
      }

      return noop;
    },
  });
}

export function createMockClient(): Client<true> {
  return new Proxy<Client<true>>(new EventEmitter() as Client<true>, {
    get(target, p: string, proxy: Client<true>) {
      if (p in target) {
        return target[p] as unknown;
      }

      if (p === "destroy") {
        return () => target.removeAllListeners();
      }

      if (p === "ws") {
        return persist(target, p, createMockWebSocketManager());
      }

      if (p === "users") {
        // We use Reflect.construct() here because the constructor is marked as private in the typings
        const userManager = Reflect.construct(UserManager, [proxy]) as UserManager;
        return persist(target, p, userManager);
      }

      if (p === "guilds") {
        // @ts-ignore
        // This type assertation is needed because the constructor is marked as private
        return persist(target, p, new GuildManager(proxy) as GuildManager);
      }

      if (p === "options") {
        return {
          intents: null as any,
          makeCache: Options.cacheEverything(),
        };
      }

      if (p === "channels") {
        // @ts-ignore
        // This type assertation is needed because the constructor is marked as private
        return persist(target, p, new ChannelManager(proxy, []) as ChannelManager);
      }

      return noop;
    },
  });
}

/**
 * Helper function to set up Knub with auto-cleanup
 */
export async function withKnub(
  mochaDoneFn: () => void,
  fn: (createKnub: (args: Partial<KnubArgs>) => Knub, done: () => void) => void | Promise<void>,
): Promise<void> {
  let knub: Knub | null = null;
  const createKnub = (args: Partial<KnubArgs>) => {
    const client = createMockClient();
    knub = new Knub(client, args);
    return knub;
  };
  const done = () => {
    if (!knub) {
      throw new Error("createKnub() was not called in withKnub()");
    }
    void knub.destroy();
    mochaDoneFn();
  };
  try {
    await fn(createKnub, done);
  } catch (e) {
    // TS doing some weird inference here, narrowing `knub` to `never`, hence the assertation
    await (knub as Knub | null)?.destroy();
    throw e;
  }
}

/**
 * Most tests need to initialize Knub, so this is a helper function to handle that
 */
export async function initializeKnub(knub: Knub): Promise<void> {
  return new Promise<void>((resolve) => {
    knub.once("loadingFinished", () => {
      resolve();
    });
    knub.initialize();
    knub.client.emit("connect");
    knub.client.emit("shardReady", 0, undefined);
    knub.client.emit("ready", knub.client as Client<true>);
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let mockGuildId = 10000;
export function createMockGuild(client: Client, data = {}): Guild {
  const id = (++mockGuildId).toString();
  client.guilds.cache.set(id, {
    id,
    client,
    name: `Mock Guild #${id}`,
    ...data,
  } as Guild);

  const mockGuild = client.guilds.cache.get(id)!;
  // @ts-ignore
  // This type assertation is needed because the constructor is marked as private
  mockGuild.members = new GuildMemberManager(mockGuild) as GuildMemberManager;
  // @ts-ignore
  // This type assertation is needed because the constructor is marked as private
  mockGuild.channels = new GuildChannelManager(mockGuild) as GuildChannelManager;
  // @ts-ignore
  // This type assertation is needed because the constructor is marked as private
  mockGuild.roles = new RoleManager(mockGuild) as RoleManager;

  // Add everyone role
  mockGuild.roles.cache.set(mockGuild.id, createMockRole(mockGuild, { name: "everyone" }, mockGuild.id));

  return mockGuild;
}

let mockUserId = 20000;
export function createMockUser(client: Client, data = {}): User {
  const id = (++mockUserId).toString();
  const mockUser = client.users.cache.set(
    id,
    // @ts-ignore
    new User(client, {
      id,
      username: `mockuser_${id}`,
      discriminator: "0001",
      ...data,
    }) as User,
  );

  return mockUser.get(id)!;
}

export function createMockMember(guild: Guild, user: User, data = {}): GuildMember {
  // @ts-ignore
  // Not sure why the eslint rule below is triggered, but it probably
  // has something to do with the constructor being marked as private.
  guild.members.cache.set(user.id, new GuildMember(guild.client, { user, ...data }, guild));
  return guild.members.cache.get(user.id)!;
}

let mockChannelId = 30000;
export function createMockTextChannel(client: Client, guildId: Snowflake, data = {}): TextChannel {
  const id = (++mockChannelId).toString();
  const guild = client.guilds.cache.get(guildId)!;

  // @ts-ignore
  const mockChannel = new TextChannel(
    guild,
    {
      id,
      guild,
      type: ChannelType.GuildText,
      name: `mock-channel-${id}`,
      ...data,
    },
    client,
  ) as TextChannel;
  guild.channels.cache.set(id, mockChannel);
  client.channels.cache.set(id, mockChannel);
  return mockChannel;
}

let mockMessageId = 40000;
export function createMockMessage(
  client: Client,
  channel: TextChannel | DMChannel | NewsChannel | ThreadChannel,
  author: User,
  data = {},
): Message {
  // @ts-ignore
  // This type assertation is needed because the constructor is marked as private
  const message = new Message(client, {
    id: (++mockMessageId).toString(),
    channel_id: channel.id,
    mentions: [],
    // @ts-ignore
    author,
    ...data,
  }) as Message;

  return message;
}

let mockRoleId = 50000;
export function createMockRole(guild: Guild, data = {}, overrideId: string | null = null): Role {
  const id = overrideId || (++mockRoleId).toString();
  guild.roles.cache.set(
    id,
    // @ts-ignore
    // This type assertation is needed because the constructor is marked as private
    new Role(
      guild.client,
      {
        id,
        permissions: "0",
        ...data,
      } as any,
      guild,
    ) as Role,
  );
  return guild.roles.cache.get(id)!;
}

let mockThreadId = 60000;
export function createMockThread(channel: NewsChannel | GuildChannel): AnyThreadChannel {
  const id = (++mockThreadId).toString();
  channel.guild.channels.cache.set(
    id,
    // @ts-ignore
    // This type assertation is needed because the constructor is marked as private
    new ThreadChannel(
      channel.guild,
      {
        id,
        type: ChannelType.GuildPublicThread,
        parent_id: channel.id,
      },
      channel.client,
    ) as AnyThreadChannel,
  );

  const mockThread = channel.guild.channels.cache.get(id)! as AnyThreadChannel;
  channel.client.channels.cache.set(id, mockThread);
  return mockThread;
}

export type AssertTypeEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

/**
 * Assertion "function" for types
 * 1. First type parameter (TExpected) is the expected type
 * 2. Second type parameter (TActual) is the actual, tested type
 * 3. Third type parameter (TAssert) is either true or false, based on whether the first and second type should match
 *
 * For example:
 * ```
 * assertTypeEquals<string, string, true>(); // passes: string and string match, and third parameter was true
 * assertTypeEquals<string, number, true>(); // error: string and number do not match, but third parameter was true
 * assertTypeEquals<string, number, false>(); // passses: string and number do not match, and third parameter was false
 * ```
 */
export function assertTypeEquals<
  TExpected,
  TActual,
  TAssert extends TActual extends TExpected ? true : false,
>(): void {}
