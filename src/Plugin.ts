import {
  Channel,
  Client,
  DMChannel,
  Guild,
  GuildChannel,
  GuildMember,
  Message,
  RichEmbed
} from "discord.js";
import * as winston from "winston";
const at = require("lodash.at");

import {
  CommandManager,
  IArgument,
  IArgumentMap,
  ICommandDefinition,
  IMatchedCommand,
  MissingArgumentError
} from "./CommandManager";
import {
  ICommandPermissions,
  IPermissionLevels,
  IPluginPermissions
} from "./ConfigInterfaces";
import { IConfigProvider } from "./IConfigProvider";
import { logger } from "./logger";
import { errorEmbed, getChannelId, getRoleId, getUserId } from "./utils";

export type CallbackFunctionVariadic = (...args: any[]) => void;

export interface IArbitraryObj {
  [key: string]: any;
}

/**
 * If you'd like to use Knub as just a plugin loader, but not use any of the other functionality
 * provided by the main Plugin class, extending this class ensures compatibility.
 */
export class BareClass {
  public guildId: string;

  protected bot: Client;
  protected guildConfig: IConfigProvider;
  protected pluginConfig: IConfigProvider;
  protected pluginName: string;
  protected parent: any;

  constructor(
    bot: Client,
    guildId: string,
    guildConfig: IConfigProvider,
    pluginConfig: IConfigProvider,
    pluginName: string,
    parent: any
  ) {
    this.bot = bot;
    this.guildId = guildId;
    this.guildConfig = guildConfig;
    this.pluginConfig = pluginConfig;
    this.pluginName = pluginName;
    this.parent = parent;
  }
}

/**
 * The base class for Knub plugins. Contains functionality for guild and plugin configuration, guild specific commands, and guild specific event listeners.
 * Commands can also be registered with the exported @command decorator.
 * Event listeners can also be registered with the exported @onEvent decorator.
 */
export class Plugin extends BareClass {
  /**
   * Basic plugin information
   */

  public name: string;
  public description: string;

  protected commands: CommandManager;
  protected eventHandlers: Map<string, any[]>;

  constructor(
    bot: Client,
    guildId: string,
    guildConfig: IConfigProvider,
    pluginConfig: IConfigProvider,
    pluginName: string,
    parent: any
  ) {
    super(bot, guildId, guildConfig, pluginConfig, pluginName, parent);

    this.commands = new CommandManager();
    this.eventHandlers = new Map();
    this.registerCommandMessageListeners();
  }

  /**
   * Run plugin-defined load() function and load commands/event listeners registered with decorators
   */
  public async runLoad(): Promise<any> {
    await Promise.resolve(this.onLoad());

    // Have to do this to access class methods
    const nonEnumerableProps = Object.getOwnPropertyNames(
      this.constructor.prototype
    );
    const enumerableProps = Object.keys(this);
    const props = [...nonEnumerableProps, ...enumerableProps];

    for (const prop of props) {
      const value = this[prop];
      if (typeof value !== "function") {
        continue;
      }

      // Command handlers
      const command = Reflect.getMetadata("command", this, prop);
      if (command) {
        this.commands.add(command.args[0], command.args[1] || [], value);
      }

      // Event listeners
      const event = Reflect.getMetadata("event", this, prop);
      if (event) {
        this.on(event.args[0], value);
      }
    }
  }

  /**
   * Clear event handlers and run plugin-defined unload() function
   */
  public runUnload(): Promise<any> {
    this.clearEventHandlers();
    return Promise.resolve(this.onUnload());
  }

  /**
   * Code to run when the plugin is loaded
   */
  protected onLoad(): any {
    // Implemented by plugin
  }

  /**
   * Code to run when the plugin is unloaded
   */
  protected onUnload(): any {
    // Implemented by plugin
  }

  /**
   * Registers the message listeners for commands
   */
  protected registerCommandMessageListeners(): void {
    this.on("message", this.runMessageCommands.bind(this));

    // Plugin::on ignores direct messages
    this.onDirectMessage(this.runMessageCommands.bind(this));
  }

