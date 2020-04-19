import "reflect-metadata";
import { ICommandConfig, IParameter, parseParameters } from "knub-command-manager";
import { CommandBlueprint, CommandContext, ICommandExtraData } from "./commandUtils";
import { Plugin } from "./Plugin";
import { EventListenerBlueprint, OnOpts } from "./PluginEventManager";
import { locks as locksFilter, requirePermission } from "./eventFilters";

export interface CooldownDecoratorData {
  time: number;
  permission: string;
}

function applyCooldownToCommand(commandData: CommandBlueprint, cooldown: CooldownDecoratorData) {
  commandData.config.extra.cooldown = cooldown.time;
  commandData.config.extra.cooldownPermission = cooldown.permission;
}

function applyRequiredPermissionToCommand(commandData: CommandBlueprint, permission: string) {
  commandData.config.extra.requiredPermission = permission;
}

function applyRequiredPermissionToEvent(eventData: EventListenerBlueprint, permission: string) {
  eventData.opts = eventData.opts || {};
  eventData.opts.filters = eventData.opts.filters || [];
  eventData.opts.filters.push(requirePermission(permission));
}

function applyLockToCommand(commandData: CommandBlueprint, locks: string | string[]) {
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
      run: target[propertyKey]
    };

    target.commands = target.commands || [];
    target.commands.push(blueprint);

    // Add the blueprint to class metadata so we can apply other decorators to it later
    if (!Reflect.hasMetadata("decoratorCommands", target, propertyKey)) {
      Reflect.defineMetadata("decoratorCommands", [], target, propertyKey);
    }

    const decoratorCommands = Reflect.getMetadata("decoratorCommands", target, propertyKey);
    decoratorCommands.push(blueprint);

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
      opts
    };

    target.events = target.events || [];
    target.events.push(eventListenerBlueprint);

    // Add the blueprint to class metadata so we can apply other decorators to it later
    if (!Reflect.hasMetadata("decoratorEvents", target, propertyKey)) {
      Reflect.defineMetadata("decoratorEvents", [], target, propertyKey);
    }

    const decoratorEvents = Reflect.getMetadata("decoratorEvents", target, propertyKey);
    decoratorEvents.push(eventListenerBlueprint);

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
    Reflect.defineMetadata("requiredPermission", permission, target, propertyKey);

    // Apply to existing commands
    const commands: CommandBlueprint[] = Reflect.getMetadata("decoratorCommands", target, propertyKey) || [];
    commands.forEach(cmd => applyRequiredPermissionToCommand(cmd, permission));

    // Apply to existing events
    const events: EventListenerBlueprint[] = Reflect.getMetadata("decoratorEvents", target, propertyKey) || [];
    events.forEach(ev => applyRequiredPermissionToEvent(ev, permission));
  };
}

/**
 * PLUGINS: Specify which locks the command handler or event listener should wait for and lock during its execution
 */
function LockDecorator(locks: string | string[]) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata("locks", locks, target, propertyKey);

    // Apply to existing commands
    const commands: CommandBlueprint[] = Reflect.getMetadata("decoratorCommands", target, propertyKey) || [];
    commands.forEach(cmd => applyLockToCommand(cmd, locks));

    // Apply to existing events
    const events: EventListenerBlueprint[] = Reflect.getMetadata("decoratorEvents", target, propertyKey) || [];
    events.forEach(ev => applyLockToEvent(ev, locks));
  };
}

/**
 * PLUGINS: Specify a cooldown for a command
 */
function CooldownDecorator(time: number, permission: string = null) {
  return (target: any, propertyKey: string) => {
    const cooldownData: CooldownDecoratorData = {
      time,
      permission
    };
    Reflect.defineMetadata("cooldown", cooldownData, target, propertyKey);

    // Apply to existing commands
    const commands: CommandBlueprint[] = Reflect.getMetadata("decoratorCommands", target, propertyKey) || [];
    commands.forEach(cmd => applyCooldownToCommand(cmd, cooldownData));
  };
}

export {
  CommandDecorator as command,
  CommandDecorator as cmd,
  OnEventDecorator as event,
  OnEventDecorator as ev,
  PermissionDecorator as permission,
  LockDecorator as lock,
  CooldownDecorator as cooldown
};
