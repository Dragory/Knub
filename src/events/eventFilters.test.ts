import { onlyGuild } from "./eventFilters";
import { Message } from "eris";
import { PluginData } from "../plugins/PluginData";
import * as assert from "assert";

describe("Event filters", () => {
  it("onlyGuild", () => {
    const filter = onlyGuild();
    const guild = {};
    const result = filter(
      "messageCreate",
      {
        message: ({
          channel: {
            guild,
          },
        } as unknown) as Message,
      },
      {
        pluginData: {
          guild,
        } as PluginData,
      }
    );
    assert.ok(result);
  });
});
