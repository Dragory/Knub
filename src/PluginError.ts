import util from "util";

export class PluginError extends Error {
  public pluginName: string;
  public originalError: Error;

  constructor(message: string | Error) {
    if (message instanceof Error) {
      super(`${message.name}: ${message.message}`);
      this.stack = message.stack;
      this.originalError = message;
    } else {
      super(message);
    }
  }

  public [util.inspect.custom](depth, options) {
    return `PluginError: ${this.stack}`;
  }
}
