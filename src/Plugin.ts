import {
  Channel,
  Client,
  DMChannel,
  GroupDMChannel,
  Guild,
  GuildChannel,
  GuildMember,
  Message,
  User
} from "discord.js";
const at = require("lodash.at");

import { CommandManager, IMatchedCommand, MissingArgumentError } from "./CommandManager";
import { ICommandPermissions, IPermissionLevels, IPluginPermissions } from "./ConfigInterfaces";
import { IConfigProvider } from "./IConfigProvider";
import {
  CallbackFunctionVariadic,
  errorEmbed,
  eventToChannel,
  eventToGuild,
  eventToMessage,
  eventToUser,
  IArbitraryObj
} from "./utils";
import { getDefaultPrefix, maybeRunCommand } from "./commandUtils";
import { Knub } from "./Knub";
import { checkBasicPermissions } from "./permissionUtils";

/**
 * If you'd like to use Knub as just a plugin loader, but not use any of the other functionality
 * provided by the main Plugin class, extending this class ensures compatibility.
 */
export class BarePlugin {
  public guildId: string;
  public guild: Guild;

  public pluginName: string; // Internal name for the plugin

  protected bot: Client;
  protected guildConfig: IConfigProvider;
  protected pluginConfig: IConfigProvider;
  protected runtimeConfig: any;

  protected knub: Knub;

  constructor(
    bot: Client,
    guildId: string,
    guildConfig: IConfigProvider,
    pluginConfig: IConfigProvider,
    pluginName: string,
    knub: Knub,
    runtimeConfig: any
  ) {
    this.bot = bot;
    this.guildId = guildId;
    this.guildConfig = guildConfig;
    this.pluginConfig = pluginConfig;
    this.pluginName = pluginName;
    this.runtimeConfig = runtimeConfig;

    this.knub = knub;

    this.guild = this.bot.guilds.get(this.guildId);
  }
}

/**
 * The base class for Knub plugins. Contains functionality for guild and plugin configuration,
 * guild specific commands, and guild specific event listeners.
 * Commands can also be registered with the exported @command decorator.
 * Event listeners can also be registered with the exported @onEvent decorator.
 */
export class Plugin extends BarePlugin {
  // Plugin name and description for e.g. dashboards
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
    knub: Knub,
    runtimeConfig: any
  ) {
    super(bot, guildId, guildConfig, pluginConfig, pluginName, knub, runtimeConfig);

    this.commands = new CommandManager();
    this.eventHandlers = new Map();
    this.registerCommandMessageListeners();
  }

  /**
   * Run plugin-defined onLoad() function and load commands/event listeners registered with decorators
   */
  public async runLoad(): Promise<any> {
    await Promise.resolve(this.onLoad());

    // Have to do this to access class methods
    const nonEnumerableProps = Object.getOwnPropertyNames(this.constructor.prototype);
    const enumerableProps = Object.keys(this);
    const props = [...nonEnumerableProps, ...enumerableProps];

    for (const prop of props) {
      const value = this[prop];
      if (typeof value !== "function") {
        continue;
      }

      // Command handlers
      const metaCommand = Reflect.getMetadata("command", this, prop);
      if (metaCommand) {
        this.commands.add(metaCommand.command, metaCommand.parameters, value.bind(this), metaCommand.options);
      }

      // Event listeners
      const event = Reflect.getMetadata("event", this, prop);
      if (event) {
        this.on(event.eventName, value.bind(this), event.restrict || undefined, event.ignoreSelf || undefined);
      }
    }
  }

  /**
   * Clear event handlers and run plugin-defined onUnload() function
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
  protected getDefaultPermissions(): IPluginPermissions | Promise<IPluginPermissions> {
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

    const levels: IPermissionLevels = await this.guildConfig.get(`permissions.levels`, {});

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
    const permissions: IPluginPermissions = Object.assign({}, defaultPermissions, configPermissions);

    // Check basic permissions
    if (!checkBasicPermissions(permissions, msg)) {
      return false;
    }

    // Check level-based permissions
    if (msg.member && permissions.level && (await this.getMemberLevel(msg.member)) < permissions.level) {
      return false;
    }

    return true;
  }

  /**
   * Checks the given message's channel and author and compares them to the command's permissions
   * to determine whether to run the command
   */
  protected async isCommandAllowed(msg: Message, command: IMatchedCommand): Promise<boolean> {
    const defaultPermissions = command.commandDefinition.options.permissions || {};
    const configPermissions: ICommandPermissions = await this.guildConfig.get(
      `permissions.plugins.${this.pluginName}.commands.${command.name}`,
      {}
    );
    const permissions: ICommandPermissions = Object.assign({}, defaultPermissions, configPermissions);

    // Check basic permissions
    if (!checkBasicPermissions(permissions, msg)) {
      return false;
    }

    // Check level-based permissions
    if (permissions.level && (await this.getMemberLevel(msg.member)) < permissions.level) {
      return false;
    }

    return true;
  }

  /**
   * Adds a guild-specific event listener for the given event
   */
  protected on(
    eventName: string,
    listener: CallbackFunctionVariadic,
    restrict: string = "guild",
    ignoreSelf: boolean = true
  ): () => void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }

    // Create a wrapper for the listener that checks:
    // 1) That the event matches the restrict param (guild/dm/group)
    // 2) That we ignore our own events if ignoreSelf is true
    // 3) That the event's guild (if present) matches this plugin's guild
    // 4) If the event has a message, that the message author has the permissions to trigger events
    const wrappedListener = async (...args: any[]) => {
      const guild = eventToGuild[eventName] ? eventToGuild[eventName](...args) : null;
      const user = eventToUser[eventName] ? eventToUser[eventName](...args) : null;
      const channel = eventToChannel[eventName] ? eventToChannel[eventName](...args) : null;
      const message = eventToMessage[eventName] ? eventToMessage[eventName](...args) : null;

      // Restrictions
      if (restrict === "dm" && !(channel instanceof DMChannel)) return;
      if (restrict === "guild" && !guild) return;
      if (restrict === "group" && !(channel instanceof GroupDMChannel)) return;

      // Ignore self
      if (ignoreSelf && user === this.bot.user) return;

      // Guild check
      if (guild && guild.id !== this.guildId) return;

      // Permission check
      if (message && !await this.isPluginAllowed(message)) return;

      // Call the original listener
      listener(...args);
    };

    // The listener is registered on both the DJS client and our own Map that we use to unregister listeners on unload
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
   * Runs all matching commands in the message
   */
  protected async runMessageCommands(msg: Message): Promise<void> {
    // Ignore messages without text (e.g. images, embeds, etc.)
    if (msg.content == null || msg.content.trim() === "") {
      return;
    }

    const prefix = await this.guildConfig.get("prefix", getDefaultPrefix(this.bot));

    const { commands: matchedCommands, errors } = this.commands.findCommandsInString(msg.content, prefix);

    if (matchedCommands.length === 0 && errors.length > 0) {
      const firstError = errors[0];
      if (firstError instanceof MissingArgumentError) {
        msg.channel.send("", errorEmbed(`Missing argument \`${firstError.arg.name}\``));
      }
      return;
    }

    // Run each matching command sequentially
    for (const command of matchedCommands) {
      // Check permissions
      if (!await this.isCommandAllowed(msg, command)) {
        continue;
      }

      // Run the command
      try {
        maybeRunCommand(command, msg);
      } catch (e) {
        msg.channel.send("", errorEmbed(e.message));
        continue;
      }
    }
  }
}
