import escapeStringRegex = require("escape-string-regexp");
import { Message } from "eris";
import { IPermissions } from "./permissions";

export interface IParameter {
  name: string;
  type?: string;
  required?: boolean;
  catchAll?: boolean;
  def?: any;
  rest?: boolean;
}

export interface IArgument {
  parameter: IParameter;
  value: any;
}

export interface IArgumentMap {
  [name: string]: IArgument;
}

export type CommandHandler = (
  msg?: Message,
  args?: object,
  command?: IMatchedCommand
) => void | Promise<void>;

export type CommandFilter = (
  msg: Message,
  command: IMatchedCommand
) => boolean | Promise<boolean>;

export interface ICommandDefinition {
  trigger: RegExp;
  parameters: IParameter[];
  handler: CommandHandler;
  options: {
    description?: string;
    permissions?: IPermissions;
    allowDMs?: boolean;
    filters?: CommandFilter[];
  };
}

export interface IMatchedCommand {
  commandDefinition: ICommandDefinition;
  prefix: string;
  name: string;
  args: IArgumentMap;
}

const argDefinitionSimpleRegex = /<.*?>/g;

const argDefinitionRegex = new RegExp(
  "<" +
  "([a-z0-9]+)" + // Argument name
  "(?:\\:([a-z]+))?" + // Argument type
  "(\\?)?" + // "?" to mark argument as optional
  "(\\$)?" + // "$" to mark argument as a catch-all for the rest of the argument string
  "(?:=(.+?))?" + // Default value
  "(\\.\\.\\.)?" + // "..." to mark argument as a rest argument
    ">",
  "i"
);

const whitespace = /\s/;

export class MissingArgumentError extends Error {
  public arg: IParameter;

  constructor(arg: IParameter) {
    super(arg.name);
    this.arg = arg;
  }
}

export class CommandManager {
  public commands: ICommandDefinition[] = [];

  /**
   * Adds a command to the manager.
   *
   * Examples:
   *
   * addCommand("addrole <user:Member> <role:Role>", (msg, args) => ...)
   *   Adds a command called "addrole" with two required arguments without default values
   *
   * addCommand(/p[io]ng/, (msg, args) => ...)
   *   Adds a command with a regex trigger and no arguments
   *
   * addCommand("setgreeting <msg:string>", {msg: {def: someLongText}}, (msg, args) => ...)
   *   Adds a command with a required argument "msg".
   *   The argument's default value is set to a variable in the second argument.
   *   In this case, the second argument is an object with argument name as the key and argument details as the value.
   *
   * addCommand("8ball", [{name: "question"}], (msg, args) => ...)
   *   Adds a command with arguments defined in an array
   *
   * addCommand("addroles <user:Member> <roleName:string...>", (msg, args) => ...)
   *   Adds a command with a required, repeatable argument "roleName"
   */
  public add(command: string | RegExp, ...rest: any[]) {
    let trigger: RegExp;
    let args: IParameter[] = [];

    if (typeof command === "string") {
      // If the first argument is a string, parse command name + arguments from it
      const argDefinitions = command.match(argDefinitionSimpleRegex) || [];
      let hadOptional = false;
      let hadRest = false;
      let hadCatchAll = false;

      args = argDefinitions.map((argDefinition, i) => {
        const details = argDefinition.match(argDefinitionRegex);
        if (!details) {
          throw new Error(`Invalid argument definition: ${argDefinition}`);
        }

        let def: any = details[5];
        const isRest = details[6] === "...";
        const isOptional = details[3] === "?" || def != null;
        const isCatchAll = details[4] === "$";

        if (isOptional) {
          hadOptional = true;
        } else if (hadOptional) {
          throw new Error(`Optional arguments must come last`);
        }

        if (hadRest) {
          throw new Error(`Rest argument must come last`);
        }

        if (isRest) {
          hadRest = true;
        }

        if (hadCatchAll) {
          throw new Error(`Catch-all argument must come last`);
        }

        if (isCatchAll) {
          hadCatchAll = true;
        }

        if (isRest && def != null) {
          throw new Error(
            `Rest argument default values need to be defined in the second argument`
          );
        }

        if (isRest && isCatchAll) {
          throw new Error(
            `Argument cannot be a rest argument and a catch-all argument at the same time`
          );
        }

        if (isRest) {
          def = [];
        }

        if (isCatchAll && def == null) {
          def = "";
        }

        return {
          name: details[1],
          type: details[2] || "string",
          required: !isOptional,
          catchAll: isCatchAll,
          def,
          rest: isRest
        };
      });

      const commandWithoutArgs = command
        .replace(argDefinitionSimpleRegex, "")
        .trim();
      trigger = new RegExp(escapeStringRegex(commandWithoutArgs), "i");
    } else {
      // If the first argument is regex, use it directly
      trigger = command;
    }

    let handler: CommandHandler = null;
    let options = {};

    if (rest.length > 1 && typeof rest[rest.length - 1] === "object") {
      options = rest[rest.length - 1];
      rest = rest.slice(0, -1);
    }

    if (rest.length === 1) {
      // No extra argument info
      handler = rest[0];
    } else if (rest.length === 2) {
      // Second parameter is extra argument info
      const argDetails = rest[0];
      handler = rest[1];

      if (Array.isArray(argDetails)) {
        // Array of argument definitions
        args = args.concat(argDetails);
      } else if (typeof argDetails === "object") {
        // Object of name => argument definition
        // Go through all defined arguments and extend their settings with settings from the object, if any
        args.forEach(arg => {
          if (argDetails[arg.name]) {
            Object.assign(arg, argDetails[arg.name]);
          }
        });
      }
    } else {
      throw new Error(`Invalid argument count for addCommand`);
    }

    const definition: ICommandDefinition = {
      trigger,
      parameters: args,
      handler,
      options
    };

    this.commands.push(definition);

    return () => {
      this.commands.splice(this.commands.indexOf(definition), 1);
    };
  }

