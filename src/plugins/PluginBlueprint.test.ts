import {
  CooldownManager,
  globalEventListener,
  globalPlugin,
  GlobalPluginBlueprint,
  guildCommand,
  guildEventListener,
  Knub,
  LockManager,
} from "../index";
import { Guild, TextChannel } from "eris";
import {
  createMockClient,
  createMockGuild,
  createMockMessage,
  createMockTextChannel,
  createMockUser,
  sleep,
} from "../testUtils";
import * as assert from "assert";
import { noop } from "../utils";
import { PluginCommandManager } from "../commands/PluginCommandManager";
import { PluginConfigManager } from "../config/PluginConfigManager";
import { BasePluginType } from "./pluginTypes";
import { parseSignature } from "knub-command-manager";
import { expect } from "chai";
import { guildPlugin, GuildPluginBlueprint } from "./PluginBlueprint";
import { GuildPluginData, isGlobalPluginData } from "./PluginData";
import { GuildPluginEventManager } from "../events/GuildPluginEventManager";
import { GlobalPluginEventManager } from "../events/GlobalPluginEventManager";
import { GuildEvent } from "../events/eventTypes";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("PluginBlueprint", () => {
  before(() => {
    process.on("unhandledRejection", (err) => {
      throw err;
    });
  });

  describe("Commands and events", () => {
    it("loads commands and events", (done) => {
      (async () => {
        const PluginToLoad = guildPlugin("plugin-to-load", {
          commands: [guildCommand("foo", noop)],

          events: [guildEventListener("messageCreate", noop)],

          onLoad(pluginData) {
            setTimeout(() => {
              // The command above should be loaded
              assert.strictEqual(pluginData.commands.getAll().length, 1);

              // The event listener above should be loaded
              // There is also a default messageCreate listener that's always registered
              assert.strictEqual(pluginData.events.getListenerCount(), 2);

              done();
            }, 1);
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

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild = new Guild({ id: "0" }, client);
        client.guilds.set("0", guild);
        client.emit("guildAvailable", guild);
      })();
    });

    it("guild events are only passed to the matching guild", (done) => {
      (async () => {
        const guildCounts = {
          "0": 0,
          "1": 0,
        };

        const PluginToLoad = guildPlugin("plugin-to-load", {
          events: [
            guildEventListener("messageCreate", ({ pluginData, args }) => {
              assert.strictEqual(pluginData.guild.id, (args.message.channel as TextChannel).guild.id);
              guildCounts[pluginData.guild.id]++;
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

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild0 = new Guild({ id: "0" }, client);
        const guild1 = new Guild({ id: "1" }, client);
        client.guilds.set("0", guild0);
        client.guilds.set("1", guild1);
        client.emit("guildAvailable", guild0);
        client.emit("guildAvailable", guild1);
        await sleep(30);

        const user0 = createMockUser(client);
        const user1 = createMockUser(client);
        const guild0Channel = createMockTextChannel(client, guild0.id);
        const guild1Channel = createMockTextChannel(client, guild1.id);

        const guild0Message1 = createMockMessage(client, guild0Channel.id, user0, { content: "foo" });
        const guild0Message2 = createMockMessage(client, guild0Channel.id, user0, { content: "bar" });
        const guild1Message1 = createMockMessage(client, guild1Channel.id, user1, { content: "foo" });
        const guild1Message2 = createMockMessage(client, guild1Channel.id, user1, { content: "bar" });

        client.emit("messageCreate", guild0Message1);
        client.emit("messageCreate", guild0Message2);
        client.emit("messageCreate", guild1Message1);
        client.emit("messageCreate", guild1Message2);
        await sleep(30);

        assert.strictEqual(guildCounts["0"], 2);
        assert.strictEqual(guildCounts["1"], 2);
        done();
      })();
    });

    it("global events are not passed to guild event listeners", (done) => {
      (async () => {
        const PluginToLoad = guildPlugin("plugin-to-load", {
          events: [
            guildEventListener(("userUpdate" as unknown) as GuildEvent, () => {
              assert.fail("userUpdate was called in a guild event listener");
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

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild0 = new Guild({ id: "0" }, client);
        client.guilds.set("0", guild0);
        client.emit("guildAvailable", guild0);
        await sleep(30);

        client.emit("userUpdate");
        await sleep(30);

        done();
      })();
    });

    it("global events are passed to global event listeners", (done) => {
      (async () => {
        const PluginToLoad = globalPlugin("plugin-to-load", {
          events: [
            globalEventListener("userUpdate", () => {
              done();
            }),
          ],
        });

        const client = createMockClient();
        const knub = new Knub(client, {
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });

        knub.run();
        client.emit("ready");
        await sleep(30);

        client.emit("userUpdate");
      })();
    });

    it("guild events are passed to global event listeners", (done) => {
      (async () => {
        const client = createMockClient();
        const guild = createMockGuild(client);

        const PluginToLoad = globalPlugin("plugin-to-load", {
          events: [
            globalEventListener("messageCreate", ({ pluginData, args }) => {
              assert.ok(isGlobalPluginData(pluginData));
              assert.strictEqual((args.message.channel as TextChannel).guild.id, guild.id);
              done();
            }),
          ],
        });

        const knub = new Knub(client, {
          globalPlugins: [PluginToLoad],
          options: {
            logFn: noop,
          },
        });

        knub.run();
        client.emit("ready");
        await sleep(30);

        const user = createMockUser(client);
        const channel = createMockTextChannel(client, guild.id);
        const message = createMockMessage(client, channel.id, user);
        client.emit("messageCreate", message);
      })();
    });
  });

  describe("Lifecycle hooks", () => {
    it("runs plugin-supplied onLoad() function", (done) => {
      (async () => {
        const PluginToLoad: GuildPluginBlueprint<BasePluginType> = {
          name: "plugin-to-load",
          onLoad() {
            done();
          },
        };

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

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild = new Guild({ id: "0" }, client);
        client.guilds.set("0", guild);
        client.emit("guildAvailable", guild);
      })();
    });

    it("runs plugin-supplied onUnload() function", (done) => {
      (async () => {
        const PluginToUnload: GuildPluginBlueprint<BasePluginType> = {
          name: "plugin-to-unload",
          onUnload() {
            done();
          },
        };

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [PluginToUnload],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-unload"];
            },
            logFn: noop,
          },
        });

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild = createMockGuild(client);
        client.emit("guildAvailable", guild);

        await sleep(30);
        client.emit("guildUnavailable", guild);
      })();
    });
  });

  describe("Dependencies", () => {
    it("hasPlugin", (done) => {
      (async () => {
        const DependencyToLoad = guildPlugin("dependency-to-load", {});

        const PluginToLoad = guildPlugin("plugin-to-load", {
          onLoad(pluginData) {
            setTimeout(() => {
              assert.ok(pluginData.hasPlugin(DependencyToLoad));
              assert.ok(pluginData.hasPlugin({ name: "dependency-to-load" }));
              assert.ok(!pluginData.hasPlugin({ name: "unknown-plugin" }));
              done();
            }, 50);
          },
        });

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [DependencyToLoad, PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["dependency-to-load", "plugin-to-load"];
            },
            logFn: noop,
          },
        });

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild = new Guild({ id: "0" }, client);
        client.guilds.set("0", guild);
        client.emit("guildAvailable", guild);
      })();
    });

    it("getPlugin", (done) => {
      (async () => {
        const DependencyToLoad = guildPlugin("dependency-to-load", {
          public: {
            ok(pluginData) {
              assert.ok(pluginData != null);

              return () => done();
            },
          },
        });

        const PluginToLoad = guildPlugin("plugin-to-load", {
          onLoad(pluginData) {
            setTimeout(() => {
              const instance = pluginData.getPlugin(DependencyToLoad);
              instance.ok();
            }, 50);
          },
        });

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [DependencyToLoad, PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["dependency-to-load", "plugin-to-load"];
            },
            logFn: noop,
          },
        });

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild = new Guild({ id: "0" }, client);
        client.guilds.set("0", guild);
        client.emit("guildAvailable", guild);
      })();
    });

    it("getPlugin has correct pluginData", (done) => {
      (async () => {
        const DependencyToLoad = guildPlugin("dependency-to-load", {
          defaultOptions: {
            config: {
              some_value: "cookies",
            },
          },

          public: {
            ok(pluginData) {
              assert.ok(pluginData != null);
              assert.strictEqual(pluginData.config.get().some_value, "cookies");
              assert.notStrictEqual(pluginData.config.get().some_value, "milk");

              return () => done();
            },
          },
        });

        const PluginToLoad = guildPlugin("plugin-to-load", {
          defaultOptions: {
            config: {
              some_value: "milk",
            },
          },

          onLoad(pluginData) {
            setTimeout(() => {
              const instance = pluginData.getPlugin(DependencyToLoad);
              instance.ok();
            }, 50);
          },
        });

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [DependencyToLoad, PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["dependency-to-load", "plugin-to-load"];
            },
            logFn: noop,
          },
        });

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild = new Guild({ id: "0" }, client);
        client.guilds.set("0", guild);
        client.emit("guildAvailable", guild);
      })();
    });

    it("automatic dependency loading", (done) => {
      (async () => {
        const DependencyToLoad = guildPlugin("dependency-to-load", {});

        const OtherDependencyToLoad = guildPlugin("other-dependency-to-load", {});

        const PluginToLoad = guildPlugin("plugin-to-load", {
          dependencies: [DependencyToLoad, OtherDependencyToLoad],

          onLoad(pluginData) {
            setTimeout(() => {
              assert.ok(pluginData.hasPlugin(DependencyToLoad));
              assert.ok(pluginData.hasPlugin(OtherDependencyToLoad));
              done();
            }, 50);
          },
        });

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [DependencyToLoad, OtherDependencyToLoad, PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild = new Guild({ id: "0" }, client);
        client.guilds.set("0", guild);
        client.emit("guildAvailable", guild);
      })();
    });

    it("transitive dependencies", (done) => {
      (async () => {
        const DependencyTwo = guildPlugin("dependency-two", {});
        const DependencyOne = guildPlugin("dependency-one", {
          dependencies: [DependencyTwo],
        });

        const PluginToLoad = guildPlugin("plugin-to-load", {
          dependencies: [DependencyOne],

          onLoad(pluginData) {
            setTimeout(() => {
              assert.ok(pluginData.hasPlugin(DependencyOne));
              assert.ok(pluginData.hasPlugin(DependencyTwo));
              done();
            }, 50);
          },
        });

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [DependencyOne, DependencyTwo, PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild = new Guild({ id: "0" }, client);
        client.guilds.set("0", guild);
        client.emit("guildAvailable", guild);
      })();
    });

    it("plugins loaded as dependencies do not load commands or events", (done) => {
      (async () => {
        const Dependency = guildPlugin("dependency", {
          commands: [guildCommand("foo", noop)],

          events: [guildEventListener("messageCreate", noop)],

          onLoad(pluginData) {
            setTimeout(() => {
              // The command above should *not* be loaded
              assert.strictEqual(pluginData.commands.getAll().length, 0);

              // The event listener above should *not* be loaded, and neither should the default messageCreate listener
              assert.strictEqual(pluginData.events.getListenerCount(), 0);

              done();
            }, 1);
          },
        });

        const PluginToLoad = guildPlugin("plugin-to-load", {
          dependencies: [Dependency],
        });

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [Dependency, PluginToLoad],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-load"];
            },
            logFn: noop,
          },
        });

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild = new Guild({ id: "0" }, client);
        client.guilds.set("0", guild);
        client.emit("guildAvailable", guild);
      })();
    });
  });

  describe("Custom overrides", () => {
    it("Custom overrides work", () => {
      return (async () => {
        let commandTriggers = 0;

        interface PluginType extends BasePluginType {
          customOverrideCriteria: {
            myUserOverride: string;
          };
        }

        const TestPlugin = guildPlugin<PluginType>()("test-plugin", {
          defaultOptions: {
            config: {
              can_do: false,
            },
          },

          customOverrideMatcher: (pluginData, criteria, matchParams) => {
            return matchParams.userId === criteria.myUserOverride;
          },

          commands: [
            guildCommand("foo", {}, { permission: "can_do" }, () => {
              commandTriggers++;
            }),
          ],
        });

        const client = createMockClient();
        const user1 = createMockUser(client);
        const user2 = createMockUser(client);

        const knub = new Knub(client, {
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

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild = createMockGuild(client);
        client.emit("guildAvailable", guild);
        await sleep(30);

        const channel = createMockTextChannel(client, guild.id);

        const message1 = createMockMessage(client, channel.id, user1, { content: "!foo" });
        client.emit("messageCreate", message1);
        await sleep(30);

        const message2 = createMockMessage(client, channel.id, user2, { content: "!foo" });
        client.emit("messageCreate", message2);
        await sleep(30);

        assert.equal(commandTriggers, 1);
      })();
    });
  });

  describe("Custom argument types", () => {
    it("Custom argument types", (done) => {
      (async () => {
        const client = createMockClient();
        const guild = createMockGuild(client);

        const types = {
          foo: (value, ctx) => {
            return `${value}-${ctx.pluginData.guild.id}`;
          },
        };

        const TestPlugin = guildPlugin("test-plugin", {
          commands: [
            guildCommand("foo", parseSignature("<str:foo>", types, "foo"), ({ args: { str } }) => {
              assert.equal(str, `bar-${guild.id}`);
              done();
            }),
          ],
        });

        const knub = new Knub(client, {
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

        knub.run();
        client.emit("ready");
        await sleep(30);

        client.emit("guildAvailable", guild);
        await sleep(30);

        const channel = createMockTextChannel(client, guild.id);
        const user = createMockUser(client);
        const msg = createMockMessage(client, channel.id, user, { content: "!foo bar" });
        client.emit("messageCreate", msg);
      })();
    });
  });

  describe("Misc", () => {
    it("pluginData contains everything (guild plugin)", () => {
      return (async () => {
        const TestPlugin: GuildPluginBlueprint<BasePluginType> = {
          name: "test-plugin",
          onLoad(pluginData) {
            assert.ok(pluginData.client != null);
            assert.ok(pluginData.cooldowns instanceof CooldownManager);
            assert.ok(pluginData.commands instanceof PluginCommandManager);
            assert.ok(pluginData.config instanceof PluginConfigManager);
            assert.ok(pluginData.events instanceof GuildPluginEventManager);
            assert.ok(pluginData.locks instanceof LockManager);
          },
        };

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [TestPlugin],
          options: {
            getEnabledGuildPlugins() {
              return ["test-plugin"];
            },
            logFn: noop,
          },
        });

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild = createMockGuild(client);
        client.emit("guildAvailable", guild);
        await sleep(30);
      })();
    });

    it("pluginData contains everything (global plugin)", () => {
      return (async () => {
        const TestPlugin: GlobalPluginBlueprint<BasePluginType> = {
          name: "test-plugin",
          onLoad(pluginData) {
            assert.ok(pluginData.client != null);
            assert.ok(pluginData.cooldowns instanceof CooldownManager);
            assert.ok(pluginData.commands instanceof PluginCommandManager);
            assert.ok(pluginData.config instanceof PluginConfigManager);
            assert.ok(pluginData.events instanceof GlobalPluginEventManager);
            assert.ok(pluginData.locks instanceof LockManager);
          },
        };

        const client = createMockClient();
        const knub = new Knub(client, {
          globalPlugins: [TestPlugin],
          options: {
            logFn: noop,
          },
        });

        knub.run();
        client.emit("ready");
        await sleep(30);
      })();
    });

    it("event handlers are unloaded on plugin unload", (done) => {
      (async () => {
        let msgEvFnCallNum = 0;

        interface PluginType extends BasePluginType {
          config: {
            value: number;
          };
        }

        const messageCreateEv = guildEventListener("messageCreate", () => {
          msgEvFnCallNum++;
        });

        const PluginToUnload: GuildPluginBlueprint<BasePluginType> = {
          name: "plugin-to-unload",
          events: [messageCreateEv],
        };

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [PluginToUnload],
          options: {
            getEnabledGuildPlugins() {
              return ["plugin-to-unload"];
            },
            logFn: noop,
          },
        });

        knub.run();
        client.emit("ready");
        await sleep(30);

        const guild = createMockGuild(client);
        client.emit("guildAvailable", guild);
        await sleep(30);

        const textChannel = createMockTextChannel(client, guild.id);
        const author = createMockUser(client);

        const msg = createMockMessage(client, textChannel.id, author, { content: "hi!" });
        client.emit("messageCreate", msg);
        await sleep(30);

        client.emit("guildUnavailable", guild);
        await sleep(30);

        const msg2 = createMockMessage(client, textChannel.id, author, { content: "hi!" });
        client.emit("messageCreate", msg2);
        await sleep(30);

        assert.strictEqual(msgEvFnCallNum, 1);

        done();
      })();
    });
  });

  describe("plugin() helper", () => {
    it("(blueprint)", () => {
      const blueprint = guildPlugin({
        name: "my-plugin",
        info: "foo",
      });

      expect(blueprint.name).to.equal("my-plugin");
      expect(blueprint.info).to.equal("foo");
    });

    it("(name, blueprint)", () => {
      const blueprint = guildPlugin("my-plugin", {
        info: "foo",
      });

      expect(blueprint.name).to.equal("my-plugin");
      expect(blueprint.info).to.equal("foo");
    });

    interface CustomPluginType extends BasePluginType {
      state: {
        foo: 5;
      };
    }

    it("<TPluginType>()(blueprint)", () => {
      const blueprint = guildPlugin<CustomPluginType>()({
        name: "my-plugin",
        info: "foo",

        // eslint-disable-next-line
        onLoad(pluginData) {},
      });

      expect(blueprint.name).to.equal("my-plugin");
      expect(blueprint.info).to.equal("foo");

      // Test type inference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: AssertEquals<Parameters<typeof blueprint.onLoad>[0], GuildPluginData<CustomPluginType>> = true;
    });

    it("<TPluginType>()(name, blueprint)", () => {
      const blueprint = guildPlugin<CustomPluginType>()("my-plugin", {
        info: "foo",

        // eslint-disable-next-line
        onLoad(pluginData) {},
      });

      expect(blueprint.name).to.equal("my-plugin");
      expect(blueprint.info).to.equal("foo");

      // Test type inference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: AssertEquals<Parameters<typeof blueprint.onLoad>[0], GuildPluginData<CustomPluginType>> = true;
    });
  });

  describe("Public interfaces", () => {
    it("Public interface type inference works", () => {
      interface OtherPluginType extends BasePluginType {
        state: {
          foo: 5;
        };
      }

      const OtherPlugin = guildPlugin<OtherPluginType>()("other-plugin", {
        public: {
          myFn(pluginData) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const result: AssertEquals<typeof pluginData.state.foo, OtherPluginType["state"]["foo"]> = true;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
            return (param: "a constant string") => {};
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const MainPlugin = guildPlugin("main-plugin", {
        onLoad(pluginData) {
          const otherPlugin = pluginData.getPlugin(OtherPlugin);

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result: AssertEquals<Parameters<typeof otherPlugin.myFn>[0], "a constant string"> = true;
        },
      });
    });

    // Note: public interface *functionality* is already tested by Dependencies#getPlugin above
  });
});
