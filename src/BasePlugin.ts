import { Channel, Client, Guild, GuildChannel, Message } from "eris";

import { BaseConfig } from "./BaseConfig";
import { parse as parseCommand } from "./CommandParser";

export type CallbackFunctionVariadic = (...args: any[]) => void;

export type CommandHandlerFunction = (
  msg: Message,
  args?: object
) => void | Promise<void>;

export interface ICommandOptions {
  permissions?: {
    permissions?: string[];
    roles?: string[];
    users?: string[];
  };
}

export interface ICommandSpecification {
  name: string;
  handler: CommandHandlerFunction;
  options: ICommandOptions;
}

export class BasePlugin {
  protected bot: Client;
  protected guildId: string;
  protected guildConfig: BaseConfig;
  protected pluginConfig: BaseConfig;
  protected pluginName: string;
  private eventHandlers: Map<string, any[]>;
  private registeredCommands: Map<string, ICommandSpecification[]>;
  private commandListenerRegistered: boolean = false;

  constructor(
    bot: Client,
    guildId: string,
    guildConfig: BaseConfig,
    pluginConfig: BaseConfig,
    pluginName: string
  ) {
    this.bot = bot;
    this.guildId = guildId;
    this.guildConfig = guildConfig;
    this.pluginConfig = pluginConfig;
    this.pluginName = pluginName;

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

  protected async isAllowed(
    msg: Message,
    command?: ICommandSpecification
  ): Promise<boolean> {
    const [
      pluginChannelBlacklist,
      commandChannelBlacklist
    ] = await Promise.all([
      this.guildConfig.get("pluginChannelBlacklist"),
      this.guildConfig.get("commandChannelBlacklist")
    ]);

    // Is this plugin blacklisted on this channel entirely?
    if (
      pluginChannelBlacklist[this.pluginName] &&
      pluginChannelBlacklist[this.pluginName].includes(msg.channel.id)
    ) {
      return false;
    }

    // Is this command blacklisted on this channel?
    if (
      commandChannelBlacklist[this.pluginName] &&
      commandChannelBlacklist[this.pluginName][command.name] &&
      commandChannelBlacklist[this.pluginName][command.name].includes(
        msg.channel.id
      )
    ) {
      return false;
    }

    // Basic permissions
    if (
      command.options.permissions.permissions &&
      command.options.permissions.permissions.some(
        perm => !msg.member.permission.has(perm)
      )
    ) {
      return false;
    }

    // Role permissions
    if (
      command.options.permissions.roles &&
      command.options.permissions.roles.some(
        roleId => !msg.member.roles.includes(roleId)
      )
    ) {
      return false;
    }

    // User id permissions
    if (
      command.options.permissions.users &&
      !command.options.permissions.users.includes(msg.member.id)
    ) {
      return false;
    }

    return true;
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
    const wrappedListener = async (...args: any[]) => {
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

      if (args[0] instanceof Message) {
        if (!await this.isAllowed(args[0])) {
          return;
        }
      }

      listener(...args);
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
    handler: CommandHandlerFunction,
    options: ICommandOptions = null
  ): () => void {
    if (!this.commandListenerRegistered) {
      // If this is the first command we're registering for this plugin,
      // register the event handler to parse messages for commands
      this.on("messageCreate", this.runMessageCommands.bind(this));
      this.commandListenerRegistered = true;
    }

    const normalizedCommandName = this.normalizeCommandName(commandName);

    if (!this.registeredCommands.has(normalizedCommandName)) {
      this.registeredCommands.set(normalizedCommandName, []);
    }

    const command: ICommandSpecification = {
      handler,
      name: commandName,
      options: options || {}
    };

    this.registeredCommands.get(normalizedCommandName).push(command);

    // Return function to unregister the command
    return () => {
      if (this.registeredCommands.has(normalizedCommandName)) {
        const commands = this.registeredCommands.get(normalizedCommandName);
        commands.splice(commands.indexOf(command), 1);
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

    const normalizedCommandName = this.normalizeCommandName(parsedCommand.name);

    if (!this.registeredCommands.has(normalizedCommandName)) {
      return;
    }

    const commands = this.registeredCommands.get(normalizedCommandName);
    for (const command of commands) {
      // Run each handler sequentially
      if (!await this.isAllowed(msg, command)) {
        continue;
      }

      await command.handler(msg, parsedCommand.args);
    }
  }
}
