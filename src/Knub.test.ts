import { assert, expect } from "chai";
import { Client } from "discord.js";
import { describe, it } from "mocha";
import { Knub } from "./Knub";
import { guildPluginMessageCommand } from "./commands/messageCommands/messageCommandBlueprint";
import { guildPluginEventListener } from "./events/EventListenerBlueprint";
import { GuildPluginBlueprint, guildPlugin } from "./plugins/PluginBlueprint";
import {
  createMockClient,
  createMockGuild,
  createMockMessage,
  createMockTextChannel,
  createMockUser,
  initializeKnub,
  sleep,
  withKnub,
} from "./testUtils";
import { noop } from "./utils";

describe("Knub", () => {
  it("Multiple GUILD_CREATE events load guild's plugins only once", (mochaDone) => {
    withKnub(mochaDone, async (createKnub, done) => {
      let loadedTimes = 0;

      const PluginToLoad = guildPlugin({
        name: "plugin-to-load",
        configParser: () => ({}),

        afterLoad() {
          loadedTimes++;
        },

        afterUnload() {
          loadedTimes--;
        },
      });

      const knub = createKnub({
        guildPlugins: [PluginToLoad],
        options: {
          autoRegisterApplicationCommands: false,
          getEnabledGuildPlugins() {
            return ["plugin-to-load"];
          },
          logFn: noop,
        },
      });
      await initializeKnub(knub);

      const guild = createMockGuild(knub.client);
      knub.client.ws.emit("GUILD_CREATE", guild);
      await sleep(10);
      knub.client.ws.emit("GUILD_CREATE", guild);
      await sleep(10);
      knub.client.ws.emit("GUILD_CREATE", guild);
      knub.client.ws.emit("GUILD_CREATE", guild);
      knub.client.ws.emit("GUILD_CREATE", guild);
      await sleep(10);
      assert.strictEqual(loadedTimes, 1);

      done();
    });
  });

  it("GUILD_CREATE followed by ready event load guild's plugins only once", (mochaDone) => {
    withKnub(mochaDone, async (createKnub, done) => {
      let loadedTimes = 0;

      const PluginToLoad = guildPlugin({
        name: "plugin-to-load",
        configParser: () => ({}),

        afterLoad() {
          loadedTimes++;
        },

        afterUnload() {
          loadedTimes--;
        },
      });

      const knub = createKnub({
        guildPlugins: [PluginToLoad],
        options: {
          autoRegisterApplicationCommands: false,
          getEnabledGuildPlugins() {
            return ["plugin-to-load"];
          },
          logFn: noop,
        },
      });
      await initializeKnub(knub);

      const guild = createMockGuild(knub.client);
      knub.client.ws.emit("GUILD_CREATE", guild);
      await sleep(30);
      knub.client.emit("ready", knub.client as Client<true>);
      await sleep(30);
      assert(loadedTimes === 1);

      done();
    });
  });

  it("Errors during plugin loading unloads guild", (mochaDone) => {
    withKnub(mochaDone, async (createKnub, done) => {
      let loadedTimes = 0;

      const Plugin1 = guildPlugin({
        name: "plugin1",
        configParser: () => ({}),

        beforeLoad() {
          loadedTimes++;
        },

        beforeUnload() {
          loadedTimes--;
        },
      });

      const PluginWithError = guildPlugin({
        name: "plugin-with-error",
        configParser: () => ({}),

        beforeStart() {
          throw new Error("Foo");
        },
      });

      const knub = createKnub({
        guildPlugins: [Plugin1, PluginWithError],
        options: {
          autoRegisterApplicationCommands: false,
          getEnabledGuildPlugins() {
            return ["plugin1", "plugin-with-error"];
          },
          logFn: noop,
        },
      });
      knub.on("error", () => {});

      const guild = createMockGuild(knub.client);

      await initializeKnub(knub);

      knub.client.ws.emit("GUILD_CREATE", guild);
      await sleep(10);
      knub.client.ws.emit("GUILD_CREATE", guild);
      await sleep(10);
      knub.client.ws.emit("GUILD_CREATE", guild);
      knub.client.ws.emit("GUILD_CREATE", guild);
      knub.client.ws.emit("GUILD_CREATE", guild);
      await sleep(10);

      expect(knub.getLoadedGuild(guild.id)).to.equal(undefined);
      expect(loadedTimes).to.equal(0);

      done();
    });
  });

  // it("Profiler tracks plugin load times", async () => {
  //   const PluginToLoad = guildPlugin({
  //     name: "plugin-to-load",
  //     configParser: () => ({}),
  //
  //     async beforeLoad() {
  //       await sleep(10);
  //     },
  //   });
  //
  //   const client = createMockClient();
  //   const knub = new Knub(client, {
  //     guildPlugins: [PluginToLoad],
  //     options: {
  //       autoRegisterApplicationCommands: false,
  //       getEnabledGuildPlugins() {
  //         return ["plugin-to-load"];
  //       },
  //       logFn: noop,
  //     },
  //   });
  //
  //   knub.initialize();
  //   client.emit("connect");
  //   client.emit("ready", client);
  //   await sleep(20);
  //
  //   const guild = createMockGuild(client);
  //   client.ws.emit("GUILD_CREATE", guild);
  //   await sleep(20);
  //
  //   expect(Object.keys(knub.profiler.getData())).to.include("load-plugin:plugin-to-load");
  //   expect(knub.profiler.getData()["load-plugin:plugin-to-load"].totalTime).to.be.greaterThanOrEqual(8);
  // });
  //
  // it("Profiler tracks event processing times", async () => {
  //   const PluginToLoad = guildPlugin({
  //     name: "plugin-to-load",
  //     configParser: () => ({}),
  //
  //     events: [
  //       guildPluginEventListener({
  //         event: "messageCreate",
  //         async listener() {
  //           await sleep(10);
  //         },
  //       }),
  //     ],
  //   });
  //
  //   const client = createMockClient();
  //   const knub = new Knub(client, {
  //     guildPlugins: [PluginToLoad],
  //     options: {
  //       autoRegisterApplicationCommands: false,
  //       getEnabledGuildPlugins() {
  //         return ["plugin-to-load"];
  //       },
  //       logFn: noop,
  //     },
  //   });
  //
  //   knub.initialize();
  //   client.emit("connect");
  //   client.emit("ready", client);
  //   await sleep(20);
  //
  //   const guild = createMockGuild(client);
  //   client.ws.emit("GUILD_CREATE", guild);
  //   await sleep(20);
  //
  //   const channel = createMockTextChannel(client, guild.id);
  //   const user = createMockUser(client);
  //   const message = createMockMessage(client, channel, user);
  //   client.emit("messageCreate", message);
  //   await sleep(20);
  //
  //   expect(Object.keys(knub.profiler.getData())).to.include("event:messageCreate:plugin-to-load");
  //   expect(knub.profiler.getData()["event:messageCreate:plugin-to-load"].totalTime).to.be.greaterThanOrEqual(8);
  // });
  //
  // it("Profiler tracks message command processing times", async () => {
  //   const PluginToLoad = guildPlugin({
  //     name: "plugin-to-load",
  //     configParser: () => ({}),
  //
  //     messageCommands: [
  //       guildPluginMessageCommand({
  //         trigger: "foo",
  //         permission: null,
  //         async run() {
  //           await sleep(10);
  //         },
  //       }),
  //     ],
  //   });
  //
  //   const client = createMockClient();
  //   const knub = new Knub(client, {
  //     guildPlugins: [PluginToLoad],
  //     options: {
  //       autoRegisterApplicationCommands: false,
  //       getEnabledGuildPlugins() {
  //         return ["plugin-to-load"];
  //       },
  //       getConfig() {
  //         return {
  //           prefix: "!",
  //         };
  //       },
  //       logFn: noop,
  //     },
  //   });
  //
  //   knub.initialize();
  //   client.emit("connect");
  //   client.emit("ready", client);
  //   await sleep(20);
  //
  //   const guild = createMockGuild(client);
  //   client.ws.emit("GUILD_CREATE", guild);
  //   await sleep(20);
  //
  //   const channel = createMockTextChannel(client, guild.id);
  //   const user = createMockUser(client);
  //   const message = createMockMessage(client, channel, user, { content: "!foo" });
  //   client.emit("messageCreate", message);
  //   await sleep(20);
  //
  //   expect(Object.keys(knub.profiler.getData())).to.include("command:foo");
  //   expect(knub.profiler.getData()["command:foo"].totalTime).to.be.greaterThanOrEqual(8);
  // });

  it("concurrentGuildLoadLimit", (mochaDone) => {
    withKnub(mochaDone, async (createKnub, done) => {
      const concurrentGuildLoadLimit = 10;
      const loadTimeMs = 40;
      let loadedTimes = 0;

      const PluginToLoad = guildPlugin({
        name: "plugin-to-load",
        configParser: () => ({}),

        async beforeLoad() {
          await sleep(loadTimeMs);
        },

        afterLoad() {
          loadedTimes++;
        },
      });

      const knub = createKnub({
        guildPlugins: [PluginToLoad],
        options: {
          autoRegisterApplicationCommands: false,
          getEnabledGuildPlugins() {
            return ["plugin-to-load"];
          },
          logFn: noop,
          concurrentGuildLoadLimit,
        },
      });
      await initializeKnub(knub);

      for (let i = 0; i < concurrentGuildLoadLimit * 2; i++) {
        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      }
      await sleep(loadTimeMs + 5);
      assert.equal(loadedTimes, concurrentGuildLoadLimit);
      await sleep(loadTimeMs + 5);
      assert.equal(loadedTimes, concurrentGuildLoadLimit * 2);

      done();
    });
  });
});