  /**
   * Retrieve a plugin config value
   */
  protected async config(path: string, def: any = null) {
    let value: any;

    value = this.pluginConfig.get(path);
    if (value != null) {
      return value;
    }

    const defaultConfig = await this.getDefaultConfig();
    value = at(defaultConfig, [path])[0];
    if (value != null) {
      return value;
    }

    return def;
  }

  /**
   * Returns this plugin's default configuration
   */
  protected getDefaultConfig(): IArbitraryObj | Promise<IArbitraryObj> {
    // Implemented by plugin
    return {};
  }

  /**
   * Returns this plugin's default permissions
   */
  protected getDefaultPermissions():
    | IPluginPermissions
    | Promise<IPluginPermissions> {
    // Implemented by plugin
    return {};
  }

  /**
   * Returns the given member's permission level
   */
  protected async getMemberLevel(member: GuildMember): Promise<number> {
    if (member.guild.owner === member) {
      return 99999;
    }

    const levels: IPermissionLevels = await this.guildConfig.get(
      `permissions.levels`,
      {}
    );

    for (const id in levels) {
      if (member.id === id || member.roles.has(id)) {
        return levels[id];
      }
    }

    return 0;
  }

  /**
   * Checks the given message's channel and author to determine whether the plugin should react to it
   */
  protected async isPluginAllowed(msg: Message): Promise<boolean> {
    const defaultPermissions = this.getDefaultPermissions();
    const configPermissions: IPluginPermissions = await this.guildConfig.get(
      `permissions.plugins.${this.pluginName}`,
      {}
    );
    const permissions: IPluginPermissions = Object.assign(
      {},
      defaultPermissions,
      configPermissions
    );

    // Explicit channel IDs
    // If channels are specified, the command won't trigger outside of the specified channels, not even by admins
    if (
      permissions.channels &&
      permissions.channels.length &&
      !permissions.channels.includes(msg.channel.id)
    ) {
      return false;
    }

    if (
      permissions.exclude_channels &&
      permissions.exclude_channels.length &&
      permissions.exclude_channels.includes(msg.channel.id)
    ) {
      return false;
    }

    // Explicit user IDs
    if (
      permissions.users &&
      permissions.users.length &&
      permissions.users.includes(msg.author.id)
    ) {
      return true;
    }

    if (
      permissions.exclude_users &&
      permissions.exclude_users.length &&
      permissions.exclude_users.includes(msg.author.id)
    ) {
      return false;
    }

    // Explicit role IDs
    if (
      msg.member &&
      permissions.roles &&
      permissions.roles.length &&
      permissions.roles.some(role => msg.member.roles.has(role))
    ) {
      return true;
    }

    if (
      msg.member &&
      permissions.exclude_roles &&
      permissions.exclude_roles.length &&
      permissions.exclude_roles.some(role => msg.member.roles.has(role))
    ) {
      return false;
    }

    // Permission level
    if (
      permissions.level &&
      (await this.getMemberLevel(msg.member)) < permissions.level
    ) {
      return false;
    }

    return true;
  }

  /**
   * Checks the given message's channel and author and compares them to the command's permissions to determine whether to run the command
   */
  protected async isCommandAllowed(
    msg: Message,
    command: IMatchedCommand
  ): Promise<boolean> {
    const defaultPermissions =
      command.commandDefinition.options.permissions || {};
    const configPermissions: ICommandPermissions = await this.guildConfig.get(
      `permissions.plugins.${this.pluginName}.commands.${command.name}`,
      {}
    );
    const permissions: ICommandPermissions = Object.assign(
      {},
      defaultPermissions,
      configPermissions
    );

    // Explicit channel IDs
    // If channels are specified, the command won't trigger outside of the specified channels, not even by admins
    if (
      permissions.channels &&
      permissions.channels.length &&
      !permissions.channels.includes(msg.channel.id)
    ) {
      return false;
    }

    if (
      permissions.exclude_channels &&
      permissions.exclude_channels.length &&
      permissions.exclude_channels.includes(msg.channel.id)
    ) {
      return false;
    }

    // Explicit user IDs
    if (
      permissions.users &&
      permissions.users.length &&
      permissions.users.includes(msg.author.id)
    ) {
      return true;
    }

    if (
      permissions.exclude_users &&
      permissions.exclude_users.length &&
      permissions.exclude_users.includes(msg.author.id)
    ) {
      return false;
    }

    // Explicit role IDs
    if (
      msg.member &&
      permissions.roles &&
      permissions.roles.length &&
      permissions.roles.some(role => msg.member.roles.has(role))
    ) {
      return true;
    }

    if (
      msg.member &&
      permissions.exclude_roles &&
      permissions.exclude_roles.length &&
      permissions.exclude_roles.some(role => msg.member.roles.has(role))
    ) {
      return false;
    }

    // Permission level
    if (
      permissions.level &&
      (await this.getMemberLevel(msg.member)) < permissions.level
    ) {
      return false;
    }

    return true;
  }

