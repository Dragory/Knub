import { command } from "./CommandBlueprint";
import { number, string } from "knub-command-manager";
import { expect } from "chai";
import { BasePluginType } from "..";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("command() helper", () => {
  it("(blueprint)", () => {
    const blueprint = command({
      trigger: "cmd",
      signature: {
        foo: string(),
        bar: number(),
      },
      run({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { foo: string; bar: number }> = true;
      },
    });

    expect(blueprint.trigger).to.equal("cmd");
    expect(blueprint.signature).to.eql({ foo: string(), bar: number() });
    expect(blueprint.run).to.not.equal(undefined);
  });

  it("(trigger, run)", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const blueprint = command("cmd", () => {});

    expect(blueprint.trigger).to.equal("cmd");
    expect(blueprint.signature).to.equal(undefined);
    expect(blueprint.run).to.not.equal(undefined);
  });

  it("(trigger, signature, run)", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const blueprint = command(
      "cmd",
      {
        foo: string(),
        bar: number(),
      },
      ({ args }) => {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { foo: string; bar: number }> = true;
      }
    );

    expect(blueprint.trigger).to.equal("cmd");
    expect(blueprint.signature).to.eql({ foo: string(), bar: number() });
    expect(blueprint.run).to.not.equal(undefined);
  });

  it("(trigger, signature, options, run)", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const blueprint = command(
      "cmd",
      {
        foo: string(),
        bar: number(),
      },
      {
        permission: "foo",
      },
      ({ args }) => {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { foo: string; bar: number }> = true;
      }
    );

    expect(blueprint.trigger).to.equal("cmd");
    expect(blueprint.signature).to.eql({ foo: string(), bar: number() });
    expect(blueprint.permission).to.equal("foo");
    expect(blueprint.run).to.not.equal(undefined);
  });

  interface CustomPluginType extends BasePluginType {
    state: {
      foo: 5;
    };
  }

  it("<TPluginType>()(blueprint)", () => {
    const blueprint = command<CustomPluginType>()({
      trigger: "cmd",
      signature: {
        foo: string(),
        bar: number(),
      },
      run({ args, pluginData }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { foo: string; bar: number }> = true;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result2: AssertEquals<typeof pluginData.state.foo, 5> = true;
      },
    });

    expect(blueprint.trigger).to.equal("cmd");
    expect(blueprint.signature).to.eql({ foo: string(), bar: number() });
    expect(blueprint.run).to.not.equal(undefined);
  });

  it("<TPluginType>()(trigger, run)", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const blueprint = command<CustomPluginType>()("cmd", ({ pluginData }) => {
      // Test type inference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: AssertEquals<typeof pluginData.state.foo, 5> = true;
    });

    expect(blueprint.trigger).to.equal("cmd");
    expect(blueprint.signature).to.equal(undefined);
    expect(blueprint.run).to.not.equal(undefined);
  });

  it("<TPluginType>()(trigger, signature, run)", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const blueprint = command<CustomPluginType>()(
      "cmd",
      {
        foo: string(),
        bar: number(),
      },
      ({ args, pluginData }) => {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { foo: string; bar: number }> = true;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result2: AssertEquals<typeof pluginData.state.foo, 5> = true;
      }
    );

    expect(blueprint.trigger).to.equal("cmd");
    expect(blueprint.signature).to.eql({ foo: string(), bar: number() });
    expect(blueprint.run).to.not.equal(undefined);
  });

  it("<TPluginType>()(trigger, signature, options, run)", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const blueprint = command<CustomPluginType>()(
      "cmd",
      {
        foo: string(),
        bar: number(),
      },
      {
        permission: "foo",
      },
      ({ args, pluginData }) => {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { foo: string; bar: number }> = true;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result2: AssertEquals<typeof pluginData.state.foo, 5> = true;
      }
    );

    expect(blueprint.trigger).to.equal("cmd");
    expect(blueprint.signature).to.eql({ foo: string(), bar: number() });
    expect(blueprint.permission).to.equal("foo");
    expect(blueprint.run).to.not.equal(undefined);
  });
});
