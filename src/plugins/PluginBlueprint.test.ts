import {
  command,
  CooldownManager,
  eventListener,
  Knub,
  LockManager,
  plugin,
  PluginBlueprint,
  PluginData,
} from "../index";
import { Guild } from "eris";
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
import { PluginEventManager } from "../events/PluginEventManager";
import { PluginCommandManager } from "../commands/PluginCommandManager";
import { PluginConfigManager } from "../config/PluginConfigManager";
import { BasePluginType } from "./pluginTypes";
import { parseSignature } from "knub-command-manager";
import { expect } from "chai";

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
        const PluginToLoad = plugin("plugin-to-load", {
          commands: [command("foo", noop)],

          events: [eventListener("messageCreate", noop)],

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
  });

  describe("Lifecycle hooks", () => {
    it("runs plugin-supplied onLoad() function", (done) => {
      (async () => {
        const PluginToLoad: PluginBlueprint<BasePluginType> = {
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
        const PluginToUnload: PluginBlueprint<BasePluginType> = {
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
        const DependencyToLoad = plugin("dependency-to-load", {});

        const PluginToLoad = plugin("plugin-to-load", {
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
        const DependencyToLoad = plugin("dependency-to-load", {
          public: {
            ok(pluginData) {
              assert.ok(pluginData != null);

              return () => done();
            },
          },
        });

        const PluginToLoad = plugin("plugin-to-load", {
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
        const DependencyToLoad = plugin("dependency-to-load", {});

        const OtherDependencyToLoad = plugin("other-dependency-to-load", {});

        const PluginToLoad = plugin("plugin-to-load", {
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
        const DependencyTwo = plugin("dependency-two", {});
        const DependencyOne = plugin("dependency-one", {
          dependencies: [DependencyTwo],
        });

        const PluginToLoad = plugin("plugin-to-load", {
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
        const Dependency = plugin("dependency", {
          commands: [command("foo", noop)],

          events: [eventListener("messageCreate", noop)],

          onLoad(pluginData) {
            setTimeout(() => {
              // The command above should *not* be loaded
              assert.strictEqual(pluginData.commands.getAll().length, 0);

              // The event listener above should *not* be loaded
              // There is also a default messageCreate listener that's always registered
              assert.strictEqual(pluginData.events.getListenerCount(), 1);

              done();
            }, 1);
          },
        });

        const PluginToLoad = plugin("plugin-to-load", {
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

        const TestPlugin = plugin<PluginType>()("test-plugin", {
          defaultOptions: {
            config: {
              can_do: false,
            },
          },

          customOverrideMatcher: (pluginData, criteria, matchParams) => {
            return matchParams.userId === criteria.myUserOverride;
          },

          commands: [
            command("foo", {}, { permission: "can_do" }, () => {
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

        const TestPlugin = plugin("test-plugin", {
          commands: [
            command("foo", parseSignature("<str:foo>", types, "foo"), ({ args: { str } }) => {
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
    it("pluginData contains everything", () => {
      return (async () => {
        const TestPlugin: PluginBlueprint<BasePluginType> = {
          name: "test-plugin",
          onLoad(pluginData) {
            assert.ok(pluginData.client != null);
            assert.ok(pluginData.cooldowns instanceof CooldownManager);
            assert.ok(pluginData.commands instanceof PluginCommandManager);
            assert.ok(pluginData.config instanceof PluginConfigManager);
            assert.ok(pluginData.events instanceof PluginEventManager);
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

    it("event handlers are unloaded on plugin unload", (done) => {
      (async () => {
        let msgEvFnCallNum = 0;

        interface PluginType extends BasePluginType {
          config: {
            value: number;
          };
        }

        const messageCreateEv = eventListener("messageCreate", () => {
          msgEvFnCallNum++;
        });

        const PluginToUnload: PluginBlueprint<BasePluginType> = {
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
      const blueprint = plugin({
        name: "my-plugin",
        info: "foo",
      });

      expect(blueprint.name).to.equal("my-plugin");
      expect(blueprint.info).to.equal("foo");
    });

    it("(name, blueprint)", () => {
      const blueprint = plugin("my-plugin", {
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
      const blueprint = plugin<CustomPluginType>()({
        name: "my-plugin",
        info: "foo",

        // eslint-disable-next-line
        onLoad(pluginData) {},
      });

      expect(blueprint.name).to.equal("my-plugin");
      expect(blueprint.info).to.equal("foo");

      // Test type inference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: AssertEquals<Parameters<typeof blueprint.onLoad>[0], PluginData<CustomPluginType>> = true;
    });

    it("<TPluginType>()(name, blueprint)", () => {
      const blueprint = plugin<CustomPluginType>()("my-plugin", {
        info: "foo",

        // eslint-disable-next-line
        onLoad(pluginData) {},
      });

      expect(blueprint.name).to.equal("my-plugin");
      expect(blueprint.info).to.equal("foo");

      // Test type inference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: AssertEquals<Parameters<typeof blueprint.onLoad>[0], PluginData<CustomPluginType>> = true;
    });
  });

  describe("Public interfaces", () => {
    it("Public interface type inference works", () => {
      interface OtherPluginType extends BasePluginType {
        state: {
          foo: 5;
        };
      }

      const OtherPlugin = plugin<OtherPluginType>()("other-plugin", {
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
      const MainPlugin = plugin("main-plugin", {
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