  /**
   * Adds a guild-specific event listener for the given event
   */
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

      if (args[0] instanceof GuildChannel) {
        guild = args[0].guild;
      }

      if (args[0] instanceof Guild) {
        guild = args[0];
      }

      if (args[0] instanceof Message) {
        if (!(args[0].channel instanceof GuildChannel)) {
          return;
        }

        guild = args[0].channel.guild;
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

    // Actually register the listener on the discord.js client and store the listener
    // so we can automatically clear it when the plugin is deregistered
    this.bot.on(eventName, wrappedListener);
    this.eventHandlers.get(eventName).push(wrappedListener);

    // Return a function to clear the listener
    const removeListener = () => {
      this.off(eventName, wrappedListener);
    };

    return removeListener;
  }

  /**
   * Removes the given listener from the event
   */
  protected off(eventName: string, listener: CallbackFunctionVariadic): void {
    this.bot.removeListener(eventName, listener);

    if (this.eventHandlers.has(eventName)) {
      const thisEventNameHandlers = this.eventHandlers.get(eventName);
      thisEventNameHandlers.splice(thisEventNameHandlers.indexOf(listener), 1);
    }
  }

  /**
   * Clears all event listeners registered with on()
   */
  protected clearEventHandlers(): void {
    for (const [eventName, listeners] of this.eventHandlers) {
      listeners.forEach(listener => {
        this.bot.removeListener(eventName, listener);
      });
    }

    this.eventHandlers.clear();
  }

  /**
   * Converts the given command argument to the given type.
   * Allowed types include string, number, User, Member, Channel, Role
   */
  protected async convertArgType(
    value: any,
    type: string,
    msg: Message
  ): Promise<any> {
    if (type === "string") {
      return String(value);
    } else if (type === "number") {
      return parseFloat(value);
    } else if (type === "user") {
      const userId = getUserId(value);
      if (!userId) {
        throw new Error(`Could not convert ${value} to a user id`);
      }

      const user = this.bot.users.get(userId);
      if (!user) {
        throw new Error(`Could not convert user id ${userId} to a user`);
      }

      return user;
    } else if (type === "member") {
      if (!(msg.channel instanceof GuildChannel)) {
        throw new Error(`Type 'Member' can only be used in guilds`);
      }

      const userId = getUserId(value);
      if (!userId) {
        throw new Error(`Could not convert ${value} to a user id`);
      }

      const user = this.bot.users.get(userId);
      if (!user) {
        throw new Error(`Could not convert user id ${userId} to a user`);
      }

      const member =
        msg.guild.members.get(user.id) || (await msg.guild.fetchMember(user));
      if (!member) {
        throw new Error(`Could not convert user id ${userId} to a member`);
      }

      return member;
    } else if (type === "channel") {
      const channelId = getChannelId(value);
      if (!channelId) {
        throw new Error(`Could not convert ${value} to a channel id`);
      }

      const channel = this.bot.channels.get(channelId);
      if (!channel) {
        throw new Error(`Channel ${channelId} not found`);
      }

      return channel;
    } else if (type === "role") {
      if (!(msg.channel instanceof GuildChannel)) {
        throw new Error(`Type 'Role' can only be used in guilds`);
      }

      const roleId = getRoleId(value);
      if (!roleId) {
        throw new Error(`Could not convert ${value} to a role id`);
      }

      const role = msg.channel.guild.roles.get(roleId);
      if (!role) {
        throw new Error(`Could not convert ${roleId} to a Role`);
      }

      return role;
    } else {
      throw new Error(`Unknown type: ${type}`);
    }
  }

