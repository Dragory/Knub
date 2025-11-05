import { describe, it } from "mocha";
import { z } from "zod";
import type { GuildPluginBlueprint } from "./PluginBlueprint.ts";
import type { PluginPublicInterface } from "./pluginUtils.ts";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("pluginUtils", () => {
  it("PluginPublicInterface type", () => {
    const myPlugin = {
      name: "my-plugin",
      configSchema: z.strictObject({}),

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
