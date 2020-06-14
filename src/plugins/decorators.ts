import "reflect-metadata";
import { TSignatureOrArray } from "../commands/commandUtils";
import { PluginClass } from "./PluginClass";
import { OnOpts } from "../events/PluginEventManager";
import { cooldown as cooldownFilter, locks as locksFilter, requirePermission } from "../events/eventFilters";
import { appendToPropertyMetadata } from "./decoratorUtils";
import { CommandBlueprint } from "../commands/CommandBlueprint";
import { EventListenerBlueprint } from "../events/EventListenerBlueprint";

export type SemiCommandBlueprint = Omit<CommandBlueprint<any, any>, "signature"> & {
  signature: CommandBlueprint<any, any>["signature"] | "string";
};

export interface CooldownDecoratorData {
  time: number;
  permission: string;
}

function applyCooldownToCommand(commandData: SemiCommandBlueprint, cooldown: CooldownDecoratorData) {
  commandData.cooldown = {
    amount: cooldown.time,
    permission: cooldown.permission,
  };
}

function applyCooldownToEvent(eventData: EventListenerBlueprint<any>, cooldown: CooldownDecoratorData) {
  eventData.opts = eventData.opts || {};
  eventData.opts.filters = eventData.opts.filters || [];
  eventData.opts.filters.push(cooldownFilter(cooldown.time, cooldown.permission));
}

function applyRequiredPermissionToCommand(commandData: SemiCommandBlueprint, permission: string) {
  commandData.permission = permission;
}

function applyRequiredPermissionToEvent(eventData: EventListenerBlueprint<any>, permission: string) {
  eventData.opts = eventData.opts || {};
  eventData.opts.filters = eventData.opts.filters || [];
  eventData.opts.filters.push(requirePermission(permission));
}

function applyLockToCommand(commandData: SemiCommandBlueprint, locks: string | string[]) {
  commandData.locks = locks;
}

function applyLockToEvent(eventData: EventListenerBlueprint<any>, locks: string | string[]) {
  eventData.opts = eventData.opts || {};
  eventData.opts.filters = eventData.opts.filters || [];
  eventData.opts.filters.push(locksFilter(locks));
}

/**
 * PLUGINS: Turn a class method into a command handler
 */
function CommandDecorator(
  trigger: string,
  signature: string | TSignatureOrArray<any> = [],
  rest?: Omit<SemiCommandBlueprint, "trigger" | "parameters" | "run">
) {
  return (target: typeof PluginClass.prototype, propertyKey: string) => {
    // Add command blueprint to the plugin's static commands array
    const blueprint = {
      ...rest,
      trigger,
      signature,
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
  return (target: typeof PluginClass.prototype, propertyKey: string) => {
    // Add event listener blueprint to the plugin's static event listeners array
    const eventListenerBlueprint: EventListenerBlueprint<any> = {
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
    const commands: SemiCommandBlueprint[] = Reflect.getMetadata("decoratorCommands", target, propertyKey) || [];
    commands.forEach((cmd) => applyRequiredPermissionToCommand(cmd, permission));

    // Apply to existing events
    const events: Array<EventListenerBlueprint<any>> =
      Reflect.getMetadata("decoratorEvents", target, propertyKey) || [];
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
    const commands: SemiCommandBlueprint[] = Reflect.getMetadata("decoratorCommands", target, propertyKey) || [];
    commands.forEach((cmd) => applyLockToCommand(cmd, locks));

    // Apply to existing events
    const events: Array<EventListenerBlueprint<any>> =
      Reflect.getMetadata("decoratorEvents", target, propertyKey) || [];
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
    const commands: SemiCommandBlueprint[] = Reflect.getMetadata("decoratorCommands", target, propertyKey) || [];
    commands.forEach((cmd) => applyCooldownToCommand(cmd, cooldownData));

    // Apply to existing events
    const events: Array<EventListenerBlueprint<any>> =
      Reflect.getMetadata("decoratorEvents", target, propertyKey) || [];
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