  /**
   * Runs all matching commands in the message
   */
  protected async runMessageCommands(msg: Message): Promise<void> {
    if (msg.content == null || msg.content.trim() === "") {
      // Ignore messages without text (e.g. images, embeds, etc.)
      return;
    }

    const prefix = await this.guildConfig.get("prefix", "!");

    const {
      commands: matchedCommands,
      errors
    } = this.commands.findCommandsInString(msg.content, prefix);

    if (matchedCommands.length === 0 && errors.length > 0) {
      const firstError = errors[0];
      if (firstError instanceof MissingArgumentError) {
        msg.channel.send(
          "",
          errorEmbed(`Missing argument \`${firstError.arg.name}\``)
        );
      }
      return;
    }

    // Run each matching command sequentially
    for (const command of matchedCommands) {
      if (
        msg.channel instanceof DMChannel &&
        !command.commandDefinition.options.allowDMs
      ) {
        continue;
      }

      if (!(msg.channel instanceof GuildChannel)) {
        continue;
      }

      // Run command permission checks
      if (!await this.isCommandAllowed(msg, command)) {
        continue;
      }

      // Convert arg types
      let hadInvalidArg = false;
      for (const argName in command.args) {
        const arg = command.args[argName];

        if (arg.value == null && !arg.parameter.required) {
          continue;
        }

        const type = arg.parameter.type.toLowerCase();

        try {
          if (Array.isArray(arg.value)) {
            for (const [i, value] of arg.value.entries()) {
              arg.value[i] = await this.convertArgType(arg.value[i], type, msg);
            }
          } else {
            arg.value = await this.convertArgType(arg.value, type, msg);
          }
        } catch (e) {
          const typeName = `${arg.parameter.type}${arg.parameter.rest
            ? "[]"
            : ""}`;
          msg.channel.send(
            "",
            errorEmbed(
              `Could not convert argument ${arg.parameter.name} to ${typeName}`
            )
          );
          hadInvalidArg = true;
          break;
        }
      }

      if (hadInvalidArg) {
        continue;
      }

      // Run custom filters, if any
      let filterFailed = false;
      if (command.commandDefinition.options.filters) {
        for (const filterFn of command.commandDefinition.options.filters) {
          if (!await Promise.resolve(filterFn(msg, command))) {
            filterFailed = true;
            break;
          }
        }
      }

      if (filterFailed) {
        continue;
      }

      const argsToPass: any = {};
      for (const name in command.args) {
        argsToPass[name] = command.args[name].value;
      }

      await command.commandDefinition.handler(msg, argsToPass, command);
    }
  }

  /**
   * Since by default direct messages are ignored by BasePlugin::on, we need a special function to add listeners for direct messages
   */
  protected onDirectMessage(listener: CallbackFunctionVariadic): () => void {
    if (!this.eventHandlers.has("message")) {
      this.eventHandlers.set("message", []);
    }

    const wrappedListener = (msg: Message) => {
      if (!(msg.channel instanceof DMChannel)) {
        return;
      }

      listener(msg);
    };

    this.bot.on("message", wrappedListener);
    this.eventHandlers.get("message").push(wrappedListener);

    // Return a function to clear the listener
    const removeListener = () => {
      this.off("message", wrappedListener);
    };

    return removeListener;
  }
}

/**
 * Decorator for turning a class method into a command handler
 */
export function command(...args: any[]) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(
      "command",
      { args, prop: propertyKey },
      target,
      propertyKey
    );
  };
}

/**
 * Decorator for turning a class method into an event listener
 */
export function onEvent(...args: any[]) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(
      "event",
      { args, prop: propertyKey },
      target,
      propertyKey
    );
  };
}
