import { expect } from "chai";
import { CommandManager } from "../src/CommandManager";

describe("CommandManager::parseArguments", () => {
  it("should parse arguments correctly", () => {
    const manager = new CommandManager();
    const parsed = manager.parseArguments(`arg1 "double-quoted value" 'single-quoted value' something`);

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

    manager.add("addrole", "<user:Member> <arg2:string=somedefault>", noop);
    manager.add(/p[io]ng/, null, noop);
    manager.add("setgreeting <msg:string$>", [{ name: "msg", def: "something" }], noop);
    manager.add("8ball", [{ name: "question" }], noop);
    manager.add("addroles", "<user:Member> [roleName:string...]", noop);

    expect(manager.commands.length).to.equal(5);
  });

  it("should parse parameters", () => {
    const manager = new CommandManager();
    const noop = () => {
      /* empty */
    };

    manager.add("addrole", "<user:Member> <arg2:string=somedefault>", noop);
    manager.add("setgreeting", [{ name: "msg", type: "string", def: "something" }], noop);
    manager.add("addroles", "[roleNames:string...]", noop);
    manager.add("addnote", "<note:string$>", noop);

    expect(manager.commands[0].parameters.length).to.equal(2);

    expect(manager.commands[0].parameters[0]).to.deep.equal({
      name: "user",
      type: "Member",
      required: true,
      def: undefined,
      rest: false,
      catchAll: false
    });

    expect(manager.commands[0].parameters[1]).to.deep.equal({
      name: "arg2",
      type: "string",
      required: false,
      def: "somedefault",
      rest: false,
      catchAll: false
    });

    expect(manager.commands[1].parameters[0]).to.deep.equal({
      name: "msg",
      type: "string",
      required: true,
      def: "something",
      rest: false,
      catchAll: false
    });

    expect(manager.commands[2].parameters[0].rest).to.equal(true);
    expect(JSON.stringify(manager.commands[2].parameters[0].def)).to.equal("[]");
    expect(manager.commands[3].parameters[0].catchAll).to.equal(true);
  });

  it("should match added commands", () => {
    const manager = new CommandManager();
    const noop = () => {
      /* empty */
    };

    manager.add("addrole", "<user:Member> <arg2:string=somedefault>", noop);
    manager.add("addroles", "[roleNames:string...]", noop);
    manager.add("addroles", "<roleStr:string>", noop);

    const result = manager.matchCommand("!", manager.commands[0], '!addrole 1234 ""');
    expect(result.error).to.equal(null);
    expect(result.args.user.value).to.equal("1234");
    expect(result.args.arg2.value).to.equal("somedefault");

    const commands = manager.findCommandsInString("!addroles NA EU", "!");
    expect(commands.length).to.equal(2);
  });

  it("should handle catchAll correctly", () => {
    const manager = new CommandManager();
    const noop = () => {
      /* empty */
    };

    manager.add("addnote", "<num:number> <note:string$>", noop);

    const result = manager.matchCommand("!", manager.commands[0], "!addnote 1234 Hello how are you doing\nthere");
    expect(result.args.note.value).to.equal("Hello how are you doing\nthere");
  });

  it("should recognize regex prefixes", () => {
    const manager = new CommandManager();
    const noop = () => {
      /* empty */
    };

    manager.add("cmd", [], noop);

    const prefix = "/(?:!|\\.\\.)/";

    const test1 = manager.matchCommand(prefix, manager.commands[0], "!cmd");

    const test2 = manager.matchCommand(prefix, manager.commands[0], "..cmd");

    const test3 = manager.matchCommand(prefix, manager.commands[0], ";;cmd");

    expect(test1).to.not.equal(null);
    expect(test2).to.not.equal(null);
    expect(test3).to.equal(null);
  });

  it("should have errors in mismatched commands", () => {
    const manager = new CommandManager();
    const noop = () => {
      /* empty */
    };

    manager.add("cmd", "<arg:string>", noop);
    manager.add("cmd", [], noop); // Same command, no arg requirements

    const commands = manager.findCommandsInString("!cmd", "!");

    // String matches both commands, but...
    expect(commands.length).to.equal(2);

    // First match (for the first command) has an error since the required param is missing
    expect(commands[0].error).to.not.equal(null);
    // Second match (for the second command) has no errors since there were no required params
    expect(commands[1].error).to.equal(null);
  });

  it("should match basic options", () => {
    const manager = new CommandManager();
    const noop = () => {
      /* empty */
    };

    manager.add("cmd", "<arg:string>", noop, {
      options: [{ name: "test", type: "string" }]
    });

    const commands = manager.findCommandsInString("!cmd --test=foo argvalue", "!");
    expect(commands.length).to.equal(1);
    expect(commands[0].error).to.equal(null);
    expect(commands[0].opts.test).to.not.be.an("undefined");
    expect(commands[0].opts.test.value).to.equal("foo");
  });

  it("should match option shortcuts", () => {
    const manager = new CommandManager();
    const noop = () => {
      /* empty */
    };

    manager.add("cmd", "", noop, {
      options: [{ name: "test", type: "string", shortcut: "t" }]
    });

    const commands = manager.findCommandsInString("!cmd -t=bar", "!");
    expect(commands.length).to.equal(1);
    expect(commands[0].error).to.equal(null);
    expect(commands[0].opts.test).to.not.be.an("undefined");
    expect(commands[0].opts.test.value).to.equal("bar");
  });
});
