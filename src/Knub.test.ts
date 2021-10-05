import { typedGuildPlugin } from "./plugins/PluginBlueprint";
import { noop } from "./utils";
import assert from "assert";
import {
  createMockClient,
  createMockGuild,
  createMockMessage,
  createMockTextChannel,
  createMockUser,
  sleep,
} from "./testUtils";
import { Knub } from "./Knub";
import { expect } from "chai";
import { typedGuildEventListener } from "./events/EventListenerBlueprint";
import _domain from "domain";
import { typedGuildCommand } from "./commands/CommandBlueprint";

describe("Knub", () => {
  it("Multiple GUILD_CREATE events load guild's plugins only once", async () => {
    let loadedTimes = 0;

    const PluginToLoad = typedGuildPlugin({
      name: "plugin-to-load",

      afterLoad() {
        loadedTimes++;
      },

      afterUnload() {
        loadedTimes--;
      },
    });

    const client = createMockClient();
    const knub = new Knub(client, {
      guildPlugins: [PluginToLoad],
      options: {
        getEnabledGuildPlugins() {
          return ["plugin-to-load"];
        },
        logFn: noop,
      },
    });

    knub.initialize();
    client.emit("connect");
    client.emit("ready", client);
    await sleep(30);

    const guild = createMockGuild(client);
    client.ws.emit("GUILD_CREATE", guild);
    await sleep(10);
    client.ws.emit("GUILD_CREATE", guild);
    await sleep(10);
    client.ws.emit("GUILD_CREATE", guild);
    client.ws.emit("GUILD_CREATE", guild);
    client.ws.emit("GUILD_CREATE", guild);
    await sleep(10);
    assert(loadedTimes === 1);
  });

  it("GUILD_CREATE followed by ready event load guild's plugins only once", async () => {
    let loadedTimes = 0;

    const PluginToLoad = typedGuildPlugin({
      name: "plugin-to-load",

      afterLoad() {
        loadedTimes++;
      },

      afterUnload() {
        loadedTimes--;
      },
    });

    const client = createMockClient();
    const knub = new Knub(client, {
      guildPlugins: [PluginToLoad],
      options: {
        getEnabledGuildPlugins() {
          return ["plugin-to-load"];
        },
        logFn: noop,
      },
    });

    knub.initialize();
    client.emit("connect");
    await sleep(50);

    const guild = createMockGuild(client);
    client.ws.emit("GUILD_CREATE", guild);
    await sleep(50);
    client.emit("ready", client);
    await sleep(50);
    assert(loadedTimes === 1);
  });

  it("Errors during plugin loading unloads guild", async () => {
    let loadedTimes = 0;

    const Plugin1 = typedGuildPlugin({
      name: "plugin1",

      beforeLoad() {
        loadedTimes++;
      },

      beforeUnload() {
        loadedTimes--;
      },
    });

    const PluginWithError = typedGuildPlugin({
      name: "plugin-with-error",

      beforeLoad() {
        throw new Error("Foo");
      },
    });

    const client = createMockClient();
    const knub = new Knub(client, {
      guildPlugins: [Plugin1, PluginWithError],
      options: {
        getEnabledGuildPlugins() {
          return ["plugin1", "plugin-with-error"];
        },
        logFn: noop,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    knub.on("error", () => {});

    const guild = createMockGuild(client);

    knub.initialize();
    client.emit("connect");
    client.emit("ready", client);
    await sleep(30);

    client.ws.emit("GUILD_CREATE", guild);
    await sleep(10);
    client.ws.emit("GUILD_CREATE", guild);
    await sleep(10);
    client.ws.emit("GUILD_CREATE", guild);
    client.ws.emit("GUILD_CREATE", guild);
    client.ws.emit("GUILD_CREATE", guild);
    await sleep(10);

    expect(knub.getLoadedGuild(guild.id)).to.equal(undefined);
    expect(loadedTimes).to.equal(0);
  });

  it("Profiler tracks plugin load times", async () => {
    const PluginToLoad = typedGuildPlugin({
      name: "plugin-to-load",

      async beforeLoad() {
        await sleep(10);
      },
    });

    const client = createMockClient();
    const knub = new Knub(client, {
      guildPlugins: [PluginToLoad],
      options: {
        getEnabledGuildPlugins() {
          return ["plugin-to-load"];
        },
        logFn: noop,
      },
    });

    knub.initialize();
    client.emit("connect");
    client.emit("ready", client);
    await sleep(20);

    const guild = createMockGuild(client);
    client.ws.emit("GUILD_CREATE", guild);
    await sleep(20);

    expect(Object.keys(knub.profiler.getData())).to.include("load-plugin:plugin-to-load");
    expect(knub.profiler.getData()["load-plugin:plugin-to-load"].totalTime).to.be.greaterThanOrEqual(8);
  });

  it("Profiler tracks event processing times", async () => {
    const PluginToLoad = typedGuildPlugin({
      name: "plugin-to-load",

      events: [
        typedGuildEventListener({
          event: "messageCreate",
          async listener() {
            await sleep(10);
          },
        }),
      ],
    });

    const client = createMockClient();
    const knub = new Knub(client, {
      guildPlugins: [PluginToLoad],
      options: {
        getEnabledGuildPlugins() {
          return ["plugin-to-load"];
        },
        logFn: noop,
      },
    });

    knub.initialize();
    client.emit("connect");
    client.emit("ready", client);
    await sleep(20);

    const guild = createMockGuild(client);
    client.ws.emit("GUILD_CREATE", guild);
    await sleep(20);

    const channel = createMockTextChannel(client, guild.id);
    const user = createMockUser(client);
    const message = createMockMessage(client, channel, user);
    client.emit("messageCreate", message);
    await sleep(20);

    expect(Object.keys(knub.profiler.getData())).to.include("event:messageCreate");
    expect(knub.profiler.getData()["event:messageCreate"].totalTime).to.be.greaterThanOrEqual(8);
  });

  it("Profiler tracks command processing times", async () => {
    const PluginToLoad = typedGuildPlugin({
      name: "plugin-to-load",

      commands: [
        typedGuildCommand({
          trigger: "foo",
          permission: null,
          async run() {
            await sleep(10);
          },
        }),
      ],
    });

    const client = createMockClient();
    const knub = new Knub(client, {
      guildPlugins: [PluginToLoad],
      options: {
        getEnabledGuildPlugins() {
          return ["plugin-to-load"];
        },
        getConfig() {
          return {
            prefix: "!",
          };
        },
        logFn: noop,
      },
    });

    knub.initialize();
    client.emit("connect");
    client.emit("ready", client);
    await sleep(20);

    const guild = createMockGuild(client);
    client.ws.emit("GUILD_CREATE", guild);
    await sleep(20);

    const channel = createMockTextChannel(client, guild.id);
    const user = createMockUser(client);
    const message = createMockMessage(client, channel, user, { content: "!foo" });
    client.emit("messageCreate", message);
    await sleep(20);

    expect(Object.keys(knub.profiler.getData())).to.include("command:foo");
    expect(knub.profiler.getData()["command:foo"].totalTime).to.be.greaterThanOrEqual(8);
  });
});
