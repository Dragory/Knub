import { PluginPublicInterface } from "./pluginUtils";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("pluginUtils", () => {
  it("PluginPublicInterface type", () => {
    const myPlugin = {
      name: "my-plugin",
      public: {
        someFn() {
          return 5;
        },
      },
    };

    type PublicInterface = PluginPublicInterface<typeof myPlugin>;
    type Expected = { someFn: 5 };
    type NotExpected = { someFn: "foo" };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result1: AssertEquals<Expected, PublicInterface> = true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result2: AssertEquals<NotExpected, PublicInterface> = false;
  });
});
