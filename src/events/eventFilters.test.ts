import { onlyGuild } from "./eventFilters";
import { Message } from "eris";
import { GlobalPluginData, GuildPluginData } from "../plugins/PluginData";
import * as assert from "assert";

describe("Event filters", () => {
  it("onlyGuild", () => {
    const filter = onlyGuild();
    const guild = {};

    // Accepts same guild
    const result1 = filter("messageCreate", {
      args: {
        message: ({
          channel: {
            guild,
          },
        } as unknown) as Message,
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
        message: ({
          channel: {
            guild2,
          },
        } as unknown) as Message,
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
        message: ({
          channel: {
            guild,
          },
        } as unknown) as Message,
      },
      pluginData: {
        context: "global",
      } as GlobalPluginData<any>,
    });
    assert.ok(!result3);
  });
});
