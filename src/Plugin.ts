import {
  Channel,
  Client,
  Guild,
  GuildChannel,
  Message,
  PrivateChannel
} from "eris";

import { CommandManager, ICommandDefinition } from "./CommandManager";
import { ISettingsProvider } from "./ISettingsProvider";
import { IPermissions, isAllowed } from "./permissions";

export type CallbackFunctionVariadic = (...args: any[]) => void;

export class Plugin {
  public name: string;
  public description: string;
  public defaultPermissions: IPermissions;

  protected bot: Client;
  protected guildId: string;
  protected guildConfig: ISettingsProvider;
  protected pluginConfig: ISettingsProvider;
  protected pluginName: string;

  protected commands: CommandManager;

  private eventHandlers: Map<string, any[]>;

  constructor(
    bot: Client,
    guildId: string,
    guildConfig: ISettingsProvider,
    pluginConfig: ISettingsProvider,
    pluginName: string
  ) {
    this.bot = bot;
    this.guildId = guildId;
    this.guildConfig = guildConfig;
    this.pluginConfig = pluginConfig;
    this.pluginName = pluginName;

    this.commands = new CommandManager();

    this.eventHandlers = new Map();

    this.registerMainListener();
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

  protected registerMainListener(): void {
    this.on("messageCreate", this.runMessageCommands.bind(this));

    // BasePlugin::on ignores direct messages
    this.onDirectMessage(this.runMessageCommands.bind(this));
  }

  protected async isPluginAllowed(msg: Message): Promise<boolean> {
    const [
      pluginChannelBlacklist,
      pluginChannelWhitelist,
      pluginPermissions
    ] = await Promise.all([
      this.pluginConfig.get("channelWhitelist", []),
      this.pluginConfig.get("channelBlacklist", []),
      this.pluginConfig.get("permissions", {})
    ]);

    // Check channel whitelist and blacklist for this plugin
    // Having a whitelist always overrides the blacklist
    if (pluginChannelWhitelist.length) {
      if (!pluginChannelWhitelist.includes(msg.channel.id)) {
        return false;
      }
    } else if (pluginChannelBlacklist.includes(msg.channel.id)) {
      return false;
    }

    // Permission check
    if (!isAllowed(pluginPermissions, msg.member)) {
      return false;
    }

    return true;
  }

  protected async isCommandAllowed(
    msg: Message,
    command: ICommandDefinition
  ): Promise<boolean> {
    // Permission check
    if (
      command.options.permissions &&
      !isAllowed(command.options.permissions, msg.member)
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
      let guild;

      if (args[0] instanceof Channel) {
        if (!(args[0] instanceof GuildChannel)) {
          return;
        }

        guild = args[0].guild;
      }

      if (args[0] instanceof Guild) {
        guild = args[0];
      }

      if (args[0] instanceof Message) {
        if (!(args[0].channel instanceof GuildChannel)) {
          return;
        }

        guild = args[0];
      }

      if (guild && guild.id !== this.guildId) {
        return;
      }

      // Check permissions
      if (args[0] instanceof Message) {
        if (!await this.isPluginAllowed(args[0])) {
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

  protected async runMessageCommands(msg: Message): Promise<void> {
    if (msg.content == null || msg.content.trim() === "") {
      // Ignore messages without text (e.g. images, embeds, etc.)
      return;
    }

    const prefix = await this.guildConfig.get("prefix", "!");

    const matchedCommands = this.commands.findCommandsInString(
      msg.content,
      prefix
    );

    // Run each matching command sequentially
    for (const command of matchedCommands) {
      if (
        msg.channel instanceof PrivateChannel &&
        !command.commandDefinition.options.allowDMs
      ) {
        return;
      }

      if (!(msg.channel instanceof GuildChannel)) {
        return;
      }

      // Run command permission checks
      if (!await this.isCommandAllowed(msg, command.commandDefinition)) {
        continue;
      }

      // Run custom filters, if any
      if (command.commandDefinition.options.filters) {
        for (const filterFn of command.commandDefinition.options.filters) {
          if (!await Promise.resolve(filterFn(msg, command))) {
            continue;
          }
        }
      }

      await command.commandDefinition.handler(msg, command.args, command);
    }
  }

  /**
   * Since by default direct messages are ignored by BasePlugin::on,
   * we need a special function to add listeners for direct messages
   */
  protected onDirectMessage(listener: CallbackFunctionVariadic): () => void {
    if (!this.eventHandlers.has("messageCreate")) {
      this.eventHandlers.set("messageCreate", []);
    }

    const wrappedListener = (msg: Message) => {
      if (!(msg.channel instanceof PrivateChannel)) {
        return;
      }

      listener(msg);
    };

    this.bot.on("messageCreate", wrappedListener);
    this.eventHandlers.get("messageCreate").push(wrappedListener);

    // Return a function to clear the listener
    const removeListener = () => {
      this.off("messageCreate", wrappedListener);
    };

    return removeListener;
  }
}
