import { guildPluginSlashCommand } from "./slashCommandBlueprint";
import { slashOptions } from "./slashCommandOptions";
import { BasePluginType } from "../../plugins/pluginTypes";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("Slash command blueprints", () => {
  describe("typedGuildSlashCommand()", () => {
    it("(blueprint)", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const blueprint = guildPluginSlashCommand({
        name: "cmd",
        description: "Blah blah",
        signature: [
          slashOptions.string({ name: "foo", description: "", required: true }),
          slashOptions.number({ name: "bar", description: "" }),
        ],
        run({ options }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const blueprint = guildPluginSlashCommand<CustomPluginType>()({
        name: "cmd",
        description: "Blah blah",
        signature: [
          slashOptions.string({ name: "foo", description: "", required: true }),
          slashOptions.number({ name: "bar", description: "" }),
        ],
        run({ pluginData, options }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result1: AssertEquals<typeof options, { foo: string; bar: number | null }> = true;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result2: AssertEquals<typeof pluginData.state.foo, 5> = true;
        },
      });
    });
  });
});
