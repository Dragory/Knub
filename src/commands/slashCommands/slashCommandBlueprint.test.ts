import { describe, it } from "mocha";
import type { BasePluginType } from "../../plugins/pluginTypes.ts";
import { guildPluginSlashCommand } from "./slashCommandBlueprint.ts";
import { slashOptions } from "./slashCommandOptions.ts";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("Slash command blueprints", () => {
  describe("typedGuildSlashCommand()", () => {
    it("(blueprint)", () => {
      const blueprint = guildPluginSlashCommand({
        name: "cmd",
        description: "Blah blah",
        signature: [
          slashOptions.string({ name: "foo", description: "", required: true }),
          slashOptions.number({ name: "bar", description: "" }),
        ],
        run({ options }) {
          const result: AssertEquals<typeof options, { foo: string; bar: number | null }> = true;
        },
      });
    });

    interface CustomPluginType extends BasePluginType {
      state: {
        foo: 5;
      };
    }

    it("<TPluginType>()(blueprint)", () => {
      const blueprint = guildPluginSlashCommand<CustomPluginType>()({
        name: "cmd",
        description: "Blah blah",
        signature: [
          slashOptions.string({ name: "foo", description: "", required: true }),
          slashOptions.number({ name: "bar", description: "" }),
        ],
        run({ pluginData, options }) {
          const result1: AssertEquals<typeof options, { foo: string; bar: number | null }> = true;
          const result2: AssertEquals<typeof pluginData.state.foo, 5> = true;
        },
      });
    });
  });
});
