import { expect } from "chai";
import { CommandManager } from "../src/CommandManager";

describe("CommandManager::parseArguments", () => {
  it("should parse arguments correctly", () => {
    const manager = new CommandManager();
    const parsed = manager.parseArguments(
      `arg1 "double-quoted value" 'single-quoted value' something`
    );

    expect(parsed.length).to.equal(4);
    expect(parsed[0].value).to.equal("arg1");
    expect(parsed[1].value).to.equal("double-quoted value");
    expect(parsed[2].value).to.equal("single-quoted value");
    expect(parsed[3].value).to.equal("something");
  });
});

describe("CommandManager", () => {
  it("should accept and parse commands", () => {
    const manager = new CommandManager();
    const noop = () => {
      /* empty */
    };

    manager.add("addrole <user:Member> <arg2:string=somedefault>", noop);
    manager.add(/p[io]ng/, noop);
    manager.add(
      "setgreeting <msg:string$>",
      { msg: { def: "something" } },
      noop
    );
    manager.add("8ball", [{ name: "question" }], noop);
    manager.add("addroles <user:Member> <roleName:string?...>", noop);

    expect(manager.commands.length).to.equal(5);
  });

  it("should parse arguments from string", () => {
    const manager = new CommandManager();
    const noop = () => {
      /* empty */
    };

    manager.add("addrole <user:Member> <arg2:string=somedefault>", noop);
    manager.add(
      "setgreeting <msg:string$>",
      { msg: { def: "something" } },
      noop
    );
    manager.add("addroles <roleNames:string?...>", noop);

    expect(manager.commands[0].parameters.length).to.equal(2);

    expect(manager.commands[0].parameters[0]).to.deep.equal({
      name: "user",
      type: "Member",
      required: true,
      catchAll: false,
      def: undefined,
      rest: false
    });

    expect(manager.commands[0].parameters[1]).to.deep.equal({
      name: "arg2",
      type: "string",
      required: false,
      catchAll: false,
      def: "somedefault",
      rest: false
    });

    expect(manager.commands[1].parameters[0]).to.deep.equal({
      name: "msg",
      type: "string",
      required: true,
      catchAll: true,
      def: "something",
      rest: false
    });

    expect(manager.commands[2].parameters[0].rest).to.equal(true);
    expect(JSON.stringify(manager.commands[2].parameters[0].def)).to.equal(
      "[]"
    );
  });

  it("should match added commands", () => {
    const manager = new CommandManager();
    const noop = () => {
      /* empty */
    };

    manager.add("addrole <user:Member> <arg2:string=somedefault>", noop);
    manager.add(
      "setgreeting <msg:string$>",
      { msg: { def: "something" } },
      noop
    );
    manager.add("addroles <roleNames:string?...>", noop);
    manager.add("addroles <roleStr$>", noop);

    const result = manager.matchCommand(
      "!",
      manager.commands[0],
      '!addrole 1234 ""'
    );
    expect(result.args.user.value).to.equal("1234");
    expect(result.args.arg2.value).to.equal("somedefault");

    const multiResult = manager.findCommandsInString("!addroles NA EU", "!");
    expect(multiResult.length).to.equal(2);
  });
});
