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

const argDefinitionSimpleRegex = /[<\[].*?[>\]]/g;

const argDefinitionRegex = new RegExp(
  "[<\\[]" +
  "([a-z0-9]+?)" + // (1) Argument name
  "(?:\\:([a-z]+?))?" + // (2) Argument type
  "(?:=(.+?))?" + // (3) Default value
  "(\\.\\.\\.)?" + // (4) "..." to mark argument as a rest argument
  "(\\$)?" + // (5) "$" to mark argument as a catch-all for the rest of the argument string
    "[>\\]]",
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

const defaultParameter: IParameter = {
  name: null,
  type: "string",
  required: true,
  catchAll: false,
  def: null,
  rest: false
};

export class CommandManager {
  public commands: ICommandDefinition[] = [];

  /**
   * Adds a command to the manager.
   *
   * Examples:
   *
   * addCommand("addrole", "<user:Member> <role:Role>", (msg, args) => ...)
   *   Adds a command called "addrole" with two required arguments without default values.
   *   These arguments are added in a easily-readable string format.
   *
   * addCommand("setgreeting", [{name: "msg", type: "string", catchAll: true}], (msg, args) => ...)
   *   Adds a command with a required argument "msg" that captures the entire rest of the arguments.
   *   These arguments are added in a more programmable, array of objects format.
   *
   * addCommand(/p[io]ng/, (msg, args) => ...)
   *   Adds a command with a regex trigger and no arguments
   *
   * addCommand("addroles", "<user:Member> <roleName:string...>", (msg, args) => ...)
   *   Adds a command with a required, repeatable argument "roleName"
   */
  public add(command: string | RegExp, ...rest: any[]) {
    let trigger: RegExp;
    let parameters: IParameter[] = [];
    let handler: CommandHandler = null;
    let options = {};
    let inputParams = [];

    // Support a variable amount of arguments:
    if (rest.length === 3) {
      // command, args, callback, options
      [inputParams, handler, options] = rest;
    } else if (rest.length === 2) {
      if (typeof rest[1] === "function") {
        // command, args, callback
        [inputParams, handler] = rest;
      } else {
        // command, callback, options
        [handler, options] = rest;
      }
    } else if (rest.length === 1) {
      // command, callback
      handler = rest[0];
    } else {
      throw new Error("Invalid number of arguments for CommandManager::add");
    }

    // Command can either be a plain string or a regex
    // If string, escape it and turn it into regex
    if (typeof command === "string") {
      trigger = new RegExp(escapeStringRegex(command), "i");
    } else {
      trigger = command;
    }

    // If arguments are provided in string format, parse it
    if (typeof inputParams === "string") {
      parameters = this.parseParameterString(inputParams);
    } else if (Array.isArray(inputParams)) {
      parameters = inputParams;
    } else {
      throw new Error(`Invalid parameter definition`);
    }

    parameters = parameters.map(obj =>
      Object.assign({}, defaultParameter, obj)
    );

    // Validate arguments to prevent unsupported behaviour
    let hadOptional = false;
    let hadRest = false;
    let hadCatchAll = false;

    parameters.forEach(arg => {
      if (!arg.required) {
        hadOptional = true;
      } else if (hadOptional) {
        throw new Error(`Optional arguments must come last`);
      }

      if (hadRest) {
        throw new Error(`Rest argument must come last`);
      }

      if (arg.rest) {
        hadRest = true;
      }

      if (hadCatchAll) {
        throw new Error(`Catch-all argument must come last`);
      }

      if (arg.catchAll) {
        hadCatchAll = true;
      }

      if (arg.rest && arg.catchAll) {
        throw new Error(
          `Argument cannot be a rest argument and a catch-all argument at the same time`
        );
      }
    });

    // Actually add the command to the manager
    const definition: ICommandDefinition = {
      trigger,
      parameters,
      handler,
      options
    };

    this.commands.push(definition);

    // Return a function to remove the command
    return () => {
      this.commands.splice(this.commands.indexOf(definition), 1);
    };
  }

  public parseParameterString(str: string): IParameter[] {
    const parameterDefinitions = str.match(argDefinitionSimpleRegex) || [];

    return parameterDefinitions.map((parameterDefinition, i) => {
      const details = parameterDefinition.match(argDefinitionRegex);
      if (!details) {
        throw new Error(`Invalid argument definition: ${parameterDefinition}`);
      }

      let defaultValue: any = details[3];
      const isRest = details[4] === "...";
      const isOptional = parameterDefinition[0] === "[" || defaultValue != null;
      const isCatchAll = details[5] === "$";

      if (isRest) {
        defaultValue = [];
      }

      if (isCatchAll && defaultValue == null) {
        defaultValue = "";
      }

      return {
        name: details[1],
        type: details[2] || "string",
        required: !isOptional,
        catchAll: isCatchAll,
        def: defaultValue,
        rest: isRest
      };
    });
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
