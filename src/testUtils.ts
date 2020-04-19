import { noop } from "./utils";
import { Client, Collection, Guild, Message, Shard, TextChannel, User } from "eris";
import EventEmitter = require("events");

function persist(that, prop, initial) {
  if (!that[prop]) {
    that[prop] = initial;
  }

  return that[prop];
}

export function createMockClient(): Client {
  return new Proxy<Client>(new EventEmitter() as Client, {
    get(target, p: string) {
      if (target[p]) {
        return target[p];
      }

      if (p === "shards") {
        return persist(target, p, new Collection(Shard));
      }

      if (p === "users") {
        return persist(target, p, new Collection(User));
      }

      if (p === "guilds") {
        return persist(target, p, new Collection(Guild));
      }

      if (p === "channelGuildMap") {
        return persist(target, p, {});
      }

      if (p === "getChannel") {
        return function (channelId) {
          return this.guilds.get(this.channelGuildMap[channelId])?.channels.get(channelId);
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
export function createMockGuild(client, data = {}): Guild {
  const id = (++mockGuildId).toString();
  const mockGuild = new Guild(
    {
      id,
      name: `Mock Guild #${id}`,
      ...data,
    },
    client
  );

  client.guilds.add(mockGuild);

  return mockGuild;
}

let mockUserId = 20000;
export function createMockUser(client, data = {}): User {
  const id = (++mockUserId).toString();
  const mockUser = new User(
    {
      id,
      username: `mockuser_${id}`,
      discriminator: "0001",
      ...data,
    },
    client
  );

  client.users.add(mockUser);

  return mockUser;
}

let mockChannelId = 30000;
export function createMockTextChannel(client, guildId, data = {}): TextChannel {
  const id = (++mockChannelId).toString();
  const mockTextChannel = new TextChannel(
    {
      id,
      type: 0,
      guild_id: guildId,
      name: `mock-channel-${id}`,
      ...data,
    },
    client,
    0
  );

  client.guilds.get(guildId).channels.add(mockTextChannel);
  client.channelGuildMap[mockTextChannel.id] = guildId;

  return mockTextChannel;
}

let mockMessageId = 40000;
export function createMockMessage(client: Client, channelId: string, author: User, data = {}): Message {
  return new Message(
    {
      id: (++mockMessageId).toString(),
      channel_id: channelId,
      mentions: [],
      author,
      ...data,
    },
    client
  );
}
