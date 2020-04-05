import { deprecationWarning, logger } from "./logger";
import { ICommandConfig, IParameter, parseParameters, TParseableSignature } from "knub-command-manager";
import { CommandContext, eventArgsToCommandArgs, PluginCommandConfig } from "./commandUtils";
import {
  chainMiddleware,
  requirePermission,
  cooldown as cooldownMiddleware,
  lock as lockMiddleware,
  onlyDM as onlyDMMiddleware,
  onlyGroup as onlyGroupMiddleware,
  onlyPluginGuild as onlyPluginGuildMiddleware,
  EventMiddleware
} from "./pluginEventMiddleware";
import { OnOpts } from "./PluginEventManager";
import { noop } from "./utils";

export interface ILegacyCommandDecoratorData {
  trigger: string;
  parameters: TParseableSignature;
  config: PluginCommandConfig;
  _prop: string;
}

export interface ICommandDecoratorData {
  trigger: string;
  parameters: IParameter[];
  config: PluginCommandConfig;
  onOpts?: OnOpts;
  _prop: string;
  _matcherMiddleware: EventMiddleware;
}

export interface ILegacyEventDecoratorData {
  eventName: string;
  restrict: string;
  ignoreSelf: boolean;
  requiredPermission: string;
  locks: string | string[];
  _prop: string;
}

export interface IEventDecoratorData {
  eventName: string;
  opts?: OnOpts;
  _prop: string;
}

export const KEY_LEGACY_COMMANDS = Symbol("legacyCommands");
export const KEY_COMMANDS = Symbol("commands");

export const KEY_LEGACY_EVENTS = Symbol("legacyEvents");
export const KEY_EVENTS = Symbol("events");

export const KEY_PARAMETER_CONVERTER = Symbol("parameterModifier");

const noopParameterConverter = function(_targetFn, ...args) {
  return _targetFn.call(this, ...args);
};

function applyFilter(target, propertyKey, fn: EventMiddleware) {
  // If not added yet, add an editable wrapper for the final call to the actual
  // function that can be replaced by the cmd() decorator to convert event handler
  // parameters to command handler parameters
  if (!Reflect.hasMetadata(KEY_PARAMETER_CONVERTER, target, propertyKey)) {
    const data = {
      // Default no-op wrapper
      wrapper: noopParameterConverter
    };
    Reflect.defineMetadata(KEY_PARAMETER_CONVERTER, data, target, propertyKey);

    const targetFn = target[propertyKey];
    const callViaParameterConverter = function(...args) {
      return data.wrapper.call(this, targetFn, ...args);
    };
    target[propertyKey] = callViaParameterConverter;
  }

  // Apply the middleware
  target[propertyKey] = chainMiddleware([fn, target[propertyKey]]);
}

/**
 * PLUGINS: Apply a filter (middleware) on this method, which is run before the actual function
 */
export function filter(fn: EventMiddleware) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    applyFilter(target, propertyKey, fn);
  };
}

/**
 * @deprecated Use cmd() decorator instead
 */
export function command(trigger: string, parameters: string | IParameter[] = [], config: PluginCommandConfig = {}) {
  deprecationWarning("The command() decorator", "Use cmd() decorator instead.");

  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!Reflect.hasMetadata(KEY_LEGACY_COMMANDS, target, propertyKey)) {
      Reflect.defineMetadata(KEY_LEGACY_COMMANDS, [], target, propertyKey);
    }

    const commands: ILegacyCommandDecoratorData[] = Reflect.getMetadata(KEY_LEGACY_COMMANDS, target, propertyKey);

    const finalParameters = typeof parameters === "string" ? parseParameters(parameters) : parameters;

    const commandData: ILegacyCommandDecoratorData = {
      trigger,
      parameters: finalParameters,
      config,
      _prop: propertyKey
    };

    commands.push(commandData);
  };
}

/**
 * Register a plugin method as a command
 *
 * Shortcut for:
 * 1. Create command in the plugin's command manager via this.commands.create().
 *    This returns a command matching middleware ("matchCommand").
 * 2. Apply middleware: [
 *        ...pre command matching middleware,
 *        matchCommand,
 *        ...post command matching middleware,
 *        eventArgsToCommandArgs(method)
 *    ]
 * 3. Add the method as an event listener for "messageCreate" via this.events.on()
 */
