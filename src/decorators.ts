import "reflect-metadata";
import { ICommandConfig, IParameter, parseParameters } from "knub-command-manager";
import { CommandContext, ICommandExtraData } from "./commands/commandUtils";
import { Plugin } from "./Plugin";
import { OnOpts } from "./events/PluginEventManager";
import { locks as locksFilter, requirePermission, cooldown as cooldownFilter } from "./events/eventFilters";
import { appendToPropertyMetadata } from "./decoratorUtils";
import { CommandBlueprint } from "./commands/CommandBlueprint";
import { EventListenerBlueprint } from "./events/EventListenerBlueprint";

export interface CooldownDecoratorData {
  time: number;
  permission: string;
}

function applyCooldownToCommand(commandData: CommandBlueprint, cooldown: CooldownDecoratorData) {
  commandData.config.extra = commandData.config.extra || {};
  commandData.config.extra.cooldown = cooldown.time;
  commandData.config.extra.cooldownPermission = cooldown.permission;
}

function applyCooldownToEvent(eventData: EventListenerBlueprint, cooldown: CooldownDecoratorData) {
  eventData.opts = eventData.opts || {};
  eventData.opts.filters = eventData.opts.filters || [];
  eventData.opts.filters.push(cooldownFilter(cooldown.time, cooldown.permission));
}

function applyRequiredPermissionToCommand(commandData: CommandBlueprint, permission: string) {
  commandData.config.extra = commandData.config.extra || {};
  commandData.config.extra.requiredPermission = permission;
}

function applyRequiredPermissionToEvent(eventData: EventListenerBlueprint, permission: string) {
  eventData.opts = eventData.opts || {};
  eventData.opts.filters = eventData.opts.filters || [];
  eventData.opts.filters.push(requirePermission(permission));
}

function applyLockToCommand(commandData: CommandBlueprint, locks: string | string[]) {
  commandData.config.extra = commandData.config.extra || {};
  commandData.config.extra.locks = locks;
}

function applyLockToEvent(eventData: EventListenerBlueprint, locks: string | string[]) {
  eventData.opts = eventData.opts || {};
  eventData.opts.filters = eventData.opts.filters || [];
  eventData.opts.filters.push(locksFilter(locks));
}

/**
 * PLUGINS: Turn a class method into a command handler
 */
function CommandDecorator(
  trigger: string,
  parameters: string | IParameter[] = [],
  config: ICommandConfig<CommandContext, ICommandExtraData> = {}
) {
  return (target: typeof Plugin.prototype, propertyKey: string) => {
    // Add command blueprint to the plugin's static commands array
    const blueprint = {
      trigger,
      parameters: typeof parameters === "string" ? parseParameters(parameters) : parameters,
      config,
      run: target[propertyKey],
    };

    appendToPropertyMetadata(target, propertyKey, "decoratorCommands", blueprint);

    // Apply existing cooldowns from decorators
    const cooldownData: CooldownDecoratorData = Reflect.getMetadata("decoratorCooldown", target, propertyKey);
    if (cooldownData) applyCooldownToCommand(blueprint, cooldownData);

    // Apply existing permission requirements from decorators
    const permission: string = Reflect.getMetadata("decoratorPermission", target, propertyKey);
    if (permission) applyRequiredPermissionToCommand(blueprint, permission);

    // Apply existing locks from decorators
    const locks: string | string[] = Reflect.getMetadata("decoratorLocks", target, propertyKey);
    if (locks) applyLockToCommand(blueprint, locks);
  };
}

/**
 * PLUGINS: Turn a class method into an event listener
 */
function OnEventDecorator(eventName: string, opts?: OnOpts) {
  return (target: typeof Plugin.prototype, propertyKey: string) => {
    // Add event listener blueprint to the plugin's static event listeners array
    const eventListenerBlueprint: EventListenerBlueprint = {
      event: eventName,
      listener: target[propertyKey],
      opts,
    };

    appendToPropertyMetadata(target, propertyKey, "decoratorEvents", eventListenerBlueprint);

    // Apply existing cooldowns from decorators
    const cooldownData: CooldownDecoratorData = Reflect.getMetadata("decoratorCooldown", target, propertyKey);
    if (cooldownData) applyCooldownToEvent(eventListenerBlueprint, cooldownData);

    // Apply existing permission requirements from decorators
    const permission: string = Reflect.getMetadata("decoratorPermission", target, propertyKey);
    if (permission) applyRequiredPermissionToEvent(eventListenerBlueprint, permission);

    // Apply existing locks from decorators
    const locks: string | string[] = Reflect.getMetadata("decoratorLocks", target, propertyKey);
    if (locks) applyLockToEvent(eventListenerBlueprint, locks);
  };
}

/**
 * PLUGINS: Augments command handlers and event listeners by adding a permission requirement
 */
function PermissionDecorator(permission: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata("decoratorPermission", permission, target, propertyKey);

    // Apply to existing commands
    const commands: CommandBlueprint[] = Reflect.getMetadata("decoratorCommands", target, propertyKey) || [];
    commands.forEach((cmd) => applyRequiredPermissionToCommand(cmd, permission));

    // Apply to existing events
    const events: EventListenerBlueprint[] = Reflect.getMetadata("decoratorEvents", target, propertyKey) || [];
    events.forEach((ev) => applyRequiredPermissionToEvent(ev, permission));
  };
}

/**
 * PLUGINS: Specify which locks the command handler or event listener should wait for and lock during its execution
 */
function LockDecorator(locks: string | string[]) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata("decoratorLocks", locks, target, propertyKey);

    // Apply to existing commands
    const commands: CommandBlueprint[] = Reflect.getMetadata("decoratorCommands", target, propertyKey) || [];
    commands.forEach((cmd) => applyLockToCommand(cmd, locks));

    // Apply to existing events
    const events: EventListenerBlueprint[] = Reflect.getMetadata("decoratorEvents", target, propertyKey) || [];
    events.forEach((ev) => applyLockToEvent(ev, locks));
  };
}

/**
 * PLUGINS: Specify a cooldown for a command
 */
function CooldownDecorator(timeMs: number, permission: string = null) {
  return (target: any, propertyKey: string) => {
    const cooldownData: CooldownDecoratorData = {
      time: timeMs,
      permission,
    };
    Reflect.defineMetadata("decoratorCooldown", cooldownData, target, propertyKey);

    // Apply to existing commands
    const commands: CommandBlueprint[] = Reflect.getMetadata("decoratorCommands", target, propertyKey) || [];
    commands.forEach((cmd) => applyCooldownToCommand(cmd, cooldownData));

    // Apply to existing events
    const events: EventListenerBlueprint[] = Reflect.getMetadata("decoratorEvents", target, propertyKey) || [];
    events.forEach((ev) => applyCooldownToEvent(ev, cooldownData));
  };
}

export {
  CommandDecorator as command,
  CommandDecorator as cmd,
  OnEventDecorator as event,
  OnEventDecorator as ev,
  PermissionDecorator as permission,
  LockDecorator as lock,
  CooldownDecorator as cooldown,
};
