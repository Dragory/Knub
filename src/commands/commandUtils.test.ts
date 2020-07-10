import { getCommandSignature } from "./commandUtils";
import { CommandManager, isError } from "knub-command-manager";
import assert from "assert";

describe("commandUtils", () => {
  it("getCommandSignature() works with commands without signatures", async () => {
    const manager = new CommandManager({ prefix: "!" });
    manager.add("foo");
    const matchedCommand = await manager.findMatchingCommand("!foo");
    if (isError(matchedCommand)) assert.fail();

    getCommandSignature(matchedCommand);
  });
});
