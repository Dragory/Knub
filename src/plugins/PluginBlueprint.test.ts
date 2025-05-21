import { assert, expect } from "chai";
import type { ChatInputCommandInteraction, TextChannel } from "discord.js";
import { parseSignature } from "knub-command-manager";
import { describe, it } from "mocha";
import { PluginContextMenuCommandManager } from "../commands/contextMenuCommands/PluginContextMenuCommandManager.ts";
import { guildPluginMessageContextMenuCommand } from "../commands/contextMenuCommands/contextMenuCommandBlueprint.ts";
import { PluginMessageCommandManager } from "../commands/messageCommands/PluginMessageCommandManager.ts";
import { guildPluginMessageCommand } from "../commands/messageCommands/messageCommandBlueprint.ts";
import { PluginSlashCommandManager } from "../commands/slashCommands/PluginSlashCommandManager.ts";
import { PluginConfigManager } from "../config/PluginConfigManager.ts";
import { globalPluginEventListener, guildPluginEventListener } from "../events/EventListenerBlueprint.ts";
import { GlobalPluginEventManager } from "../events/GlobalPluginEventManager.ts";
import { GuildPluginEventManager } from "../events/GuildPluginEventManager.ts";
import {
  CooldownManager,
  type GlobalPluginBlueprint,
  type GlobalPluginData,
  LockManager,
  guildPluginSlashCommand,
  guildPluginSlashGroup,
  slashOptions,
} from "../index.ts";
import {
  assertTypeEquals,
  createMockClient,
  createMockGuild,
  createMockMember,
  createMockMessage,
  createMockRole,
  createMockTextChannel,
  createMockUser,
  initializeKnub,
  sleep,
  withKnub,
} from "../testUtils.ts";
import { noop } from "../utils.ts";
import { type AnyPluginBlueprint, type GuildPluginBlueprint, globalPlugin, guildPlugin } from "./PluginBlueprint.ts";
import { type GuildPluginData, isGlobalPluginData } from "./PluginData.ts";
import type { BasePluginType } from "./pluginTypes.ts";
import { PluginPublicInterface } from "./pluginUtils.ts";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("PluginBlueprint", () => {
  describe("Commands and events", () => {
    it("loads commands and events", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad = guildPlugin({
          name: "plugin-to-load",
          configParser: () => ({}),

          messageCommands: [guildPluginMessageCommand({ trigger: "foo", permission: null, run: noop })],
          slashCommands: [guildPluginSlashCommand({ name: "bar", description: "", signature: [], run: noop })],
          contextMenuCommands: [guildPluginMessageContextMenuCommand({ name: "baz", run: noop })],
          events: [guildPluginEventListener({ event: "messageCreate", listener: noop })],

          afterLoad(pluginData) {
            assert.strictEqual(pluginData.messageCommands.getAll().length, 1);
            assert.strictEqual(pluginData.slashCommands.getAll().length, 1);
            assert.strictEqual(pluginData.contextMenuCommands.getAll().length, 1);
            // There are also default message and interaction listeners that are always registered, hence 4
            assert.strictEqual(pluginData.events.getListenerCount(), 4);

            done();
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
      });
    });

    it("guild events are only passed to the matching guild", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad = guildPlugin({
          name: "plugin-to-load",
          configParser: () => ({}),

          events: [
            guildPluginEventListener({
              event: "messageCreate",
              listener({ pluginData, args }) {
                assert.strictEqual(pluginData.guild.id, args.message.channel.guild.id);
                guildCounts[pluginData.guild.id]++;
              },
            }),
          ],
        });

        const knub = createKnub({
          guildPlugins: [PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild0 = createMockGuild(knub.client);
        const guild1 = createMockGuild(knub.client);

        const guildCounts = {
          [guild0.id]: 0,
          [guild1.id]: 0,
        };

        knub.client.ws.emit("GUILD_CREATE", guild0);
        knub.client.ws.emit("GUILD_CREATE", guild1);
        await sleep(30);

        const user0 = createMockUser(knub.client);
        const user1 = createMockUser(knub.client);
        const guild0Channel = createMockTextChannel(knub.client, guild0.id);
        const guild1Channel = createMockTextChannel(knub.client, guild1.id);

        const guild0Message1 = createMockMessage(knub.client, guild0Channel, user0, { content: "foo" });
        const guild0Message2 = createMockMessage(knub.client, guild0Channel, user0, { content: "bar" });
        const guild1Message1 = createMockMessage(knub.client, guild1Channel, user1, { content: "foo" });
        const guild1Message2 = createMockMessage(knub.client, guild1Channel, user1, { content: "bar" });

        knub.client.emit("messageCreate", guild0Message1);
        knub.client.emit("messageCreate", guild0Message2);
        knub.client.emit("messageCreate", guild1Message1);
        knub.client.emit("messageCreate", guild1Message2);
        await sleep(30);

        assert.strictEqual(guildCounts[guild0.id], 2);
        assert.strictEqual(guildCounts[guild1.id], 2);
        done();
      });
    });

    it("global events are not passed to guild event listeners", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad = guildPlugin({
          name: "plugin-to-load",
          configParser: () => ({}),

          events: [
            // @ts-expect-error: "userUpdate" is not a valid guild event
            guildPluginEventListener({
              // @ts-expect-error: "userUpdate" is not a valid guild event
              event: "userUpdate",
              listener() {
                assert.fail("userUpdate was called in a guild event listener");
              },
            }),
          ],
        });

        const client = createMockClient();
        const knub = createKnub({
          guildPlugins: [PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild0 = createMockGuild(client);
        client.ws.emit("GUILD_CREATE", guild0);
        await sleep(30);

        const user = createMockUser(client);
        client.emit("userUpdate", user, user);
        await sleep(10);

        done();
      });
    });

    it("global events are passed to global event listeners", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad = globalPlugin({
          name: "plugin-to-load",
          configParser: () => ({}),

          events: [
            globalPluginEventListener({
              event: "userUpdate",
              listener() {
                done();
              },
            }),
          ],
        });

        const knub = createKnub({
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const user = createMockUser(knub.client);
        knub.client.emit("userUpdate", user, user);
      });
    });

    it("guild events are passed to global event listeners", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad = globalPlugin({
          name: "plugin-to-load",
          configParser: () => ({}),

          events: [
            globalPluginEventListener({
              event: "messageCreate",
              listener({ pluginData, args }) {
                assert.ok(isGlobalPluginData(pluginData));
                assert.strictEqual((args.message.channel as TextChannel).guild.id, guild.id);
                done();
              },
            }),
          ],
        });

        const knub = createKnub({
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);

        const user = createMockUser(knub.client);
        const channel = createMockTextChannel(knub.client, guild.id);
        const message = createMockMessage(knub.client, channel, user);
        knub.client.emit("messageCreate", message);
      });
    });

    describe("Message commands", () => {
      it("command permissions", (mochaDone) => {
        withKnub(mochaDone, async (createKnub, done) => {
          const infoCmdCallUsers: string[] = [];
          const serverCmdCallUsers: string[] = [];
          const pingCmdCallUsers: string[] = [];

          interface PluginType extends BasePluginType {
            config: {
              can_use_info_cmd: boolean;
              can_use_server_cmd: boolean;
              can_use_ping_cmd: boolean;
            };
          }

          const TestPlugin = guildPlugin<PluginType>()({
            name: "test-plugin",
            configParser: (input) => input as PluginType["config"],

            defaultOptions: {
              config: {
                can_use_info_cmd: false,
                can_use_server_cmd: false,
                can_use_ping_cmd: false,
              },
            },

            messageCommands: [
              guildPluginMessageCommand({
                trigger: "info",
                permission: "can_use_info_cmd",
                run({ message }) {
                  infoCmdCallUsers.push(message.author.id);
                },
              }),
              guildPluginMessageCommand({
                trigger: "server",
                permission: "can_use_server_cmd",
                run({ message }) {
                  serverCmdCallUsers.push(message.author.id);
                },
              }),
              guildPluginMessageCommand({
                trigger: "ping",
                permission: "can_use_ping_cmd",
                run({ message }) {
                  pingCmdCallUsers.push(message.author.id);
                },
              }),
            ],
          });

          const knub = createKnub({
            guildPlugins: [TestPlugin],
            options: {
              getEnabledGuildPlugins() {
                return ["test-plugin"];
              },
              getConfig() {
                return {
                  prefix: "!",
                  plugins: {
                    "test-plugin": {
                      overrides: [
                        {
                          user: user1.id,
                          config: {
                            can_use_info_cmd: true,
                          },
                        },
                        {
                          user: user2.id,
                          config: {
                            can_use_server_cmd: true,
                          },
                        },
                        {
                          role: role.id,
                          config: {
                            can_use_ping_cmd: true,
                          },
                        },
                      ],
                    },
                  },
                };
              },
              logFn: noop,
            },
          });

          const user1 = createMockUser(knub.client);
          const user2 = createMockUser(knub.client);
          const user3 = createMockUser(knub.client);
          const guild = createMockGuild(knub.client);
          const role = createMockRole(guild);

          await initializeKnub(knub);

          void createMockMember(guild, user3, { roles: [role.id] });

          knub.client.ws.emit("GUILD_CREATE", guild);
          await sleep(10);

          const channel = createMockTextChannel(knub.client, guild.id);

          // !info
          const infoFromUser1Msg = createMockMessage(knub.client, channel, user1, { content: "!info" });
          knub.client.emit("messageCreate", infoFromUser1Msg);
          await sleep(10);
          const infoFromUser2Msg = createMockMessage(knub.client, channel, user2, { content: "!info" });
          knub.client.emit("messageCreate", infoFromUser2Msg);
          await sleep(10);

          // !server
          const serverFromUser1Msg = createMockMessage(knub.client, channel, user1, { content: "!server" });
          knub.client.emit("messageCreate", serverFromUser1Msg);
          await sleep(10);
          const serverFromUser2Msg = createMockMessage(knub.client, channel, user2, { content: "!server" });
          knub.client.emit("messageCreate", serverFromUser2Msg);
          await sleep(10);

          // !ping
          const pingFromUser1Msg = createMockMessage(knub.client, channel, user1, { content: "!ping" });
          knub.client.emit("messageCreate", pingFromUser1Msg);
          await sleep(10);
          const pingFromUser3Msg = createMockMessage(knub.client, channel, user3, { content: "!ping" });
          knub.client.emit("messageCreate", pingFromUser3Msg);
          await sleep(10);

          assert.deepStrictEqual(infoCmdCallUsers, [user1.id]);
          assert.deepStrictEqual(serverCmdCallUsers, [user2.id]);
          assert.deepStrictEqual(pingCmdCallUsers, [user3.id]);

          done();
        });
      });
    });

    describe("Slash commands", () => {
      it("Type inference in slash command function", () => {
        guildPlugin({
          name: "slash-test-plugin",
          configParser: () => ({}),

          slashCommands: [
            guildPluginSlashCommand({
              name: "echo",
              description: "Repeat what you said",
              signature: [
                slashOptions.string({ name: "text1", description: "bar", required: true }),
                slashOptions.string({ name: "text2", description: "bar" }),
                slashOptions.string({ name: "text3", description: "bar", required: false }),
              ],
              run({ interaction, options }) {
                assertTypeEquals<string, typeof options.text1, true>();
                assertTypeEquals<null, typeof options.text1, false>(); // Required (required: true), cannot be null

                assertTypeEquals<string, typeof options.text2, true>();
                assertTypeEquals<null, typeof options.text2, true>(); // Optional (required: omitted), can be null

                assertTypeEquals<string, typeof options.text3, true>();
                assertTypeEquals<null, typeof options.text3, true>(); // Optional (required: false), can be null

                assertTypeEquals<ChatInputCommandInteraction, typeof interaction, true>();
              },
            }),
          ],
        });
      });

      it("Slash command group types", () => {
        guildPlugin({
          name: "slash-test-plugin",
          configParser: () => ({}),

          slashCommands: [
            guildPluginSlashGroup({
              name: "top_level_group",
              description: "",
              subcommands: [
                guildPluginSlashCommand({
                  name: "one_level_down",
                  description: "",
                  signature: [],
                  run() {},
                }),

                guildPluginSlashGroup({
                  name: "second_level_group",
                  description: "",
                  subcommands: [
                    guildPluginSlashCommand({
                      name: "two_levels_down",
                      description: "",
                      signature: [],
                      run() {},
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
      });
    });
  });

  describe("Lifecycle hooks", () => {
    it("GuildPlugin beforeLoad()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          beforeLoad() {
            done();
          },
        };

        const knub = createKnub({
          guildPlugins: [PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("GlobalPlugin beforeLoad()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad: GlobalPluginBlueprint<GlobalPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          beforeLoad() {
            done();
          },
        };

        const knub = createKnub({
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);
      });
    });

    it("GuildPlugin beforeStart()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          beforeStart() {
            done();
          },
        };

        const knub = createKnub({
          guildPlugins: [PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("GlobalPlugin beforeStart()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad: GlobalPluginBlueprint<GlobalPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          beforeStart() {
            done();
          },
        };

        const knub = createKnub({
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);
      });
    });

    it("GuildPlugin afterLoad()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          afterLoad() {
            done();
          },
        };

        const knub = createKnub({
          guildPlugins: [PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("GlobalPlugin afterLoad()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad: GlobalPluginBlueprint<GlobalPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          afterLoad() {
            done();
          },
        };

        const knub = createKnub({
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);
      });
    });

    it("GuildPlugin beforeUnload()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const beforeUnloadCalled = false;
        const PluginToUnload: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "plugin-to-unload",
          configParser: () => ({}),

          afterLoad() {
            knub.client.emit("guildUnavailable", guild);
          },

          beforeUnload() {
            done();
          },
        };

        const knub = createKnub({
          guildPlugins: [PluginToUnload],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-unload"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("GlobalPlugin beforeUnload()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad: GlobalPluginBlueprint<GlobalPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          beforeUnload() {
            done();
          },
        };

        const knub = createKnub({
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);
        void knub.destroy();
      });
    });

    it("GuildPlugin afterUnload()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToUnload: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "plugin-to-unload",
          configParser: () => ({}),

          afterLoad() {
            knub.client.emit("guildUnavailable", guild);
          },

          afterUnload() {
            done();
          },
        };

        const knub = createKnub({
          guildPlugins: [PluginToUnload],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-unload"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("GlobalPlugin afterUnload()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad: GlobalPluginBlueprint<GlobalPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          afterUnload() {
            done();
          },
        };

        const knub = createKnub({
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);
        void knub.destroy();
      });
    });

    it("GuildPlugin afterLoad() runs after beforeLoad()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        let beforeLoadCalled = false;

        const PluginToLoad: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          beforeLoad() {
            beforeLoadCalled = true;
          },

          afterLoad() {
            assert.strictEqual(beforeLoadCalled, true);
            done();
          },
        };

        const knub = createKnub({
          guildPlugins: [PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("GlobalPlugin afterLoad() runs after beforeLoad()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        let beforeLoadCalled = false;

        const PluginToLoad: GlobalPluginBlueprint<GlobalPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          beforeLoad() {
            beforeLoadCalled = true;
          },

          afterLoad() {
            assert.strictEqual(beforeLoadCalled, true);
            done();
          },
        };

        const knub = createKnub({
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);
      });
    });

    it("GuildPlugin beforeUnload() runs before afterUnload()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        let beforeUnloadCalled = false;

        const PluginToUnload: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "plugin-to-unload",
          configParser: () => ({}),

          afterLoad() {
            knub.client.emit("guildUnavailable", guild);
          },

          beforeUnload() {
            beforeUnloadCalled = true;
          },

          afterUnload() {
            assert.strictEqual(beforeUnloadCalled, true);
            done();
          },
        };

        const knub = createKnub({
          guildPlugins: [PluginToUnload],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-unload"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("GlobalPlugin beforeUnload() runs before afterUnload()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        let beforeUnloadCalled = false;

        const PluginToUnload: GlobalPluginBlueprint<GlobalPluginData<BasePluginType>, any> = {
          name: "plugin-to-unload",
          configParser: () => ({}),

          beforeUnload() {
            beforeUnloadCalled = true;
          },

          afterUnload() {
            assert.strictEqual(beforeUnloadCalled, true);
            done();
          },
        };

        const knub = createKnub({
          globalPlugins: [PluginToUnload],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);
        void knub.destroy();
      });
    });

    it("hasPlugin() and getPlugin() are unavailable in GuildPlugin beforeLoad()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          beforeLoad(pluginData) {
            assert.throws(() => pluginData.hasPlugin({} as AnyPluginBlueprint));
            assert.throws(() => pluginData.getPlugin({} as AnyPluginBlueprint));
            done();
          },
        };

        const knub = createKnub({
          guildPlugins: [PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("hasPlugin() and getPlugin() are unavailable in GlobalPlugin beforeLoad()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad: GlobalPluginBlueprint<GlobalPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          beforeLoad(pluginData) {
            assert.throws(() => pluginData.hasPlugin({} as AnyPluginBlueprint));
            assert.throws(() => pluginData.getPlugin({} as AnyPluginBlueprint));
            done();
          },
        };

        const knub = createKnub({
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);
      });
    });

    it("hasPlugin() and getPlugin() are unavailable in GuildPlugin afterUnload()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToUnload: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "plugin-to-unload",
          configParser: () => ({}),

          afterLoad() {
            knub.client.emit("guildUnavailable", guild);
          },

          afterUnload(pluginData) {
            assert.throws(() => pluginData.hasPlugin({} as AnyPluginBlueprint));
            assert.throws(() => pluginData.getPlugin({} as AnyPluginBlueprint));
            done();
          },
        };

        const knub = createKnub({
          guildPlugins: [PluginToUnload],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-unload"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("hasPlugin() and getPlugin() are unavailable in GlobalPlugin afterUnload()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginToLoad: GlobalPluginBlueprint<GlobalPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),

          afterUnload(pluginData) {
            assert.throws(() => pluginData.hasPlugin({} as AnyPluginBlueprint));
            assert.throws(() => pluginData.getPlugin({} as AnyPluginBlueprint));
            done();
          },
        };

        const knub = createKnub({
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);
        void knub.destroy();
      });
    });

    it("GuildPlugin is unavailable to other plugins during afterUnload()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginWithPublicInterface = guildPlugin<BasePluginType>()({
          name: "plugin-with-public-interface",
          configParser: () => ({}),

          public() {
            return {};
          },
        });

        const PluginWithTests: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "plugin-with-tests",
          configParser: () => ({}),
          dependencies: () => [PluginWithPublicInterface],
          afterLoad() {
            knub.client.emit("guildUnavailable", guild);
          },
          afterUnload(pluginData) {
            assert.throws(() => pluginData.getPlugin(PluginWithPublicInterface));
            done();
          },
        };

        const knub = createKnub({
          guildPlugins: [PluginWithPublicInterface, PluginWithTests],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-with-tests"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("GlobalPlugin is unavailable to other plugins during afterUnload()", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const PluginWithPublicInterface = globalPlugin<BasePluginType>()({
          name: "plugin-with-public-interface",
          configParser: () => ({}),

          public() {
            return {};
          },
        });

        const PluginWithTests: GlobalPluginBlueprint<GlobalPluginData<BasePluginType>, any> = {
          name: "plugin-with-tests",
          configParser: () => ({}),
          dependencies: () => [PluginWithPublicInterface],
          afterLoad() {
            void knub.destroy();
          },
          afterUnload(pluginData) {
            assert.throws(() => pluginData.getPlugin(PluginWithPublicInterface));
            done();
          },
        };

        const knub = createKnub({
          globalPlugins: [PluginWithPublicInterface, PluginWithTests],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);
      });
    });

    it("GuildPlugin hook order", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        let lastCalledHook: string | null = null;

        const PluginToLoad: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),
          beforeLoad() {
            assert.strictEqual(lastCalledHook, null);
            lastCalledHook = "beforeLoad";
          },
          beforeStart() {
            assert.strictEqual(lastCalledHook, "beforeLoad");
            lastCalledHook = "beforeStart";
          },
          afterLoad() {
            assert.strictEqual(lastCalledHook, "beforeStart");
            lastCalledHook = "afterLoad";
            knub.client.emit("guildUnavailable", guild);
          },
          beforeUnload() {
            assert.strictEqual(lastCalledHook, "afterLoad");
            lastCalledHook = "beforeUnload";
          },
          afterUnload() {
            assert.strictEqual(lastCalledHook, "beforeUnload");
            done();
          },
        };

        const knub = createKnub({
          guildPlugins: [PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("GlobalPlugin hook order", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        let lastCalledHook: string | null = null;

        const PluginToLoad: GlobalPluginBlueprint<GlobalPluginData<BasePluginType>, any> = {
          name: "plugin-to-load",
          configParser: () => ({}),
          beforeLoad() {
            assert.strictEqual(lastCalledHook, null);
            lastCalledHook = "beforeLoad";
          },
          beforeStart() {
            assert.strictEqual(lastCalledHook, "beforeLoad");
            lastCalledHook = "beforeStart";
          },
          afterLoad() {
            assert.strictEqual(lastCalledHook, "beforeStart");
            lastCalledHook = "afterLoad";
            void knub.destroy();
          },
          beforeUnload() {
            assert.strictEqual(lastCalledHook, "afterLoad");
            lastCalledHook = "beforeUnload";
          },
          afterUnload() {
            assert.strictEqual(lastCalledHook, "beforeUnload");
            done();
          },
        };

        const knub = createKnub({
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);
      });
    });
  });

  describe("Dependencies", () => {
    it("hasPlugin", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const DependencyToLoad = guildPlugin({
          name: "dependency-to-load",
          configParser: () => ({}),
        });

        const SomeOtherPlugin = guildPlugin({
          name: "some-other-plugin",
          configParser: () => ({}),
        });

        const PluginToLoad = guildPlugin({
          name: "plugin-to-load",
          dependencies: () => [DependencyToLoad],
          configParser: () => ({}),

          afterLoad(pluginData) {
            assert.ok(pluginData.hasPlugin(DependencyToLoad));
            assert.ok(!pluginData.hasPlugin(SomeOtherPlugin));
            done();
          },
        });

        const knub = createKnub({
          guildPlugins: [DependencyToLoad, PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["dependency-to-load", "plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("getPlugin", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        interface DependencyPluginType extends BasePluginType {
          state: { value: number };
        }

        const DependencyToLoad = guildPlugin<DependencyPluginType>()({
          name: "dependency-to-load",
          configParser: () => ({}),

          public(pluginData) {
            return {
              ok() {
                assert.strictEqual(pluginData.state.value, 10);
                done();
              },
            };
          },

          beforeLoad(pluginData) {
            pluginData.state.value = 10;
          },
        });

        const PluginToLoad = guildPlugin({
          name: "plugin-to-load",
          configParser: () => ({}),

          afterLoad(pluginData) {
            const instance = pluginData.getPlugin(DependencyToLoad);
            instance.ok();
          },
        });

        const knub = createKnub({
          guildPlugins: [DependencyToLoad, PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["dependency-to-load", "plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("hasGlobalPlugin", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const SomeGlobalPlugin = globalPlugin({
          name: "some-global-plugin",
          configParser: () => ({}),
          public() {
            return {
              works: () => true,
            };
          },
        });

        const SomeGuildPlugin = guildPlugin({
          name: "some-guild-plugin",
          configParser: () => ({}),

          beforeLoad(pluginData) {
            const hasGlobalPlugin = pluginData.hasGlobalPlugin(SomeGlobalPlugin);
            assert.strictEqual(hasGlobalPlugin, true);
            done();
          },
        });

        const knub = createKnub({
          globalPlugins: [SomeGlobalPlugin],
          guildPlugins: [SomeGuildPlugin],
          options: {
            getEnabledGuildPlugins() {
              return ["some-guild-plugin"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("getPlugin", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const SomeGlobalPlugin = globalPlugin({
          name: "some-global-plugin",
          configParser: () => ({}),
          public() {
            return {
              works: () => true,
            };
          },
        });

        const SomeGuildPlugin = guildPlugin({
          name: "some-guild-plugin",
          configParser: () => ({}),

          beforeLoad(pluginData) {
            const globalPlugin = pluginData.getGlobalPlugin(SomeGlobalPlugin);
            assert.strictEqual(globalPlugin.works(), true);
            done();
          },
        });

        const knub = createKnub({
          globalPlugins: [SomeGlobalPlugin],
          guildPlugins: [SomeGuildPlugin],
          options: {
            getEnabledGuildPlugins() {
              return ["some-guild-plugin"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("getPlugin has correct pluginData", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const DependencyToLoad = guildPlugin({
          name: "dependency-to-load",
          configParser: (input) => input,

          defaultOptions: {
            config: {
              some_value: "cookies",
            },
          },

          public(pluginData) {
            return {
              ok() {
                assert.ok(pluginData != null);
                assert.strictEqual(pluginData.config.get().some_value, "cookies");
                assert.notStrictEqual(pluginData.config.get().some_value, "milk");

                done();
              },
            };
          },
        });

        const PluginToLoad = guildPlugin({
          name: "plugin-to-load",
          configParser: () => ({}),

          defaultOptions: {
            config: {
              some_value: "milk",
            },
          },

          afterLoad(pluginData) {
            const instance = pluginData.getPlugin(DependencyToLoad);
            instance.ok();
          },
        });

        const knub = createKnub({
          guildPlugins: [DependencyToLoad, PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["dependency-to-load", "plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("automatic dependency loading", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const DependencyToLoad = guildPlugin({
          name: "dependency-to-load",
          configParser: () => ({}),
        });

        const OtherDependencyToLoad = guildPlugin({
          name: "other-dependency-to-load",
          configParser: () => ({}),
        });

        const PluginToLoad = guildPlugin({
          name: "plugin-to-load",
          configParser: () => ({}),

          dependencies: () => [DependencyToLoad, OtherDependencyToLoad],

          afterLoad(pluginData) {
            assert.ok(pluginData.hasPlugin(DependencyToLoad));
            assert.ok(pluginData.hasPlugin(OtherDependencyToLoad));
            done();
          },
        });

        const knub = createKnub({
          guildPlugins: [DependencyToLoad, OtherDependencyToLoad, PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("transitive dependencies", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const DependencyTwo = guildPlugin({
          name: "dependency-two",
          configParser: () => ({}),
        });
        const DependencyOne = guildPlugin({
          name: "dependency-one",
          configParser: () => ({}),
          dependencies: () => [DependencyTwo],
        });

        const PluginToLoad = guildPlugin({
          name: "plugin-to-load",
          configParser: () => ({}),

          dependencies: () => [DependencyOne],

          afterLoad(pluginData) {
            assert.ok(pluginData.hasPlugin(DependencyOne));
            assert.ok(pluginData.hasPlugin(DependencyTwo));
            done();
          },
        });

        const knub = createKnub({
          guildPlugins: [DependencyOne, DependencyTwo, PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("plugins loaded as dependencies do not load commands or events", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const Dependency = guildPlugin({
          name: "dependency",
          configParser: () => ({}),

          messageCommands: [guildPluginMessageCommand({ trigger: "foo", permission: null, run: noop })],
          events: [guildPluginEventListener({ event: "messageCreate", listener: noop })],

          afterLoad(pluginData) {
            // The command above should *not* be loaded
            assert.strictEqual(pluginData.messageCommands.getAll().length, 0);
            // The event listener above should *not* be loaded, and neither should the default message listener
            assert.strictEqual(pluginData.events.getListenerCount(), 0);

            done();
          },
        });

        const PluginToLoad = guildPlugin({
          name: "plugin-to-load",
          configParser: () => ({}),
          dependencies: () => [Dependency],
        });

        const knub = createKnub({
          guildPlugins: [Dependency, PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });
  });

  describe("Custom overrides", () => {
    it("Synchronous custom overrides", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        let commandTriggers = 0;

        interface PluginType extends BasePluginType {
          customOverrideCriteria: {
            myUserOverride: string;
          };
        }

        const TestPlugin = guildPlugin<PluginType>()({
          name: "test-plugin",
          configParser: () => ({}),

          defaultOptions: {
            config: {
              can_do: false,
            },
          },

          customOverrideCriteriaFunctions: {
            myUserOverride: (pluginData, matchParams, value) => matchParams.userId === value,
          },

          messageCommands: [
            guildPluginMessageCommand({
              trigger: "foo",
              permission: "can_do",
              run() {
                commandTriggers++;
              },
            }),
          ],

          async afterLoad() {
            const channel = createMockTextChannel(knub.client, guild.id);

            const message1 = createMockMessage(knub.client, channel, user1, { content: "!foo" });
            knub.client.emit("messageCreate", message1);
            await sleep(30);

            const message2 = createMockMessage(knub.client, channel, user2, { content: "!foo" });
            knub.client.emit("messageCreate", message2);
            await sleep(30);

            assert.equal(commandTriggers, 1);
            done();
          },
        });

        const knub = createKnub({
          guildPlugins: [TestPlugin],
          options: {
            getEnabledGuildPlugins() {
              return ["test-plugin"];
            },
            getConfig() {
              return {
                prefix: "!",
                plugins: {
                  "test-plugin": {
                    overrides: [
                      {
                        extra: {
                          myUserOverride: user1.id,
                        },
                        config: {
                          can_do: true,
                        },
                      },
                    ],
                  },
                },
              };
            },
            logFn: noop,
          },
        });

        const user1 = createMockUser(knub.client);
        const user2 = createMockUser(knub.client);

        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("Asynchronous custom overrides", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        let commandTriggers = 0;

        interface PluginType extends BasePluginType {
          customOverrideCriteria: {
            myAsyncUserOverride: string;
          };
        }

        const TestPlugin = guildPlugin<PluginType>()({
          name: "test-plugin",
          configParser: () => ({}),

          defaultOptions: {
            config: {
              can_do: false,
            },
          },

          customOverrideCriteriaFunctions: {
            myAsyncUserOverride: async (pluginData, matchParams, value) => {
              await sleep(5);
              return matchParams.userId === value;
            },
          },

          messageCommands: [
            guildPluginMessageCommand({
              trigger: "foo",
              permission: "can_do",
              run() {
                commandTriggers++;
              },
            }),
          ],

          async afterLoad() {
            const channel = createMockTextChannel(knub.client, guild.id);

            const message1 = createMockMessage(knub.client, channel, user1, { content: "!foo" });
            knub.client.emit("messageCreate", message1);
            await sleep(30);

            const message2 = createMockMessage(knub.client, channel, user2, { content: "!foo" });
            knub.client.emit("messageCreate", message2);
            await sleep(30);

            assert.equal(commandTriggers, 1);

            done();
          },
        });

        const knub = createKnub({
          guildPlugins: [TestPlugin],
          options: {
            getEnabledGuildPlugins() {
              return ["test-plugin"];
            },
            getConfig() {
              return {
                prefix: "!",
                plugins: {
                  "test-plugin": {
                    overrides: [
                      {
                        extra: {
                          myAsyncUserOverride: user1.id,
                        },
                        config: {
                          can_do: true,
                        },
                      },
                    ],
                  },
                },
              };
            },
            logFn: noop,
          },
        });

        const user1 = createMockUser(knub.client);
        const user2 = createMockUser(knub.client);

        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });
  });

  describe("Custom argument types", () => {
    it("Custom argument types", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const types = {
          foo: (value, ctx) => {
            return `${value}-${ctx.pluginData.guild.id}`;
          },
        };

        const TestPlugin = guildPlugin({
          name: "test-plugin",
          configParser: () => ({}),

          messageCommands: [
            guildPluginMessageCommand({
              trigger: "foo",
              permission: null,
              signature: parseSignature("<str:foo>", types, "foo"),
              run({ args: { str } }) {
                assert.equal(str, `bar-${guild.id}`);
                done();
              },
            }),
          ],

          afterLoad() {
            const channel = createMockTextChannel(knub.client, guild.id);
            const user = createMockUser(knub.client);
            const msg = createMockMessage(knub.client, channel, user, { content: "!foo bar" });
            knub.client.emit("messageCreate", msg);
          },
        });

        const knub = createKnub({
          guildPlugins: [TestPlugin],
          options: {
            getEnabledGuildPlugins() {
              return ["test-plugin"];
            },
            getConfig() {
              return {
                prefix: "!",
              };
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });
  });

  describe("Misc", () => {
    it("pluginData contains everything (guild plugin)", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const TestPlugin: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "test-plugin",
          configParser: () => ({}),

          afterLoad(pluginData) {
            assert.ok(pluginData.client != null);
            assert.ok((pluginData.cooldowns as unknown) instanceof CooldownManager);
            assert.ok((pluginData.messageCommands as unknown) instanceof PluginMessageCommandManager);
            assert.ok((pluginData.slashCommands as unknown) instanceof PluginSlashCommandManager);
            assert.ok((pluginData.contextMenuCommands as unknown) instanceof PluginContextMenuCommandManager);
            assert.ok((pluginData.config as unknown) instanceof PluginConfigManager);
            assert.ok((pluginData.events as unknown) instanceof GuildPluginEventManager);
            assert.ok((pluginData.locks as unknown) instanceof LockManager);
            done();
          },
        };

        const knub = createKnub({
          guildPlugins: [TestPlugin],
          options: {
            getEnabledGuildPlugins() {
              return ["test-plugin"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });

    it("pluginData contains everything (global plugin)", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        const TestPlugin: GlobalPluginBlueprint<GlobalPluginData<BasePluginType>, any> = {
          name: "test-plugin",
          configParser: () => ({}),

          afterLoad(pluginData) {
            assert.ok(pluginData.client != null);
            assert.ok((pluginData.cooldowns as unknown) instanceof CooldownManager);
            assert.ok((pluginData.messageCommands as unknown) instanceof PluginMessageCommandManager);
            assert.ok((pluginData.slashCommands as unknown) instanceof PluginSlashCommandManager);
            assert.ok((pluginData.contextMenuCommands as unknown) instanceof PluginContextMenuCommandManager);
            assert.ok((pluginData.config as unknown) instanceof PluginConfigManager);
            assert.ok((pluginData.events as unknown) instanceof GlobalPluginEventManager);
            assert.ok((pluginData.locks as unknown) instanceof LockManager);
            done();
          },
        };

        const knub = createKnub({
          globalPlugins: [TestPlugin],
          options: {
            logFn: noop,
          },
        });
        await initializeKnub(knub);
      });
    });

    it("event handlers are unloaded on plugin unload", (mochaDone) => {
      withKnub(mochaDone, async (createKnub, done) => {
        let msgEvFnCallNum = 0;

        const messageEv = guildPluginEventListener({
          event: "messageCreate",
          listener() {
            msgEvFnCallNum++;
            knub.client.emit("guildUnavailable", guild);
            sleep(30).then(async () => {
              const msg2 = createMockMessage(knub.client, textChannel, author, { content: "hi!" });
              knub.client.emit("messageCreate", msg2);
              await sleep(30);

              assert.strictEqual(msgEvFnCallNum, 1);

              done();
            });
          },
        });

        const PluginToUnload: GuildPluginBlueprint<GuildPluginData<BasePluginType>, any> = {
          name: "plugin-to-unload",
          configParser: () => ({}),
          events: [messageEv],
          afterLoad() {
            const msg = createMockMessage(knub.client, textChannel, author, { content: "hi!" });
            knub.client.emit("messageCreate", msg);
          },
        };

        const knub = createKnub({
          guildPlugins: [PluginToUnload],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-unload"];
            },
            logFn: noop,
          },
        });
        await initializeKnub(knub);

        const guild = createMockGuild(knub.client);
        const textChannel = createMockTextChannel(knub.client, guild.id);
        const author = createMockUser(knub.client);
        knub.client.ws.emit("GUILD_CREATE", guild);
      });
    });
  });

  describe("plugin() helper", () => {
    it("(blueprint)", () => {
      const blueprint = guildPlugin({
        name: "my-plugin",
        configParser: () => ({}),
      });

      expect(blueprint.name).to.equal("my-plugin");
    });

    interface CustomPluginType extends BasePluginType {
      state: {
        foo: 5;
      };
    }

    it("<TPluginType>()(blueprint)", () => {
      const blueprint = guildPlugin<CustomPluginType>()({
        name: "my-plugin",
        configParser: () => ({}),

        beforeLoad(pluginData) {
          const typeCheck: AssertEquals<typeof pluginData, GuildPluginData<CustomPluginType>> = true;
        },
        afterLoad(pluginData) {
          const typeCheck: AssertEquals<typeof pluginData, GuildPluginData<CustomPluginType>> = true;
        },
      });

      expect(blueprint.name).to.equal("my-plugin");
    });
  });

  describe("Public interfaces", () => {
    it("Public interface type inference works", () => {
      interface OtherPluginType extends BasePluginType {
        state: {
          foo: 5;
        };
      }

      const OtherPlugin = guildPlugin<OtherPluginType>()({
        name: "other-plugin",
        configParser: () => ({}),

        public(pluginData) {
          return {
            myFn(param: "a constant string") {
              const result: AssertEquals<typeof pluginData.state.foo, OtherPluginType["state"]["foo"]> = true;
            },
          };
        },
      });

      const MainPlugin = guildPlugin({
        name: "main-plugin",
        configParser: () => ({}),

        afterLoad(pluginData) {
          const otherPlugin = pluginData.getPlugin(OtherPlugin);

          const result: AssertEquals<Parameters<typeof otherPlugin.myFn>[0], "a constant string"> = true;
        },
      });
    });

    // Note: public interface *functionality* is already tested by Dependencies#getPlugin above
  });
});
