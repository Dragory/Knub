import { noop } from "./utils";
import events = require("events");
import {
  Channel,
  Client,
  Constants,
  DMChannel,
  Guild,
  GuildManager,
  Message,
  NewsChannel,
  TextChannel,
  User,
  UserManager,
  WebSocketManager,
} from "discord.js";

const EventEmitter = events.EventEmitter;

function persist<T, TProp extends keyof T>(that: T, prop: TProp, initial: T[TProp]) {
  if (!that[prop]) {
    that[prop] = initial;
  }

  return that[prop];
}

function createMockWebSocketManager(): WebSocketManager {
  return new Proxy<WebSocketManager>(new EventEmitter() as WebSocketManager, {
    get(target, p: string) {
      if (target[p]) {
        return target[p] as unknown;
      }

      return noop;
    },
  });
}

export function createMockClient(): Client {
  return new Proxy<Client>(new EventEmitter() as Client, {
    get(target, p: string, proxy) {
      if (target[p]) {
        return target[p] as unknown;
      }

      if (p === "ws") {
        return persist(target, p, createMockWebSocketManager());
      }

      if (p === "users") {
        return persist(target, p, new UserManager(proxy));
      }

      if (p === "guilds") {
        return persist(target, p, new GuildManager(proxy));
      }

      if (p === "options") {
        return {
          messageCacheMaxSize: 1024 * 1024,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          intents: null as any,
        };
      }

      return noop;
    },
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let mockGuildId = 10000;
export function createMockGuild(client: Client, data = {}): Guild {
  const id = (++mockGuildId).toString();
  const mockGuild = client.guilds.add({
    id,
    name: `Mock Guild #${id}`,
    ...data,
  });

  return mockGuild;
}

let mockUserId = 20000;
export function createMockUser(client: Client, data = {}): User {
  const id = (++mockUserId).toString();
  const mockUser = client.users.add({
    id,
    username: `mockuser_${id}`,
    discriminator: "0001",
    ...data,
  });

  return mockUser;
}

let mockChannelId = 30000;
export function createMockTextChannel(client: Client, guildId: string, data = {}): TextChannel {
  const id = (++mockChannelId).toString();
  const guild = client.guilds.cache.get(guildId)!;

  /* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access */
  const mockTextChannel = guild.channels.add(
    (Channel as any).create(
      client,
      {
        id,
        guild,
        type: Constants.ChannelTypes.TEXT,
        name: `mock-channel-${id}`,
        ...data,
      },
      guild
    )
  );
  /* eslint-enable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access */

  return mockTextChannel as TextChannel;
}

let mockMessageId = 40000;
export function createMockMessage(
  client: Client,
  channel: TextChannel | DMChannel | NewsChannel,
  author: User,
  data = {}
): Message {
  const message = new Message(
    client,
    {
      id: (++mockMessageId).toString(),
      channel_id: channel.id,
      mentions: [],
      author,
      ...data,
    },
    channel
  );

  message.channel = channel;

  return message;
}
