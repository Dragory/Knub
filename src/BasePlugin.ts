import { Channel, Client, Guild, GuildChannel, Message } from "eris";

import { BaseConfig } from "./BaseConfig";
import { parse as parseCommand } from "./CommandParser";

export type CallbackFunctionVariadic = (...args: any[]) => void;

export type CommandHandlerFunction = (
  msg: Message,
  args?: object
) => void | Promise<void>;

export class BasePlugin {
  protected bot: Client;
  protected guildId: string;
  protected guildConfig: BaseConfig;
  protected pluginConfig: BaseConfig;
  private eventHandlers: Map<string, any[]>;
  private commandHandlers: Map<string, CommandHandlerFunction[]>;
  private commandListenerRegistered: boolean = false;

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

  // Wrap register() in a promise
  public runLoad(...args: any[]): Promise<any> {
    return Promise.resolve(this.load(...args));
  }

  // Clear event handlers and wrap deregister() in a promise
  public runUnload(): Promise<any> {
    this.clearEventHandlers();
    return Promise.resolve(this.unload());
  }

  protected load(): any {
    // Implemented by plugin, empty by default
  }

  protected unload(): any {
    // Implemented by plugin, empty by default
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

  protected off(eventName: string, listener: CallbackFunctionVariadic): void {
    this.bot.removeListener(eventName, listener);

    if (this.eventHandlers.has(eventName)) {
      const thisEventNameHandlers = this.eventHandlers.get(eventName);
      thisEventNameHandlers.splice(thisEventNameHandlers.indexOf(listener), 1);
    }
  }

  protected clearEventHandlers(): void {
    for (const [eventName, listeners] of this.eventHandlers) {
      listeners.forEach(listener => {
        this.bot.removeListener(eventName, listener);
      });
    }

    this.eventHandlers.clear();
  }

  protected normalizeCommandName(commandName: string): string {
    // Commands are case-insensitive and cannot contain whitespace
    return commandName.trim().toLowerCase().replace(/\s/g, "");
  }

  protected onCommand(
    commandName: string,
    handler: CommandHandlerFunction
  ): () => void {
    if (!this.commandListenerRegistered) {
      // If this is the first command we're registering for this plugin,
      // register the event handler to parse messages for commands
      this.on("messageCreate", this.runMessageCommands.bind(this));
      this.commandListenerRegistered = true;
    }

    const normalizedCommandName = this.normalizeCommandName(commandName);

    if (!this.commandHandlers.has(normalizedCommandName)) {
      this.commandHandlers.set(normalizedCommandName, []);
    }

    this.commandHandlers.get(normalizedCommandName).push(handler);

    // Return function to unregister the handler
    return () => {
      if (this.commandHandlers.has(normalizedCommandName)) {
        const commands = this.commandHandlers.get(normalizedCommandName);
        commands.splice(commands.indexOf(handler), 1);
      }
    };
  }

  protected async runMessageCommands(msg: Message): Promise<void> {
    if (!(msg.channel instanceof GuildChannel)) {
      // Ignore private messages
      return;
    }

    if (msg.channel.guild.id !== this.guildId) {
      // Restrict to this plugin's guild
      return;
    }

    if (msg.content == null || msg.content.trim() === "") {
      // Ignore messages without text (e.g. images, embeds, etc.)
      return;
    }

    const prefix = await this.guildConfig.get("prefix", "!");
    const parsedCommand = parseCommand(prefix, msg.content);

    if (!parsedCommand) {
      return;
    }

    const normalizedCommandName = this.normalizeCommandName(
      parsedCommand.commandName
    );

    if (!this.commandHandlers.has(normalizedCommandName)) {
      return;
    }

    const handlers = this.commandHandlers.get(normalizedCommandName);
    for (const handler of handlers) {
      // Run each handler sequentially
      await handler(msg, parsedCommand.args);
    }
  }
}
