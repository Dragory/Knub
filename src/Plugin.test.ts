import { decorators as d, Knub, Plugin } from "./index";
import { Guild, Message } from "eris";
import {
  createMockClient,
  createMockGuild,
  createMockMessage,
  createMockTextChannel,
  createMockUser,
  sleep
} from "./testUtils";
import * as assert from "assert";
import { noop } from "./utils";

process.on("unhandledRejection", err => {
  throw err;
});

describe("Plugin", () => {
  it("runs plugin-supplied onLoad() function", done => {
    (async () => {
      class PluginToLoad extends Plugin {
        public static pluginName = "plugin-to-load";

        public async onLoad() {
          done();
        }
      }

      const client = createMockClient();
      const knub = new Knub(client, {
        plugins: [PluginToLoad],
        options: {
          getEnabledPlugins() {
            return ["plugin-to-load"];
          },
          logFn: noop
        }
      });

      knub.run();
      client.emit("ready");
      await sleep(1);

      const guild = new Guild({ id: "0" }, client);
      client.guilds.set("0", guild);
      client.emit("guildAvailable", guild);
    })();
  });

  it("runs plugin-supplied onUnload() function", done => {
    (async () => {
      class PluginToUnload extends Plugin {
        public static pluginName = "plugin-to-unload";

        public async onUnload() {
          done();
        }
      }

      const client = createMockClient();
      const knub = new Knub(client, {
        plugins: [PluginToUnload],
        options: {
          getEnabledPlugins() {
            return ["plugin-to-unload"];
          },
          logFn: noop
        }
      });

      knub.run();
      client.emit("ready");
      await sleep(1);

      const guild = createMockGuild(client);
      client.emit("guildAvailable", guild);

      await sleep(1);
      client.emit("guildUnavailable", guild);
    })();
  });

  it("loads and runs decorator-defined commands", done => {
    (async () => {
      class CommandPlugin extends Plugin {
        public static pluginName = "commands";

        @d.command("foo")
        public cmdFn() {
          done();
        }
      }

      const client = createMockClient();
      const knub = new Knub(client, {
        plugins: [CommandPlugin],
        options: {
          getEnabledPlugins() {
            return ["commands"];
          },
          getConfig() {
            return {
              prefix: "!"
            };
          },
          logFn: noop
        }
      });

      knub.run();
      client.emit("ready");
      await sleep(1);

      const guild = createMockGuild(client);
      client.emit("guildAvailable", guild);
      await sleep(1);

      const author = createMockUser(client);
      const textChannel = createMockTextChannel(client, guild.id);
      const msg = createMockMessage(client, textChannel.id, author, { content: "!foo" });
      client.emit("messageCreate", msg);
    })();
  });

  it("decorator-defined commands respect other supported decorators", () => {
    return (async () => {
      let fooCallNum = 0;
      let barCallNum = 0;
      let bazCallNum = 0;

      const client = createMockClient();
      const author = createMockUser(client);
      const author2 = createMockUser(client);

      class CommandPlugin extends Plugin {
        public static pluginName = "commands";

        public static defaultOptions = {
          config: {
            can_use: false
          },
          overrides: [
            {
              user: author2.id,
              config: {
                can_use: true
              }
            }
          ]
        };

        @d.command("foo")
        public fooCmdFn() {
          fooCallNum++;
        }

        @d.command("bar")
        @d.permission("can_use")
        public barCmdFn() {
          barCallNum++;
        }

        @d.command("baz")
        @d.cooldown(1000)
        public bazCmdFn() {
          bazCallNum++;
        }
      }

      const knub = new Knub(client, {
        plugins: [CommandPlugin],
        options: {
          getEnabledPlugins() {
            return ["commands"];
          },
          getConfig() {
            return {
              prefix: "!"
            };
          },
          logFn: noop
        }
      });

      knub.run();
      client.emit("ready");
      await sleep(1);

      const guild = createMockGuild(client);
      client.emit("guildAvailable", guild);
      await sleep(1);

      // Just a regular command
      const textChannel = createMockTextChannel(client, guild.id);
      const msg = createMockMessage(client, textChannel.id, author, { content: "!foo" });
      client.emit("messageCreate", msg);
      await sleep(1);

      // Permissions
      const msg2NotAllowed = createMockMessage(client, textChannel.id, author, { content: "!bar" });
      const msg2Allowed = createMockMessage(client, textChannel.id, author2, { content: "!bar" });
      client.emit("messageCreate", msg2NotAllowed);
      await sleep(1);
      client.emit("messageCreate", msg2Allowed);
      await sleep(1);

      // Cooldowns
      const msg3 = createMockMessage(client, textChannel.id, author, { content: "!baz" });
      const msg4 = createMockMessage(client, textChannel.id, author, { content: "!baz" });
      client.emit("messageCreate", msg3);
      await sleep(1);
      client.emit("messageCreate", msg4);
      await sleep(1);

      assert.strictEqual(fooCallNum, 1);
      assert.strictEqual(barCallNum, 1);
      assert.strictEqual(bazCallNum, 1);
    })();
  });

  it("loads and runs decorator-defined event handlers", done => {
    (async () => {
      class EventPlugin extends Plugin {
        public static pluginName = "events";

        @d.event("messageCreate")
        public msgEv([message]) {
          if (message instanceof Message) {
            done();
          }
        }
      }

      const client = createMockClient();
      const knub = new Knub(client, {
        plugins: [EventPlugin],
        options: {
          getEnabledPlugins() {
            return ["events"];
          },
          logFn: noop
        }
      });

      knub.run();
      client.emit("ready");
      await sleep(1);

      const guild = createMockGuild(client);
      client.emit("guildAvailable", guild);
      await sleep(1);

      const author = createMockUser(client);
      const textChannel = createMockTextChannel(client, guild.id);
      const msg = createMockMessage(client, textChannel.id, author, { content: "hi!" });
      client.emit("messageCreate", msg);
    })();
  });

  it("decorator-defined event handlers respect other supported decorators", () => {
    return (async () => {
      let msgEvCallNum = 0;
      let msgEv2CallNum = 0;

      const client = createMockClient();
      const author = createMockUser(client);
      const author2 = createMockUser(client);

      class EventPlugin extends Plugin {
        public static pluginName = "events";

        public static defaultOptions = {
          config: {
            can_trigger_ev: false
          },
          overrides: [
            {
              user: author2.id,
              config: {
                can_trigger_ev: true
              }
            }
          ]
        };

        @d.event("messageCreate")
        public msgEv() {
          msgEvCallNum++;
        }

        @d.event("messageCreate")
        @d.permission("can_trigger_ev")
        public msgEv2() {
          msgEv2CallNum++;
        }
      }

      const knub = new Knub(client, {
        plugins: [EventPlugin],
        options: {
          getEnabledPlugins() {
            return ["events"];
          },
          logFn: noop
        }
      });

      knub.run();
      client.emit("ready");
      await sleep(1);

      const guild = createMockGuild(client);
      client.emit("guildAvailable", guild);
      await sleep(1);

      const textChannel = createMockTextChannel(client, guild.id);

      const msg = createMockMessage(client, textChannel.id, author, { content: "hi!" });
      client.emit("messageCreate", msg);
      await sleep(1);

      const msg2 = createMockMessage(client, textChannel.id, author2, { content: "hi!" });
      client.emit("messageCreate", msg2);
      await sleep(1);

      assert.strictEqual(msgEvCallNum, 2);
      assert.strictEqual(msgEv2CallNum, 2);
    })();
  });

  it("event handlers are unloaded on plugin unload", done => {
    (async () => {
      let msgEvFnCallNum = 0;

      class PluginToUnload extends Plugin {
        public static pluginName = "plugin-to-unload";

        @d.event("messageCreate")
        public msgEvFn() {
          msgEvFnCallNum++;
        }
      }

      const client = createMockClient();
      const knub = new Knub(client, {
        plugins: [PluginToUnload],
        options: {
          getEnabledPlugins() {
            return ["plugin-to-unload"];
          },
          logFn: noop
        }
      });

      knub.run();
      client.emit("ready");
      await sleep(1);

      const guild = createMockGuild(client);
      client.emit("guildAvailable", guild);
      await sleep(1);

      const textChannel = createMockTextChannel(client, guild.id);
      const author = createMockUser(client);

      const msg = createMockMessage(client, textChannel.id, author, { content: "hi!" });
      client.emit("messageCreate", msg);
      await sleep(1);

      client.emit("guildUnavailable", guild);
      await sleep(1);

      const msg2 = createMockMessage(client, textChannel.id, author, { content: "hi!" });
      client.emit("messageCreate", msg2);
      await sleep(1);

      assert.strictEqual(msgEvFnCallNum, 1);

      done();
    })();
  });
});
