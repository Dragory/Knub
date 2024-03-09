import { MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction } from "discord.js";
import { describe, it } from "mocha";
import { BasePluginType } from "../../plugins/pluginTypes";
import {
  globalPluginMessageContextMenuCommand,
  globalPluginUserContextMenuCommand,
  guildPluginMessageContextMenuCommand,
  guildPluginUserContextMenuCommand,
} from "./contextMenuCommandBlueprint";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("Context menu command blueprints", () => {
  describe("MessageContextMenuCommandBlueprint", () => {
    it("(blueprint)", () => {
      const guildBlueprint = guildPluginMessageContextMenuCommand({
        name: "Test command",
        run({ interaction }) {
          const result: AssertEquals<typeof interaction, MessageContextMenuCommandInteraction> = true;
        },
      });

      const globalBlueprint = globalPluginMessageContextMenuCommand({
        name: "Test command",
        run({ interaction }) {
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
      const guildBlueprint = guildPluginMessageContextMenuCommand<CustomPluginType>()({
        name: "Test command",
        run({ pluginData, interaction }) {
          const result1: AssertEquals<typeof interaction, MessageContextMenuCommandInteraction> = true;
          const result2: AssertEquals<typeof pluginData.state.foo, number> = true;
        },
      });

      const globalBlueprint = globalPluginMessageContextMenuCommand<CustomPluginType>()({
        name: "Test command",
        run({ pluginData, interaction }) {
          const result1: AssertEquals<typeof interaction, MessageContextMenuCommandInteraction> = true;
          const result2: AssertEquals<typeof pluginData.state.foo, number> = true;
        },
      });
    });
  });

  describe("UserContextMenuCommandBlueprint", () => {
    it("(blueprint)", () => {
      const guildBlueprint = guildPluginUserContextMenuCommand({
        name: "Test command",
        run({ interaction }) {
          const result: AssertEquals<typeof interaction, UserContextMenuCommandInteraction> = true;
        },
      });

      const globalBlueprint = guildPluginUserContextMenuCommand({
        name: "Test command",
        run({ interaction }) {
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
      const guildBlueprint = guildPluginUserContextMenuCommand<CustomPluginType>()({
        name: "Test command",
        run({ pluginData, interaction }) {
          const result1: AssertEquals<typeof interaction, UserContextMenuCommandInteraction> = true;
          const result2: AssertEquals<typeof pluginData.state.foo, number> = true;
        },
      });

      const globalBlueprint = globalPluginUserContextMenuCommand<CustomPluginType>()({
        name: "Test command",
        run({ pluginData, interaction }) {
          const result1: AssertEquals<typeof interaction, UserContextMenuCommandInteraction> = true;
          const result2: AssertEquals<typeof pluginData.state.foo, number> = true;
        },
      });
    });
  });
});
