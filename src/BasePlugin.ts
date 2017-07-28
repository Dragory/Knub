import { Channel, Client, Guild } from "eris";

import { BaseConfig } from "./BaseConfig";

export type CallbackFunctionVariadic = (...args: any[]) => void;

export abstract class BasePlugin {
  protected bot: Client;
  protected guildId: string;
  protected guildConfig: BaseConfig;
  protected pluginConfig: BaseConfig;
  protected eventHandlers: Map<string, any[]>;

  constructor(
    bot: Client,
    guildId: string,
    guildConfig: BaseConfig,
    pluginConfig: BaseConfig
  ) {
    this.bot = bot;
    this.guildId = guildId;
    this.guildConfig = guildConfig;
    this.pluginConfig = pluginConfig;

    this.eventHandlers = new Map();
  }

  public abstract register(): any;

  public deregister(): any {
    // Empty by default
  }

  // Wrap register() in a promise
  public internalRegister(...args: any[]): Promise<any> {
    return Promise.resolve(this.register(...args));
  }

  // Clear event handlers and wrap deregister() in a promise
  public internalDeregister(): Promise<any> {
    this.clearEventHandlers();
    return Promise.resolve(this.deregister());
  }

  protected on(
    eventName: string,
    listener: CallbackFunctionVariadic
  ): () => void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }

    // Create a wrapper for the listener function that checks the first argument
    // for a Channel or Guild. If one is found, verify their guild id matches with
    // this plugin's guild id.
    const wrappedListener = (...args: any[]) => {
      if (args[0] instanceof Channel) {
        if (args[0].guild && args[0].guild.id !== this.guildId) {
          return;
        }
      }

      if (args[0] instanceof Guild) {
        if (args[0].id !== this.guildId) {
          return;
        }
      }

      return listener(...args);
    };

    // Actually register the listener on the Eris client and store the listener
    // so we can automatically clear it when the plugin is deregistered
    this.bot.on(eventName, wrappedListener);
    this.eventHandlers.get(eventName).push(wrappedListener);

    // Return a function to clear the listener
    const removeListener = () => {
      this.off(eventName, wrappedListener);
    };

    return removeListener;
  }

  protected off(eventName: string, listener: CallbackFunctionVariadic) {
    this.bot.removeListener(eventName, listener);

    if (this.eventHandlers.has(eventName)) {
      const thisEventNameHandlers = this.eventHandlers.get(eventName);
      thisEventNameHandlers.splice(thisEventNameHandlers.indexOf(listener), 1);
    }
  }

  protected clearEventHandlers() {
    for (const [eventName, listeners] of this.eventHandlers) {
      listeners.forEach(listener => {
        this.bot.removeListener(eventName, listener);
      });
    }

    this.eventHandlers.clear();
  }
}
