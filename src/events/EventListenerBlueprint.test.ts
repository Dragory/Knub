import { guildEventListener } from "./EventListenerBlueprint";
import { Message } from "eris";
import { BasePluginType } from "../plugins/pluginTypes";
import { expect } from "chai";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("eventListener() helper", () => {
  it("(blueprint)", () => {
    const blueprint = guildEventListener({
      event: "messageCreate",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { message: Message }> = true;
      },
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });

  it("(event, listener)", () => {
    const blueprint = guildEventListener("messageCreate", ({ args }) => {
      // Test type inference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: AssertEquals<typeof args, { message: Message }> = true;
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });

  it("(event, opts, listener)", () => {
    const blueprint = guildEventListener("messageCreate", { allowSelf: true }, ({ args }) => {
      // Test type inference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: AssertEquals<typeof args, { message: Message }> = true;
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(true);
  });

  interface CustomPluginType extends BasePluginType {
    config: {
      foo: 5;
    };
  }

  it("<TPluginType>()(blueprint)", () => {
    const blueprint = guildEventListener<CustomPluginType>()({
      event: "messageCreate",
      listener({ args, pluginData }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { message: Message }> = true;

        const foo = pluginData.config.get();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result2: AssertEquals<typeof foo, { foo: 5 }> = true;
      },
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });

  it("<TPluginType>()(event, listener)", () => {
    const blueprint = guildEventListener<CustomPluginType>()("messageCreate", ({ args, pluginData }) => {
      // Test type inference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: AssertEquals<typeof args, { message: Message }> = true;

      const foo = pluginData.config.get();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result2: AssertEquals<typeof foo, { foo: 5 }> = true;
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });

  it("<TPluginType>()(event, options, listener)", () => {
    const blueprint = guildEventListener<CustomPluginType>()(
      "messageCreate",
      { allowSelf: true },
      ({ args, pluginData }) => {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { message: Message }> = true;

        const foo = pluginData.config.get();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result2: AssertEquals<typeof foo, { foo: 5 }> = true;
      }
    );

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(true);
  });
});
