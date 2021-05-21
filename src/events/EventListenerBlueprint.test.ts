import { typedGlobalEventListener, typedGuildEventListener } from "./EventListenerBlueprint";
import {
  AnyGuildChannel,
  GroupChannel,
  GuildTextableChannel,
  Member,
  Message,
  PossiblyUncachedTextableChannel,
  Uncached,
} from "eris";
import { BasePluginType } from "../plugins/pluginTypes";
import { expect } from "chai";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("typedGuildEventListener() helper", () => {
  it("(blueprint)", () => {
    const blueprint1 = typedGuildEventListener({
      event: "messageCreate",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      listener() {},
    });

    expect(blueprint1.event).to.equal("messageCreate");
    expect(blueprint1.listener).to.not.equal(undefined);
    expect(blueprint1.allowSelf).to.equal(undefined);
  });

  it("(blueprint) guild event argument inference", () => {
    typedGuildEventListener({
      event: "messageCreate",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { message: Message<GuildTextableChannel | Uncached> }> = true;
      },
    });

    // More type checks
    typedGuildEventListener({
      event: "channelUpdate",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { channel: AnyGuildChannel }> = true;
      },
    });

    typedGuildEventListener({
      event: "typingStart",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { member: Member }> = true;
      },
    });
  });

  interface CustomPluginType extends BasePluginType {
    config: {
      foo: 5;
    };
  }

  it("<TPluginType>()(blueprint)", () => {
    const blueprint = typedGuildEventListener<CustomPluginType>()({
      event: "messageCreate",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      listener() {},
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });
});

describe("typedGlobalEventListener() helper", () => {
  it("(blueprint)", () => {
    const blueprint = typedGlobalEventListener({
      event: "messageCreate",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      listener() {},
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });

  it("(blueprint) guild event argument inference", () => {
    typedGlobalEventListener({
      event: "messageCreate",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { message: Message<PossiblyUncachedTextableChannel> }> = true;
      },
    });

    // More type checks
    typedGlobalEventListener({
      event: "channelUpdate",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { channel: AnyGuildChannel | GroupChannel }> = true;
      },
    });

    typedGlobalEventListener({
      event: "typingStart",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { member: Member | null }> = true;
      },
    });
  });

  interface CustomPluginType extends BasePluginType {
    config: {
      foo: 5;
    };
  }

  it("<TPluginType>()(blueprint)", () => {
    const blueprint = typedGlobalEventListener<CustomPluginType>()({
      event: "messageCreate",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      listener() {},
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });
});
