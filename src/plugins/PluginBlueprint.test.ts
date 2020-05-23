import { asCommand, asPlugin, CooldownManager, Knub, LockManager, PluginBlueprint } from "../index";
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
import { asEventListener } from "../events/eventUtils";
import { BasePluginType } from "./pluginTypes";

describe("PluginBlueprint", () => {
  before(() => {
    process.on("unhandledRejection", (err) => {
      throw err;
    });
  });

  describe("Lifecycle hooks", () => {
    it("runs plugin-supplied onLoad() function", (done) => {
      (async () => {
        const PluginToLoad: PluginBlueprint = {
          name: "plugin-to-load",
          onLoad() {
            done();
          },
        };

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [PluginToLoad],
          options: {
            getEnabledPlugins() {
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
        const PluginToUnload: PluginBlueprint = {
          name: "plugin-to-unload",
          onUnload() {
            done();
          },
        };

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [PluginToUnload],
          options: {
            getEnabledPlugins() {
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
        const DependencyToLoad = asPlugin({
          name: "dependency-to-load",
        });

        const PluginToLoad = asPlugin({
          name: "plugin-to-load",

          onLoad(pluginData) {
            setTimeout(() => {
              assert.ok(pluginData.hasPlugin("dependency-to-load"));
              assert.ok(!pluginData.hasPlugin("unknown-dependency"));
              assert.ok(pluginData.hasPlugin(DependencyToLoad));
              done();
            }, 50);
          },
        });

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [DependencyToLoad, PluginToLoad],
          options: {
            getEnabledPlugins() {
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
        const DependencyToLoad = asPlugin({
          name: "dependency-to-load",

          public: {
            ok(pluginData) {
              assert.ok(pluginData != null);

              return () => done();
            },
          },
        });

        const PluginToLoad = asPlugin({
          name: "plugin-to-load",

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
            getEnabledPlugins() {
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
        const DependencyToLoad = asPlugin({
          name: "dependency-to-load",
        });

        const OtherDependencyToLoad = asPlugin({
          name: "other-dependency-to-load",
        });

        const PluginToLoad = asPlugin({
          name: "plugin-to-load",

          dependencies: [DependencyToLoad, "other-dependency-to-load"],

          onLoad(pluginData) {
            setTimeout(() => {
              assert.ok(pluginData.hasPlugin("dependency-to-load"));
              assert.ok(pluginData.hasPlugin(OtherDependencyToLoad));
              done();
            }, 50);
          },
        });

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [DependencyToLoad, OtherDependencyToLoad, PluginToLoad],
          options: {
            getEnabledPlugins() {
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

        const TestPlugin = asPlugin<PluginType>({
          name: "test-plugin",

          defaultOptions: {
            config: {
              can_do: false,
            },
          },

          customOverrideMatcher: (pluginData, criteria, matchParams) => {
            return matchParams.userId === criteria.myUserOverride;
          },

          commands: [
            asCommand({
              trigger: "foo",
              permission: "can_do",
              run() {
                commandTriggers++;
              },
            }),
          ],
        });

        const client = createMockClient();
        const user1 = createMockUser(client);
        const user2 = createMockUser(client);

        const knub = new Knub(client, {
          guildPlugins: [TestPlugin],
          options: {
            getEnabledPlugins() {
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

  describe("Misc", () => {
    it("pluginData contains everything", () => {
      return (async () => {
        const TestPlugin: PluginBlueprint = {
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
            getEnabledPlugins() {
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

        const messageCreateEv = asEventListener({
          event: "messageCreate",
          listener() {
            msgEvFnCallNum++;
          },
        });

        const PluginToUnload: PluginBlueprint = {
          name: "plugin-to-unload",
          events: [messageCreateEv],
        };

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [PluginToUnload],
          options: {
            getEnabledPlugins() {
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
});
