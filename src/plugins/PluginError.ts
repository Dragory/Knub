import util from "util";

/**
 * Errors in plugins (commands, event handlers, etc.) are re-thrown as this
 * class *in production mode* (NODE_ENV=production) so they can be handled
 * gracefully in e.g. a global error handler.
 *
 * In development, plugin errors are not rethrown as it can cause issues when
 * using a debugger. Specifically, the call stack when pausing on the re-thrown
 * error would not match that of the original error, presumably because
 * Promise.catch() is handled separately.
 */
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
