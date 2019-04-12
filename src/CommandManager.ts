import escapeStringRegex = require("escape-string-regexp");
import { Message } from "eris";
import { Lock } from "./LockManager";

export interface IParameter {
  name: string;
  type?: string;
  required?: boolean;
  def?: any;
  rest?: boolean;
  catchAll?: boolean;
}

export interface IArgument {
  parameter: IParameter;
  value: any;
}

export interface IArgumentMap {
  [name: string]: IArgument;
}

export interface IMatchedOption {
  option: ICommandOption;
  value: any;
}

export interface IMatchedOptionMap {
  [name: string]: IMatchedOption;
}

export type CommandHandler = (msg?: Message, args?: object, command?: IMatchedCommand) => void | Promise<void>;

export type CommandFilter = (msg: Message, command: IMatchedCommand) => boolean | Promise<boolean>;

export interface ICommandOption {
  name: string;
  type: string;
  required?: boolean;
  shortcut?: string;
}

export interface ICommandConfig {
  description?: string;
  requiredPermission?: string;
  allowDMs?: boolean;
  filters?: CommandFilter[];
  options?: ICommandOption[];
  locks?: string | string[];
  cooldown?: number;
  cooldownPermission?: string;
  overloads?: Array<string | IParameter>;
}

export interface ICommandDefinition {
  trigger: RegExp;
  parameters: IParameter[];
  handler: CommandHandler;
  config: ICommandConfig;
}

export interface IMatchedCommand {
  commandDefinition: ICommandDefinition;
  prefix: string;
  name: string;
  args: IArgumentMap;
  opts: IMatchedOptionMap;
  error: CommandMatchError;
  lock?: Lock;
}

export class CommandMatchError extends Error {}

const argDefinitionSimpleRegex = /[<\[].*?[>\]]/g;

const argDefinitionRegex = new RegExp(
  "[<\\[]" +
  "([a-z0-9]+?)" + // (1) Argument name
  "(?:\\:([a-z]+?))?" + // (2) Argument type
  "(?:=(.+?))?" + // (3) Default value
  "(\\.\\.\\.)?" + // (4) "..." to mark argument as a rest argument
  "(\\$)?" + // (5) "$" to mark the argument as a "catch-all" for the rest of the arguments (will be returned as the full string, unlike "...")
    "[>\\]]",
  "i"
);

const whitespace = /\s/;

const optMatchRegex = /^--?(\S+?)(?:=(.+))?$/;

const defaultParameter: IParameter = {
  name: null,
  type: "string",
  required: true,
  def: null,
  rest: false,
  catchAll: false
};

export class CommandManager {
  public commands: ICommandDefinition[] = [];

  /**
   * Adds a command to the manager.
   *
   * Examples:
   *
   * add("addrole", "<user:Member> <role:Role>", (msg, args) => ...)
   *   Adds a command called "addrole" with two required arguments without default values.
   *   These arguments are added in a easily-readable string format.
   *
   * add("setgreeting", [{name: "msg", type: "string"}], (msg, args) => ...)
   *   Adds a command with a required argument "msg" that captures the entire rest of the arguments.
   *   These arguments are added in a more programmable, array of objects format.
   *
   * add("addroles", "<user:Member> <roleName:string...>", (msg, args) => ...)
   *   Adds a command with a required, repeatable argument "roleName"
   */
  public add(
    command: string | RegExp,
    parameters: string | IParameter[],
    handler: CommandHandler,
    config: ICommandConfig = {}
  ) {
    let trigger: RegExp;

    // Command can either be a plain string or a regex
    // If string, escape it and turn it into regex
    if (typeof command === "string") {
      trigger = new RegExp(escapeStringRegex(command), "i");
    } else {
      trigger = command;
    }

    // If arguments are provided in string format, parse it
    if (typeof parameters === "string") {
      parameters = this.parseParameterString(parameters);
    } else if (parameters == null) {
      parameters = [];
    }

    parameters = parameters.map(obj => Object.assign({}, defaultParameter, obj));

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
        throw new Error(`CatchAll argument must come last`);
      }

