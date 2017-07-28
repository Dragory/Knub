import { expect } from "chai";
import { parse } from "../src/CommandParser";

describe("CommandParser::parse", () => {
  it("should find the command and correct arguments", () => {
    const testStr = "!command pos1 --arg=3 pos2 -n";
    const result = parse("!", testStr);

    expect(result).to.not.equal(null);
    expect(result.args).to.have.all.keys("_", "arg", "n");
    expect(result.args._).to.have.length(2);
    expect(result.args.arg).to.equal(3);
  });

  it("should return null for invalid prefix", () => {
    const testStr = ".command";
    const result = parse("!", testStr);

    expect(result).to.equal(null);
  });
});
