import { describe, it } from "mocha";
import { GuildPluginBlueprint } from "./PluginBlueprint";
import { PluginPublicInterface } from "./pluginUtils";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("pluginUtils", () => {
  it("PluginPublicInterface type", () => {
    const myPlugin = {
      name: "my-plugin",
      configParser: () => ({}),

      public() {
        return {
          someFn: 5,
        };
      },
    } satisfies GuildPluginBlueprint<any, any>;

    type PublicInterface = PluginPublicInterface<typeof myPlugin>;
    type Expected = { someFn: 5 };
    type NotExpected = { someFn: "foo" };

    const result1: AssertEquals<Expected, PublicInterface> = true;
    const result2: AssertEquals<NotExpected, PublicInterface> = false;
  });
});
