import { assert, expect } from "chai";
import type { Message } from "discord.js";
import { describe, it } from "mocha";
import type { GlobalPluginData, GuildPluginData } from "../plugins/PluginData.ts";
import { onlyGuild } from "./eventFilters.ts";

describe("Event filters", () => {
  it("onlyGuild", () => {
    const filter = onlyGuild();
    const guild = {};

    // Accepts same guild
    const result1 = filter("messageCreate", {
      args: {
        message: {
          channel: {
            guild,
          },
        } as unknown as Message,
      },
      pluginData: {
        context: "guild",
        guild,
      } as GuildPluginData<any>,
    });
    assert.ok(result1);

    // Rejects different guild
    const guild2 = {};
    const result2 = filter("messageCreate", {
      args: {
        message: {
          channel: {
            guild2,
          },
        } as unknown as Message,
      },
      pluginData: {
        context: "guild",
        guild,
      } as GuildPluginData<any>,
    });
    assert.ok(!result2);

    // Rejects global plugins
    const result3 = filter("messageCreate", {
      args: {
        message: {
          channel: {
            guild,
          },
        } as unknown as Message,
      },
      pluginData: {
        context: "global",
      } as GlobalPluginData<any>,
    });
    assert.ok(!result3);
  });
});
