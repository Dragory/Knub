import { globalPluginEventListener, guildPluginEventListener } from "./EventListenerBlueprint";
import { BasePluginType } from "../plugins/pluginTypes";
import { expect } from "chai";
import { GuildMessage } from "../types";
import { Channel, GuildChannel, GuildTextBasedChannel, Message, TextBasedChannel } from "discord.js";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("guildPluginEventListener() helper", () => {
  it("(blueprint)", () => {
    const blueprint1 = guildPluginEventListener({
      event: "messageCreate",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      listener() {},
    });

    expect(blueprint1.event).to.equal("messageCreate");
    expect(blueprint1.listener).to.not.equal(undefined);
    expect(blueprint1.allowSelf).to.equal(undefined);
  });

  it("(blueprint) guild event argument inference", () => {
    guildPluginEventListener({
      event: "messageCreate",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { message: GuildMessage }> = true;
      },
    });

    // More type checks
    guildPluginEventListener({
      event: "channelUpdate",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { oldChannel: GuildChannel; newChannel: GuildChannel }> = true;
      },
    });

    guildPluginEventListener({
      event: "typingStart",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args.typing.channel, GuildTextBasedChannel> = true;
      },
    });
  });

  interface CustomPluginType extends BasePluginType {
    config: {
      foo: 5;
    };
  }

  it("<TPluginType>()(blueprint)", () => {
    const blueprint = guildPluginEventListener<CustomPluginType>()({
      event: "messageCreate",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      listener() {},
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });
});

describe("globalPluginEventListener() helper", () => {
  it("(blueprint)", () => {
    const blueprint = globalPluginEventListener({
      event: "messageCreate",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      listener() {},
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });

  it("(blueprint) guild event argument inference", () => {
    globalPluginEventListener({
      event: "messageCreate",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { message: Message }> = true;
      },
    });

    // More type checks
    globalPluginEventListener({
      event: "channelUpdate",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args, { oldChannel: Channel; newChannel: Channel }> = true;
      },
    });

    globalPluginEventListener({
      event: "typingStart",
      listener({ args }) {
        // Test type inference
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result: AssertEquals<typeof args.typing.channel, TextBasedChannel> = true;
      },
    });
  });

  interface CustomPluginType extends BasePluginType {
    config: {
      foo: 5;
    };
  }

  it("<TPluginType>()(blueprint)", () => {
    const blueprint = globalPluginEventListener<CustomPluginType>()({
      event: "messageCreate",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      listener() {},
    });

    expect(blueprint.event).to.equal("messageCreate");
    expect(blueprint.listener).to.not.equal(undefined);
    expect(blueprint.allowSelf).to.equal(undefined);
  });
});
