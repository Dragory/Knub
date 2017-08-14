import {
  Channel,
  Client,
  Guild,
  GuildChannel,
  Member,
  Message,
  PrivateChannel
} from "eris";
import at from "lodash.at";
import * as winston from "winston";

import {
  CommandManager,
  IArgument,
  IArgumentMap,
  ICommandDefinition,
  IMatchedCommand
} from "./CommandManager";
import {
  ICommandPermissions,
  IPermissionLevels,
  IPluginPermissions
} from "./ConfigInterfaces";
import { IConfigProvider } from "./IConfigProvider";
import { getChannelId, getRoleId, getUserId } from "./utils";

export type CallbackFunctionVariadic = (...args: any[]) => void;

export interface IArbitraryObj {
  [key: string]: any;
}

export class Plugin {
  public name: string;
  public description: string;
  public guildId: string;

  protected bot: Client;
  protected guildConfig: IConfigProvider;
  protected pluginConfig: IConfigProvider;
  protected pluginName: string;
  protected logger: winston.LoggerInstance;
  protected parent: any;

  protected commands: CommandManager;

  private eventHandlers: Map<string, any[]>;

  constructor(
    bot: Client,
    guildId: string,
    guildConfig: IConfigProvider,
    pluginConfig: IConfigProvider,
    pluginName: string,
    logger: winston.LoggerInstance,
    parent: any
  ) {
    this.bot = bot;
    this.guildId = guildId;
    this.guildConfig = guildConfig;
    this.pluginConfig = pluginConfig;
    this.pluginName = pluginName;
    this.logger = logger;
    this.parent = parent;

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

  protected getDefaultConfig(): IArbitraryObj | Promise<IArbitraryObj> {
    return {};
  }

  protected getDefaultPermissions():
    | IPluginPermissions
    | Promise<IPluginPermissions> {
    return {};
  }

  protected async getMemberLevel(member: Member): Promise<number> {
    const levels: IPermissionLevels = await this.guildConfig.get(
      `permissions.levels`,
      {}
    );

    for (const id in levels) {
      if (member.id === id || member.roles.includes(id)) {
        return levels[id];
      }
    }

    return 0;
  }

  protected async isPluginAllowed(msg: Message): Promise<boolean> {
    const defaultPermissions = this.getDefaultPermissions();
    const configPermissions: IPluginPermissions = await this.guildConfig.get(
      `permissions.plugins.${this.name}`,
      {}
    );
    const permissions: IPluginPermissions = Object.assign(
      {},
      defaultPermissions,
      configPermissions
    );

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

    if (
      permissions.level &&
      (await this.getMemberLevel(msg.member)) < permissions.level
    ) {
      return false;
    }

    return true;
  }

  protected async isCommandAllowed(
    msg: Message,
    command: IMatchedCommand
  ): Promise<boolean> {
    const defaultPermissions =
      command.commandDefinition.options.permissions || {};
    const configPermissions: ICommandPermissions = await this.guildConfig.get(
      `permissions.plugins.${this.name}.${command.name}`,
      {}
    );
    const permissions: ICommandPermissions = Object.assign(
      {},
      defaultPermissions,
      configPermissions
    );

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

    if (
      permissions.level &&
      (await this.getMemberLevel(msg.member)) < permissions.level
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

  protected convertArgType(arg: IArgument, msg: Message): any {
    const type = arg.parameter.type.toLowerCase();

    if (type === "string") {
      return String(arg.value);
    } else if (type === "number") {
      return parseFloat(arg.value);
    } else if (type === "user") {
      const userId = getUserId(arg.value);
      if (!userId) {
        throw new Error(`Could not convert ${arg.value} to a user id`);
      }
    } else if (type === "member") {
      if (!(msg.channel instanceof GuildChannel)) {
        throw new Error(`Type 'Member' can only be used in guilds`);
      }

      const userId = getUserId(arg.value);
      if (!userId) {
        throw new Error(`Could not convert ${arg.value} to a user id`);
      }

      const member = msg.channel.guild.members.get(userId);
      if (!member) {
        throw new Error(`Could not convert user id ${userId} to a member`);
      }

      return member;
    } else if (type === "channel") {
      const channelId = getChannelId(arg.value);
      if (!channelId) {
        throw new Error(`Could not convert ${arg.value} to a channel id`);
      }

      return this.bot.getChannel(channelId);
    } else if (type === "role") {
      if (!(msg.channel instanceof GuildChannel)) {
        throw new Error(`Type 'Role' can only be used in guilds`);
      }

      const roleId = getRoleId(arg.value);
      if (!roleId) {
        throw new Error(`Could not convert ${arg.value} to a role id`);
      }

      return msg.channel.guild.roles.get(roleId);
    } else {
      throw new Error(`Unknown type: ${type}`);
    }
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
        try {
          if (Array.isArray(arg.value)) {
            arg.value = arg.value.map(a => this.convertArgType(a, msg));
          } else {
            arg.value = this.convertArgType(arg, msg);
          }
        } catch (e) {
          winston.warn(String(e));
          msg.channel.createMessage({
            embed: {
              description: `Could not convert argument \`${argName}\` to \`${arg
                .parameter.type}${arg.parameter.rest ? "[]" : ""}\``,
              color: parseInt("ee4400", 16)
            }
          });
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
