import { CooldownManager, decorators as d, Knub, LockManager, PluginClass } from "../index";
import { Guild, Message } from "eris";
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
import { EventMeta, PluginEventManager } from "../events/PluginEventManager";
import { CommandMeta } from "../commands/commandUtils";
import { PluginCommandManager } from "../commands/PluginCommandManager";
import { PluginConfigManager } from "../config/PluginConfigManager";
import { EventArguments } from "../events/eventArguments";

process.on("unhandledRejection", (err) => {
  throw err;
});

describe("PluginClass", () => {
  describe("Lifecycle hooks", () => {
    it("runs plugin-supplied onLoad() function", (done) => {
      (async () => {
        class PluginToLoad extends PluginClass {
          public static pluginName = "plugin-to-load";

          public async onLoad() {
            done();
          }
        }

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
        class PluginToUnload extends PluginClass {
          public static pluginName = "plugin-to-unload";

          public async onUnload() {
            done();
          }
        }

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

  describe("Decorator commands", () => {
    it("loads and runs decorator-defined commands", (done) => {
      (async () => {
        class CommandPlugin extends PluginClass {
          public static pluginName = "commands";

          @d.command("foo")
          public cmdFn() {
            done();
          }
        }

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [CommandPlugin],
          options: {
            getEnabledPlugins() {
              return ["commands"];
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

        const guild = createMockGuild(client);
        client.emit("guildAvailable", guild);
        await sleep(30);

        const author = createMockUser(client);
        const textChannel = createMockTextChannel(client, guild.id);
        const msg = createMockMessage(client, textChannel.id, author, { content: "!foo" });
        client.emit("messageCreate", msg);
      })();
    });

    it("decorator commands: cooldowns", () => {
      return (async () => {
        let cdCallNum = 0;

        const client = createMockClient();
        const author = createMockUser(client);
        const author2 = createMockUser(client);

        class CommandCooldownTestPlugin extends PluginClass {
          public static pluginName = "command-cooldown-test";

          public static defaultOptions = {
            config: {
              cd_applies: true,
            },
            overrides: [
              {
                user: author2.id,
                config: {
                  cd_applies: false,
                },
              },
            ],
          };

          @d.command("cd")
          @d.cooldown(80, "cd_applies")
          public cdCmdFn() {
            cdCallNum++;
          }
        }

        const knub = new Knub(client, {
          guildPlugins: [CommandCooldownTestPlugin],
          options: {
            getEnabledPlugins() {
              return ["command-cooldown-test"];
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

        const guild = createMockGuild(client);
        client.emit("guildAvailable", guild);
        await sleep(30);

        const textChannel = createMockTextChannel(client, guild.id);

        const cdMsg1 = createMockMessage(client, textChannel.id, author, { content: "!cd" });
        const cdMsg2 = createMockMessage(client, textChannel.id, author, { content: "!cd" });
        const cdMsg3 = createMockMessage(client, textChannel.id, author2, { content: "!cd" });
        const cdMsg4 = createMockMessage(client, textChannel.id, author, { content: "!cd" });
        client.emit("messageCreate", cdMsg1); // Goes through
        await sleep(30);
        client.emit("messageCreate", cdMsg2); // On cooldown, ignored
        await sleep(30);
        client.emit("messageCreate", cdMsg3); // On cooldown but author2 bypasses it, goes through
        await sleep(30);
        client.emit("messageCreate", cdMsg4); // Goes through
        await sleep(30);

        assert.strictEqual(cdCallNum, 3);
      })();
    });

    it("decorator commands: permissions", () => {
      return (async () => {
        let permCallNum = 0;

        const client = createMockClient();
        const author = createMockUser(client);
        const author2 = createMockUser(client);

        class CommandPermissionTestPlugin extends PluginClass {
          public static pluginName = "command-permission-test";

          public static defaultOptions = {
            config: {
              can_use: false,
            },
            overrides: [
              {
                user: author2.id,
                config: {
                  can_use: true,
                },
              },
            ],
          };

          @d.command("perm")
          @d.permission("can_use")
          public permCmdFn() {
            permCallNum++;
          }
        }

        const knub = new Knub(client, {
          guildPlugins: [CommandPermissionTestPlugin],
          options: {
            getEnabledPlugins() {
              return ["command-permission-test"];
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

        const guild = createMockGuild(client);
        client.emit("guildAvailable", guild);
        await sleep(30);

        const textChannel = createMockTextChannel(client, guild.id);

        const msg2NotAllowed = createMockMessage(client, textChannel.id, author, { content: "!perm" });
        const msg2Allowed = createMockMessage(client, textChannel.id, author2, { content: "!perm" });
        client.emit("messageCreate", msg2NotAllowed);
        await sleep(30);
        client.emit("messageCreate", msg2Allowed);
        await sleep(30);

        assert.strictEqual(permCallNum, 1);
      })();
    });

    it("decorator commands: locks", () => {
      return (async () => {
        let lockNum = 1;

        const client = createMockClient();
        const author = createMockUser(client);

        class CommandLockTestPlugin extends PluginClass {
          public static pluginName = "command-lock-test";

          @d.command("lock")
          @d.lock("blahblah")
          public async lockCmdFn(args, meta: CommandMeta) {
            // First call: 0*2 = 0, +1 = 1
            // Second call: 1*2 = 2, +1 = 3
            // If second call is executed too early (without considering lock):
            // 0*2 = 0, +1 = 1 (and then +1 afterwards = 2)
            // Third call: never executed
            lockNum *= 2;
            await sleep(100);
            lockNum++;

            if (lockNum === 3) {
              // Stop third call from being executed
              meta.lock.interrupt();
            }
          }
        }

        const knub = new Knub(client, {
          guildPlugins: [CommandLockTestPlugin],
          options: {
            getEnabledPlugins() {
              return ["command-lock-test"];
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

        const guild = createMockGuild(client);
        client.emit("guildAvailable", guild);
        await sleep(30);

        const textChannel = createMockTextChannel(client, guild.id);

        const msg5 = createMockMessage(client, textChannel.id, author, { content: "!lock" });
        const msg6 = createMockMessage(client, textChannel.id, author, { content: "!lock" });
        const msg7 = createMockMessage(client, textChannel.id, author, { content: "!lock" });
        client.emit("messageCreate", msg5);
        client.emit("messageCreate", msg6);
        client.emit("messageCreate", msg7);
        await sleep(150);

        assert.strictEqual(lockNum, 3);
      })();
    });
  });

  describe("Decorator events", () => {
    it("loads and runs decorator-defined event handlers", (done) => {
      (async () => {
        class EventPlugin extends PluginClass {
          public static pluginName = "events";

          @d.event("messageCreate")
          public msgEv({ message }: EventArguments["messageCreate"]) {
            if (message instanceof Message) {
              done();
            }
          }
        }

        const client = createMockClient();
        const knub = new Knub(client, {
          guildPlugins: [EventPlugin],
          options: {
            getEnabledPlugins() {
              return ["events"];
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

        const author = createMockUser(client);
        const textChannel = createMockTextChannel(client, guild.id);
        const msg = createMockMessage(client, textChannel.id, author, { content: "hi!" });
        client.emit("messageCreate", msg);
      })();
    });

    it("decorator event handlers: cooldowns", () => {
      return (async () => {
        let cdMsgEvCallNum = 0;

        const client = createMockClient();
        const author = createMockUser(client);
        const author2 = createMockUser(client);

        class EventCooldownTestPlugin extends PluginClass {
          public static pluginName = "event-cooldown-test";

          public static defaultOptions = {
            config: {
              cd_applies: true,
            },
            overrides: [
              {
                user: author2.id,
                config: {
                  cd_applies: false,
                },
              },
            ],
          };

          @d.event("messageCreate")
          @d.cooldown(80, "cd_applies")
          public cdMsgEv() {
            cdMsgEvCallNum++;
          }
        }

        const knub = new Knub(client, {
          guildPlugins: [EventCooldownTestPlugin],
          options: {
            getEnabledPlugins() {
              return ["event-cooldown-test"];
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

        const cdMsg1 = createMockMessage(client, textChannel.id, author, { content: "cdtest" });
        const cdMsg2 = createMockMessage(client, textChannel.id, author, { content: "cdtest" });
        const cdMsg3 = createMockMessage(client, textChannel.id, author, { content: "cdtest" });
        const cdMsg4 = createMockMessage(client, textChannel.id, author2, { content: "cdtest" });
        client.emit("messageCreate", cdMsg1); // Goes through
        await sleep(30);
        client.emit("messageCreate", cdMsg2); // On cooldown, ignored
        await sleep(80);
        client.emit("messageCreate", cdMsg3); // Goes through
        await sleep(30);
        client.emit("messageCreate", cdMsg4); // On cooldown but cooldown does not apply to author2, so goes through
        await sleep(30);

        assert.strictEqual(cdMsgEvCallNum, 3);
      })();
    });

    it("decorator event handlers: permissions", () => {
      return (async () => {
        let permMsgEvCallNum = 0;

        const client = createMockClient();
        const author = createMockUser(client);
        const author2 = createMockUser(client);

        class EventPermissionTestPlugin extends PluginClass {
          public static pluginName = "event-permission-test";

          public static defaultOptions = {
            config: {
              can_trigger_ev: false,
            },
            overrides: [
              {
                user: author2.id,
                config: {
                  can_trigger_ev: true,
                },
              },
            ],
          };

          @d.event("messageCreate")
          @d.permission("can_trigger_ev")
          public msgEv2() {
            permMsgEvCallNum++;
          }
        }

        const knub = new Knub(client, {
          guildPlugins: [EventPermissionTestPlugin],
          options: {
            getEnabledPlugins() {
              return ["event-permission-test"];
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

        // No permissions, doesn't go through
        const permMsg1 = createMockMessage(client, textChannel.id, author, { content: "hi!" });

        // Author2 has can_trigger_ev, goes through
        const permMsg2 = createMockMessage(client, textChannel.id, author2, { content: "hi!" });
        client.emit("messageCreate", permMsg1);
        client.emit("messageCreate", permMsg2);
        await sleep(30);

        assert.strictEqual(permMsgEvCallNum, 1);
      })();
    });

    it("decorator event handlers: locks", () => {
      return (async () => {
        let lockNum = 1;

        const client = createMockClient();
        const author = createMockUser(client);

        class EventLockTestPlugin extends PluginClass {
          public static pluginName = "event-lock-test";

          @d.event("messageCreate")
          @d.lock("blahblah")
          public async lockMsgEv(args, meta: EventMeta) {
            // First call: 0*2 = 0, +1 = 1
            // Second call: 1*2 = 2, +1 = 3
            // If second call is executed too early (without considering lock):
            // 0*2 = 0, +1 = 1 (and then +1 afterwards = 2)
            // Third call: never executed
            lockNum *= 2;
            await sleep(100);
            lockNum++;

            if (lockNum === 3) {
              // Stop third call from being executed
              meta.lock.interrupt();
            }
          }
        }

        const knub = new Knub(client, {
          guildPlugins: [EventLockTestPlugin],
          options: {
            getEnabledPlugins() {
              return ["event-lock-test"];
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

        const lockMsg1 = createMockMessage(client, textChannel.id, author, { content: "locktest" });
        const lockMsg2 = createMockMessage(client, textChannel.id, author, { content: "locktest" });
        const lockMsg3 = createMockMessage(client, textChannel.id, author, { content: "locktest" });
        client.emit("messageCreate", lockMsg1);
        client.emit("messageCreate", lockMsg2);
        client.emit("messageCreate", lockMsg3);
        await sleep(150);

        assert.strictEqual(lockNum, 3);
      })();
    });
  });

  describe("Misc", () => {
    it("pluginData contains everything", () => {
      return (async () => {
        class TestPlugin extends PluginClass {
          public static pluginName = "test-plugin";

          onLoad() {
            assert.ok(this.pluginData.client != null);
            assert.ok(this.pluginData.cooldowns instanceof CooldownManager);
            assert.ok(this.pluginData.commands instanceof PluginCommandManager);
            assert.ok(this.pluginData.config instanceof PluginConfigManager);
            assert.ok(this.pluginData.events instanceof PluginEventManager);
            assert.ok(this.pluginData.locks instanceof LockManager);
          }
        }

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

        class PluginToUnload extends PluginClass {
          public static pluginName = "plugin-to-unload";

          @d.event("messageCreate")
          public msgEvFn() {
            msgEvFnCallNum++;
          }
        }

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