      if (arg.catchAll) {
        hadCatchAll = true;
      }
    });

    // Actually add the command to the manager
    const definition: ICommandDefinition = {
      trigger,
      parameters,
      handler,
      config
    };

    this.commands.push(definition);

    // Return a function to remove the command
    return () => {
      this.commands.splice(this.commands.indexOf(definition), 1);
    };
  }

  public parseParameterString(str: string): IParameter[] {
    const parameterDefinitions = str.match(argDefinitionSimpleRegex) || [];

    return parameterDefinitions.map(
      (parameterDefinition, i): IParameter => {
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

        return {
          name: details[1],
          type: details[2] || "string",
          required: !isOptional,
          def: defaultValue,
          rest: isRest,
          catchAll: isCatchAll
        };
      }
    );
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
      } else if (!inQuote && char === "-" && chars.slice(i - 1, 4).join("") === " -- ") {
        current = chars.slice(i + 3).join("");
        break;
      } else {
        current += char;
      }
    }

    if (current !== "") {
      flushCurrent(0);
    }

    return args;
  }

  public matchCommand(prefix: string | RegExp, command: ICommandDefinition, str: string): IMatchedCommand {
    let escapedPrefix;
    let error = null;

    if (typeof prefix === "string") {
      if (prefix.match(/^\/.+\/$/)) {
        escapedPrefix = prefix.slice(1, -1);
      } else {
        escapedPrefix = escapeStringRegex(prefix);
      }
    } else {
      escapedPrefix = prefix.source;
    }

    const regex = new RegExp(`^(${escapedPrefix})(${command.trigger.source})(?:\\s([\\s\\S]+))?$`, "i");
    const match = str.match(regex);

    if (!match) {
      return null;
    }

    const argStr = match[3] || "";
    const parsedArguments = this.parseArguments(argStr);
    const args: IArgumentMap = {};
    const opts: IMatchedOptionMap = {};

    if (command.config.options) {
      // Match --options and -o
      for (const arg of Array.from(parsedArguments)) {
        const optMatch = arg.value.match(optMatchRegex);
        if (optMatch) {
          const optName = optMatch[1];
          const optValue = optMatch[2];

          const opt = command.config.options.find(o => o.name === optName || o.shortcut === optName);

          if (!opt) {
            continue;
          }

          opts[opt.name] = {
            option: opt,
            value: optValue
          };
          parsedArguments.splice(parsedArguments.indexOf(arg), 1);
        }
      }

      for (const opt of command.config.options) {
        if (opt.required && opts[opt.name] == null) {
          error = new CommandMatchError(`Missing option: --${opt.name}`);
          break;
        }
      }
    }

    const hasRestOrCatchAll = command.parameters.some(p => p.rest || p.catchAll);
    if (!hasRestOrCatchAll && parsedArguments.length > command.parameters.length) {
      error = new CommandMatchError(
        `Too many arguments (found ${parsedArguments.length}, expected ${command.parameters.length})`
      );
    }

    if (error == null) {
      for (const [i, param] of command.parameters.entries()) {
        const parsedArg = parsedArguments[i];
        let value;

        if (param.rest) {
          const restArgs = parsedArguments.slice(i);
          if (param.required && restArgs.length === 0) {
            error = new CommandMatchError(`Missing argument: ${param.name}`);
            break;
          }

          args[param.name] = {
            parameter: param,
            value: restArgs.map(a => a.value)
          };

          break;
        } else if (parsedArg == null || parsedArg.value === "") {
          if (param.required) {
            error = new CommandMatchError(`Missing argument: ${param.name}`);
            break;
          } else {
            value = param.def;
          }
        } else {
          value = parsedArg.value;
        }

        if (param.catchAll && parsedArg) {
          value = [...argStr].slice(parsedArg.index).join("");
        }

        args[param.name] = {
          parameter: param,
          value
        };
      }
    }

    return {
      commandDefinition: command,
      prefix: match[1],
      name: match[2],
      args: error ? {} : args,
      opts: error ? {} : opts,
      error
    };
  }

  public findCommandsInString(str: string, prefix: string): IMatchedCommand[] {
    return this.commands.reduce((matchedCommands, command) => {
      const matchedCommand = this.matchCommand(prefix, command, str);
      if (matchedCommand) matchedCommands.push(matchedCommand);
      return matchedCommands;
    }, []);
  }
}