export function cmd(
  trigger: string,
  parameters: TParseableSignature = [],
  config: PluginCommandConfig = {},
  onOpts?: OnOpts
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    // Save metadata to create the command once the plugin loads
    if (!Reflect.hasMetadata(KEY_COMMANDS, target, propertyKey)) {
      Reflect.defineMetadata(KEY_COMMANDS, [], target, propertyKey);
    }

    const commands: ICommandDecoratorData[] = Reflect.getMetadata(KEY_COMMANDS, target, propertyKey);

    const finalParameters = typeof parameters === "string" ? parseParameters(parameters) : parameters;

    const commandData: ICommandDecoratorData = {
      trigger,
      parameters: finalParameters,
      config,
      onOpts,
      _prop: propertyKey,
      _matcherMiddleware: noop
    };
    commands.push(commandData);

    // Add a placeholder middleware to match the command.
    // This will be replaced with the real command matching middleware when the plugin loads.
    const callCommandMatcherMiddleware: EventMiddleware = (...args) => {
      return commandData._matcherMiddleware(...args);
    };

    applyFilter(target, propertyKey, callCommandMatcherMiddleware);

    // Set parameter converter to convert messageCreate event args to command handler args
    if (Reflect.hasMetadata(KEY_PARAMETER_CONVERTER, target, propertyKey)) {
      const converterData = Reflect.getMetadata(KEY_PARAMETER_CONVERTER, target, propertyKey);
      converterData.wrapper = eventArgsToCommandArgs;
    }

    // Add a messageCreate listener for the command
    if (!Reflect.hasMetadata(KEY_EVENTS, target, propertyKey)) {
      Reflect.defineMetadata(KEY_EVENTS, [], target, propertyKey);
    }

    const events: IEventDecoratorData[] = Reflect.getMetadata(KEY_EVENTS, target, propertyKey);
    const eventData: IEventDecoratorData = {
      eventName: "messageCreate",
      opts: onOpts,
      _prop: propertyKey
    };
    events.push(eventData);
  };
}

/**
 * @deprecated Use ev() decorator instead
 */
export function event(
  eventName: string,
  restrict?: string,
  ignoreSelf?: boolean,
  requiredPermission?: string,
  locks: string | string[] = []
) {
  deprecationWarning("The event() decorator", "Use ev() decorator instead.");

  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!Reflect.hasMetadata(KEY_LEGACY_EVENTS, target, propertyKey)) {
      Reflect.defineMetadata(KEY_LEGACY_EVENTS, [], target, propertyKey);
    }

    const events: ILegacyEventDecoratorData[] = Reflect.getMetadata(KEY_LEGACY_EVENTS, target, propertyKey);
    const eventData: ILegacyEventDecoratorData = {
      eventName,
      restrict,
      ignoreSelf,
      requiredPermission,
      locks,
      _prop: propertyKey
    };

    events.push(eventData);
  };
}

/**
 * Register a plugin method as an event listener
 *
 * Shortcut for registering the method as an event handler via this.events.on()
 */
export function ev(eventName: string, opts?: OnOpts) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!Reflect.hasMetadata(KEY_EVENTS, target, propertyKey)) {
      Reflect.defineMetadata(KEY_EVENTS, [], target, propertyKey);
    }

    const events: IEventDecoratorData[] = Reflect.getMetadata(KEY_EVENTS, target, propertyKey);
    const eventData: IEventDecoratorData = {
      eventName,
      opts,
      _prop: propertyKey
    };

    events.push(eventData);
  };
}

/**
 * PLUGINS: Augments command handlers and event listeners by adding a permission requirement
 */
export function permission(permission: string) {
  // tslint:disable-line:no-shadowed-variable
  return filter(requirePermission(permission));
}

/**
 * PLUGINS: Specify which locks the command handler or event listener should wait for and lock during its execution
 */
export function lock(locks: string | string[]) {
  return filter(lockMiddleware(locks));
}

/**
 * PLUGINS: Specify a per-user cooldown for a command or event handler
 */
export function cooldown(time: number, permission: string = null) {
  // tslint:disable-line:no-shadowed-variable
  return filter(cooldownMiddleware(time, permission));
}

/**
 * PLUGINS: Run this event handler only in DMs
 */
export function onlyDM() {
  return filter(onlyDMMiddleware());
}

/**
 * PLUGINS: Run this event handler only in group chats
 */
export function onlyGroup() {
  return filter(onlyGroupMiddleware());
}

/**
 * PLUGINS: Run this event handler only in the guild the plugin is loaded in
 */
export function onlyPluginGuild() {
  return filter(onlyPluginGuildMiddleware());
}
