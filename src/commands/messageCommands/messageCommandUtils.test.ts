import { assert } from "chai";
import { CommandManager, isError, number, string } from "knub-command-manager";
import { describe, it } from "mocha";
import {
  type ArgsFromSignatureOrArray,
  type CommandContext,
  type CommandExtraData,
  getMessageCommandSignature,
} from "./messageCommandUtils.ts";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

const cmdContext = {} as CommandContext<any>;

describe("messageCommandUtils", () => {
  it("getCommandSignature() works with commands without signatures", async () => {
    const manager = new CommandManager<CommandContext<any>, CommandExtraData<any>>({ prefix: "!" });
    manager.add("foo");
    const matchedCommand = await manager.findMatchingCommand("!foo", cmdContext);
    if (isError(matchedCommand) || matchedCommand == null) assert.fail();

    getMessageCommandSignature(matchedCommand);
  });

  it("ArgsFromSignature basic functionality", () => {
    const signature = {
      foo: string(),
      bar: number(),
    };

    type TArgsFromSignature = ArgsFromSignatureOrArray<typeof signature>;
    const result1: AssertEquals<TArgsFromSignature["foo"], string> = true;
    const result2: AssertEquals<TArgsFromSignature["bar"], number> = true;
  });

  it("ArgsFromSignature rest parameters", () => {
    const signature = {
      foo: string({ rest: true }),
      bar: number({ rest: true }),
    };

    type TArgsFromSignature = ArgsFromSignatureOrArray<typeof signature>;
    const result1: AssertEquals<TArgsFromSignature["foo"], string[]> = true;
    const result2: AssertEquals<TArgsFromSignature["bar"], number[]> = true;
  });
});
