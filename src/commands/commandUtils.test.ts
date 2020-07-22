import { ArgsFromSignatureOrArray, getCommandSignature } from "./commandUtils";
import { CommandManager, isError, number, string } from "knub-command-manager";
import assert from "assert";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

describe("commandUtils", () => {
  it("getCommandSignature() works with commands without signatures", async () => {
    const manager = new CommandManager({ prefix: "!" });
    manager.add("foo");
    const matchedCommand = await manager.findMatchingCommand("!foo");
    if (isError(matchedCommand)) assert.fail();

    getCommandSignature(matchedCommand);
  });

  it("ArgsFromSignature basic functionality", () => {
    const signature = {
      foo: string(),
      bar: number(),
    };

    type TArgsFromSignature = ArgsFromSignatureOrArray<typeof signature>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result1: AssertEquals<TArgsFromSignature["foo"], string> = true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result2: AssertEquals<TArgsFromSignature["bar"], number> = true;
  });

  it("ArgsFromSignature rest parameters", () => {
    const signature = {
      foo: string({ rest: true }),
      bar: number({ rest: true }),
    };

    type TArgsFromSignature = ArgsFromSignatureOrArray<typeof signature>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result1: AssertEquals<TArgsFromSignature["foo"], string[]> = true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result2: AssertEquals<TArgsFromSignature["bar"], number[]> = true;
  });
});
