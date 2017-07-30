import escapeStringRegex = require("escape-string-regexp");
import minimistString = require("minimist-string");

export interface IParsedCommand {
  prefix: string;
  commandName: string;
  args: any;
}

export function parse(prefix: string, str: string): IParsedCommand {
  const escapedPrefix = escapeStringRegex(prefix);
  const commandMatchRegex = `^${escapedPrefix}(\\S+)(?:\\s+(.+))?$`;
  const matches = str.match(new RegExp(commandMatchRegex, "i"));

  if (!matches) {
    return null;
  }

  const commandName = matches[1];
  const argStr = matches[2] || "";
  const args = minimistString(argStr);

  return {
    args,
    commandName,
    prefix
  };
}
