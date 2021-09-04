import { typedGuildPlugin } from "./plugins/PluginBlueprint";
import { noop } from "./utils";
import assert from "assert";
import { createMockClient, createMockGuild, sleep } from "./testUtils";
import { Knub } from "./Knub";
import { expect } from "chai";

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

    expect(knub.getLoadedGuild(guild.id)).to.equal(undefined);
    expect(loadedTimes).to.equal(0);
  });
});
