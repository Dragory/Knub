import { eventListener } from "./EventListenerBlueprint";
import { Message } from "eris";
import { BasePluginType } from "../plugins/pluginTypes";
import { expect } from "chai";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("eventListener() helper", () => {
  it("(blueprint)", () => {
    const blueprint = eventListener({
      event: "messageCreate",
      listener(args) {
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
    const blueprint = eventListener("messageCreate", (args) => {
      // Test type inference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: AssertEquals<typeof args, { message: Message }> = true;
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });

  it("(event, opts, listener)", () => {
    const blueprint = eventListener("messageCreate", { allowSelf: true }, (args) => {
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
    const blueprint = eventListener<CustomPluginType>()({
      event: "messageCreate",
      listener(args, meta) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { message: Message }> = true;

        const foo = meta.pluginData.config.get();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result2: AssertEquals<typeof foo, { foo: 5 }> = true;
      },
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });

  it("<TPluginType>()(event, listener)", () => {
    const blueprint = eventListener<CustomPluginType>()("messageCreate", (args, meta) => {
      // Test type inference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: AssertEquals<typeof args, { message: Message }> = true;

      const foo = meta.pluginData.config.get();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result2: AssertEquals<typeof foo, { foo: 5 }> = true;
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });

  it("<TPluginType>()(event, options, listener)", () => {
    const blueprint = eventListener<CustomPluginType>()("messageCreate", { allowSelf: true }, (args, meta) => {
      // Test type inference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: AssertEquals<typeof args, { message: Message }> = true;

      const foo = meta.pluginData.config.get();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result2: AssertEquals<typeof foo, { foo: 5 }> = true;
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(true);
  });
});
