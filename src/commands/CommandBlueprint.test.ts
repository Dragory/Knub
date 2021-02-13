import { number, string } from "knub-command-manager";
import { expect } from "chai";
import { BasePluginType, globalCommand } from "..";
import { guildCommand } from "./CommandBlueprint";
import { GuildTextableChannel, PrivateChannel, Textable } from "eris";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("guildCommand() helper", () => {
  it("(blueprint)", () => {
    const blueprint = guildCommand({
      trigger: "cmd",
      permission: null,
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
    const blueprint = guildCommand("cmd", () => {});

    expect(blueprint.trigger).to.equal("cmd");
    expect(blueprint.signature).to.equal(undefined);
    expect(blueprint.run).to.not.equal(undefined);
  });

  it("(trigger, signature, run)", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const blueprint = guildCommand(
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
    const blueprint = guildCommand(
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
    const blueprint = guildCommand<CustomPluginType>()({
      trigger: "cmd",
      permission: null,
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
    const blueprint = guildCommand<CustomPluginType>()("cmd", ({ pluginData }) => {
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
    const blueprint = guildCommand<CustomPluginType>()(
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
    const blueprint = guildCommand<CustomPluginType>()(
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

  it("command message is a guild message", () => {
    guildCommand("foo", {}, ({ message }) => {
      // Make sure message.member cannot be null
      // https://github.com/microsoft/TypeScript/issues/29627#issuecomment-458329399
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: null extends typeof message.member ? false : true = true;

      // Make sure message.channel is always a textable guild channel and cannot be a private channel
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result2: Textable & PrivateChannel extends typeof message.channel
        ? false
        : GuildTextableChannel extends typeof message.channel
        ? true
        : false = true;
    });
  });

  it("args type inference for multiple signatures", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const blueprint = guildCommand(
      "cmd",
      [
        {
          foo: string(),
          bar: number(),
        },
        {
          baz: number(),
        },
      ],
      ({ args }) => {
        if (args.foo != null) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const x: number = args.bar; // args.bar cannot be undefined
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const y: undefined = args.baz; // args.baz must be undefined
        }

        if (args.baz != null) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const x: number = args.baz; // args.baz cannot be undefined
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const y: undefined = args.bar; // args.bar must be undefined
        }
      }
    );
  });
});

describe("globalCommand() helper", () => {
  it("(blueprint)", () => {
    const blueprint = globalCommand({
      trigger: "cmd",
      permission: null,
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
    const blueprint = globalCommand("cmd", () => {});

    expect(blueprint.trigger).to.equal("cmd");
    expect(blueprint.signature).to.equal(undefined);
    expect(blueprint.run).to.not.equal(undefined);
  });

  it("(trigger, signature, run)", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const blueprint = globalCommand(
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
    const blueprint = globalCommand(
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
    const blueprint = globalCommand<CustomPluginType>()({
      trigger: "cmd",
      permission: null,
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
    const blueprint = globalCommand<CustomPluginType>()("cmd", ({ pluginData }) => {
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
    const blueprint = globalCommand<CustomPluginType>()(
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
    const blueprint = globalCommand<CustomPluginType>()(
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

  it("command message is NOT necessarily a guild message", () => {
    globalCommand("foo", {}, ({ message }) => {
      // If the message is not necessarily a guild message, the member can be null
      // https://github.com/microsoft/TypeScript/issues/29627#issuecomment-458329399
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result: null extends typeof message.member ? true : false = true;

      // If the message is not necessarily a guild message, the channel can be a private channel
      // as well as a guild channel.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result2: Textable & PrivateChannel extends typeof message.channel
        ? GuildTextableChannel extends typeof message.channel
          ? true
          : false
        : false = true;
    });
  });
});