  public parseArguments(str: string): Array<{ index: number; value: string }> {
    const args: Array<{ index: number; value: string }> = [];
    const chars = [...str]; // Unicode split

    let index = 0;
    let current = "";
    let escape = false;
    let inQuote = null;

    const flushCurrent = (newIndex: number) => {
      if (current === "") {
        return;
      }

      args.push({ index, value: current });
      current = "";
      index = newIndex;
    };

    for (const [i, char] of chars.entries()) {
      if (escape) {
        current += char;
        escape = false;
        continue;
      } else if (whitespace.test(char) && inQuote === null) {
        flushCurrent(i + 1);
      } else if (char === `'` || char === `"`) {
        if (inQuote === null) {
          inQuote = char;
        } else if (inQuote === char) {
          flushCurrent(i + 1);
          inQuote = null;
          continue;
        } else {
          current += char;
        }
      } else {
        current += char;
      }
    }

    if (current !== "") {
      flushCurrent(0);
    }

    return args;
  }

  public matchCommand(
    prefix: string | RegExp,
    command: ICommandDefinition,
    str: string
  ): IMatchedCommand {
    const escapedPrefix =
      typeof prefix === "string" ? escapeStringRegex(prefix) : prefix.source;
    const regex = new RegExp(
      `^(${escapedPrefix})(${command.trigger.source})(?:\\s(.+))?$`,
      "i"
    );
    const match = str.match(regex);

    if (!match) {
      return null;
    }

    const parsedArguments = this.parseArguments(match[3] || "");
    const args: IArgumentMap = {};

    for (const [i, param] of command.parameters.entries()) {
      const parsedArg = parsedArguments[i];
      let value;

      if (parsedArg == null || parsedArg.value === "") {
        if (param.required) {
          throw new MissingArgumentError(param);
        } else {
          value = param.def;
        }
      } else {
        let parsedValue = parsedArg.value;
        if (param.catchAll) {
          const chars = [...str];
          parsedValue = chars.slice(parsedArg.index).join("");
        }

        value = parsedValue;
      }

      args[param.name] = {
        parameter: param,
        value
      };
    }

    return {
      commandDefinition: command,
      prefix: match[1],
      name: match[2],
      args
    };
  }

  public findCommandsInString(str: string, prefix: string): IMatchedCommand[] {
    const commands: IMatchedCommand[] = [];

    this.commands.forEach(command => {
      const matchedCommand = this.matchCommand(prefix, command, str);
      if (matchedCommand) {
        commands.push(matchedCommand);
      }
    });

    return commands;
  }
}
