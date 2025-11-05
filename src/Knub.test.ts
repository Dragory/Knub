import { assert, expect } from "chai";
import type { Client } from "discord.js";
import { describe, it } from "mocha";
import z from "zod/v4";
import { Knub } from "./Knub.ts";
import { guildPluginMessageCommand } from "./commands/messageCommands/messageCommandBlueprint.ts";
import { guildPluginEventListener } from "./events/EventListenerBlueprint.ts";
import { GuildPluginBlueprint, guildPlugin } from "./plugins/PluginBlueprint.ts";
import {
  createMockClient,
  createMockGuild,
  createMockMessage,
  createMockMember,
  createMockTextChannel,
  createMockUser,
  initializeKnub,
  sleep,
  withKnub,
} from "./testUtils.ts";
import { noop } from "./utils.ts";

describe("Knub", () => {
  it("Multiple GUILD_CREATE events load guild's plugins only once", (mochaDone) => {
    withKnub(mochaDone, async (createKnub, done) => {
      let loadedTimes = 0;

      const PluginToLoad = guildPlugin({
        name: "plugin-to-load",
        configSchema: z.strictObject({}),

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
        configSchema: z.strictObject({}),

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
        configSchema: z.strictObject({}),

        beforeLoad() {
          loadedTimes++;
        },

        beforeUnload() {
          loadedTimes--;
        },
      });

      const PluginWithError = guildPlugin({
        name: "plugin-with-error",
        configSchema: z.strictObject({}),

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
        configSchema: z.strictObject({}),

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

  it("deleted message commands remove matching definitions", (mochaDone) => {
    withKnub(mochaDone, async (createKnub, done) => {
      const deleteReasons: string[] = [];

      const TestPlugin = guildPlugin({
        name: "message-commands-removal",
        configSchema: z.strictObject({}),
        beforeStart(pluginData) {
          pluginData.messageCommands.onCommandDeleted(({ reason }) => {
            deleteReasons.push(reason);
          });
        },
        messageCommands: [
          guildPluginMessageCommand({
            trigger: "foo",
            permission: null,
            run: noop,
          }),
        ],
        deletedMessageCommands: ["foo"],
      });

      const knub = createKnub({
        guildPlugins: [TestPlugin],
        options: {
          autoRegisterApplicationCommands: false,
          getEnabledGuildPlugins() {
            return ["message-commands-removal"];
          },
          getConfig() {
            return { prefix: "!", levels: {} };
          },
          logFn: noop,
        },
      });
      await initializeKnub(knub);

      const guild = createMockGuild(knub.client);
      knub.client.ws.emit("GUILD_CREATE", guild);
      await sleep(10);

      const loadedGuild = knub.getLoadedGuild(guild.id)!;
      const pluginData = loadedGuild.loadedPlugins.get("message-commands-removal")!.pluginData;

      expect(pluginData.messageCommands.getAll()).to.have.length(0);
      expect(deleteReasons).to.deep.equal(["deleted"]);

      done();
    });
  });

  it("dispatchMessageCommands runs commands once and skips default handlers", (mochaDone) => {
    withKnub(mochaDone, async (createKnub, done) => {
      let runCount = 0;

      const DispatcherPlugin = guildPlugin({
        name: "dispatcher",
        configSchema: z.strictObject({}),
        messageCommands: [
          guildPluginMessageCommand({
            trigger: "foo",
            permission: null,
            run() {
              runCount += 1;
            },
          }),

  it("Unloading a guild waits for running event listeners to finish", (mochaDone) => {
    withKnub(mochaDone, async (createKnub, done) => {
      let listenerDone = false;
      const Plugin = guildPlugin({
        name: "plugin",
        configSchema: z.strictObject({}),
        events: [
          {
            event: "messageCreate",
            async listener() {
              await sleep(50);
              listenerDone = true;
            },
          },
        ],
      });

      const knub = createKnub({
        guildPlugins: [DispatcherPlugin],
        options: {
          autoRegisterApplicationCommands: false,
          getEnabledGuildPlugins() {
            return ["dispatcher"];
          },
          getConfig() {
            return { prefix: "!", levels: {} };

        guildPlugins: [Plugin],
        options: {
          autoRegisterApplicationCommands: false,
          getEnabledGuildPlugins() {
            return ["plugin"];
          },
          logFn: noop,
        },
      });
      await initializeKnub(knub);

      const guild = createMockGuild(knub.client);
      knub.client.ws.emit("GUILD_CREATE", guild);
      await sleep(10);

      const channel = createMockTextChannel(knub.client, guild.id);
      const user = createMockUser(knub.client);
      createMockMember(guild, user);

      const message = createMockMessage(knub.client, channel, user, {
        content: "!foo",
        guild_id: guild.id,
        member: {
          user: {
            id: user.id,
          },
          roles: [],
        },
      });

      await knub.dispatchMessageCommands(message as any);
      expect(runCount).to.equal(1);

      knub.client.emit("messageCreate", message);
      expect(runCount).to.equal(1);

      const channel = createMockTextChannel(knub.client, guild.id);
      const message = createMockMessage(knub.client, channel, createMockUser(knub.client));

      await knub.loadGuild(guild.id);
      knub.client.emit("messageCreate", message);
      await knub.unloadGuild(guild.id);

      assert.isTrue(listenerDone);

      done();
    });
  });

  it("Unloading a guild deals with event registration race conditions", (mochaDone) => {
    withKnub(mochaDone, async (createKnub, done) => {
      let cnt = 1;
      const Plugin = guildPlugin({
        name: "plugin",
        configSchema: z.strictObject({}),
        events: [
          {
            event: "messageCreate",
            async listener({ pluginData }) {
              cnt++;
              await sleep(50);
              pluginData.events.on("channelCreate", () => {
                cnt++;
              });
              // The following should not cause the above listener to run after unload
              knub.client.emit("channelCreate", channel);
            },
          },
        ],
      });

      const knub = createKnub({
        guildPlugins: [Plugin],
        options: {
          autoRegisterApplicationCommands: false,
          getEnabledGuildPlugins() {
            return ["plugin"];
          },
          logFn: noop,
        },
      });
      await initializeKnub(knub);

      const guild = createMockGuild(knub.client);
      const channel = createMockTextChannel(knub.client, guild.id);
      const message = createMockMessage(knub.client, channel, createMockUser(knub.client));

      await knub.loadGuild(guild.id);
      knub.client.emit("messageCreate", message);
      await knub.unloadGuild(guild.id);

      assert.equal(cnt, 2);

      done();
    });
  });
});