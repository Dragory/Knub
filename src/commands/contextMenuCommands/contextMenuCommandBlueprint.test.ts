import {
  globalPluginMessageContextMenuCommand,
  globalPluginUserContextMenuCommand,
  guildPluginMessageContextMenuCommand,
  guildPluginUserContextMenuCommand,
} from "./contextMenuCommandBlueprint";
import { MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction } from "discord.js";
import { BasePluginType } from "../../plugins/pluginTypes";
import { GlobalPluginData, GuildPluginData } from "../../plugins/PluginData";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("Context menu command blueprints", () => {
  describe("MessageContextMenuCommandBlueprint", () => {
    it("(blueprint)", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const guildBlueprint = guildPluginMessageContextMenuCommand({
        name: "Test command",
        run({ interaction }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result: AssertEquals<typeof interaction, MessageContextMenuCommandInteraction> = true;
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const globalBlueprint = globalPluginMessageContextMenuCommand({
        name: "Test command",
        run({ interaction }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result: AssertEquals<typeof interaction, MessageContextMenuCommandInteraction> = true;
        },
      });
    });

    interface CustomPluginType extends BasePluginType {
      state: {
        foo: 5;
      };
    }

    it("<TPluginData>()(blueprint)", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const guildBlueprint = guildPluginMessageContextMenuCommand<GuildPluginData<CustomPluginType>>()({
        name: "Test command",
        run({ pluginData, interaction }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result1: AssertEquals<typeof interaction, MessageContextMenuCommandInteraction> = true;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result2: AssertEquals<typeof pluginData.state.foo, number> = true;
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const globalBlueprint = globalPluginMessageContextMenuCommand<GlobalPluginData<CustomPluginType>>()({
        name: "Test command",
        run({ pluginData, interaction }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result1: AssertEquals<typeof interaction, MessageContextMenuCommandInteraction> = true;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result2: AssertEquals<typeof pluginData.state.foo, number> = true;
        },
      });
    });
  });

  describe("UserContextMenuCommandBlueprint", () => {
    it("(blueprint)", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const guildBlueprint = guildPluginUserContextMenuCommand({
        name: "Test command",
        run({ interaction }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result: AssertEquals<typeof interaction, UserContextMenuCommandInteraction> = true;
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const globalBlueprint = guildPluginUserContextMenuCommand({
        name: "Test command",
        run({ interaction }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result: AssertEquals<typeof interaction, UserContextMenuCommandInteraction> = true;
        },
      });
    });

    interface CustomPluginType extends BasePluginType {
      state: {
        foo: 5;
      };
    }

    it("<TPluginData>()(blueprint)", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const guildBlueprint = guildPluginUserContextMenuCommand<GuildPluginData<CustomPluginType>>()({
        name: "Test command",
        run({ pluginData, interaction }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result1: AssertEquals<typeof interaction, UserContextMenuCommandInteraction> = true;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result2: AssertEquals<typeof pluginData.state.foo, number> = true;
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const globalBlueprint = globalPluginUserContextMenuCommand<GlobalPluginData<CustomPluginType>>()({
        name: "Test command",
        run({ pluginData, interaction }) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result1: AssertEquals<typeof interaction, UserContextMenuCommandInteraction> = true;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result2: AssertEquals<typeof pluginData.state.foo, number> = true;
        },
      });
    });
  });
});
