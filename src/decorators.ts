import { logger } from "./logger";
import { CommandConfig, Parameter, parseParameters } from "knub-command-manager";
import { createCommandTriggerRegexp, ICommandContext, ICommandExtraData } from "./commandUtils";

export interface ICommandDecoratorData {
  trigger: RegExp;
  parameters: Parameter[];
  config: CommandConfig<any, ICommandExtraData>;
}

export interface IEventDecoratorData {
  eventName: string;
  restrict: string;
  ignoreSelf: boolean;
  requiredPermission: string;
  locks: string | string[];
}

export interface IPermissionDecoratorData {
  permission: string;
}

export interface ILockDecoratorData {
  locks: string | string[];
}

export interface ICooldownDecoratorData {
  time: number;
  permission: string;
}

function applyCooldownToCommand(commandData: ICommandDecoratorData, cooldown: ICooldownDecoratorData) {
  commandData.config.extra.cooldown = cooldown.time;
  commandData.config.extra.cooldownPermission = cooldown.permission;
}

function applyRequiredPermissionToCommand(
  commandData: ICommandDecoratorData,
  permissionData: IPermissionDecoratorData
) {
  commandData.config.extra.requiredPermission = permissionData.permission;
}

function applyRequiredPermissionToEvent(eventData: IEventDecoratorData, permissionData: IPermissionDecoratorData) {
  eventData.requiredPermission = permissionData.permission;
}

function applyLockToCommand(commandData: ICommandDecoratorData, lockData: ILockDecoratorData) {
  commandData.config.extra.locks = lockData.locks;
}

function applyLockToEvent(eventData: IEventDecoratorData, lockData: ILockDecoratorData) {
  eventData.locks = lockData.locks;
}

/**
 * PLUGINS: Turn a class method into a command handler
 */
function CommandDecorator(
  trigger: string | RegExp,
  parameters: string | Parameter[] = [],
  config: CommandConfig<ICommandContext, ICommandExtraData> = {}
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!Reflect.hasMetadata("commands", target, propertyKey)) {
      Reflect.defineMetadata("commands", [], target, propertyKey);
    }

    const commands: ICommandDecoratorData[] = Reflect.getMetadata("commands", target, propertyKey);

    const finalTrigger = createCommandTriggerRegexp(trigger);
    const finalParameters = typeof parameters === "string" ? parseParameters(parameters) : parameters;

    config.extra = config.extra || {};

    const commandData: ICommandDecoratorData = {
      trigger: finalTrigger,
      parameters: finalParameters,
      config
    };

    // Apply existing cooldowns
    const cooldownData: ICooldownDecoratorData = Reflect.getMetadata("cooldown", target, propertyKey);
    if (cooldownData) applyCooldownToCommand(commandData, cooldownData);

    // Apply existing permission requirements
    const permissionData: IPermissionDecoratorData = Reflect.getMetadata("requiredPermission", target, propertyKey);
    if (permissionData) applyRequiredPermissionToCommand(commandData, permissionData);

    // Apply existing locks
    const lockData: ILockDecoratorData = Reflect.getMetadata("locks", target, propertyKey);
    if (lockData) applyLockToCommand(commandData, lockData);

    commands.push(commandData);
  };
}

/**
 * PLUGINS: Turn a class method into an event listener
 */
function OnEventDecorator(
  eventName: string,
  restrict?: string,
  ignoreSelf?: boolean,
  requiredPermission?: string,
  locks: string | string[] = []
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!Reflect.hasMetadata("events", target, propertyKey)) {
      Reflect.defineMetadata("events", [], target, propertyKey);
    }

    const events: IEventDecoratorData[] = Reflect.getMetadata("events", target, propertyKey) || [];
    const eventData: IEventDecoratorData = {
      eventName,
      restrict,
      ignoreSelf,
      requiredPermission,
      locks
    };

    // Apply existing permission requirements
    const permissionData: IPermissionDecoratorData = Reflect.getMetadata("requiredPermission", target, propertyKey);
    if (permissionData) applyRequiredPermissionToEvent(eventData, permissionData);

    // Apply existing locks
    const lockData: ILockDecoratorData = Reflect.getMetadata("locks", target, propertyKey);
    if (lockData) applyLockToEvent(eventData, lockData);

    events.push(eventData);
  };
}

/**
 * PLUGINS: Augments command handlers and event listeners by adding a permission requirement
 */
function PermissionDecorator(permission: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const permissionData: IPermissionDecoratorData = {
      permission
    };
    Reflect.defineMetadata("requiredPermission", permissionData, target, propertyKey);

    // Apply to existing commands
    const commands: ICommandDecoratorData[] = Reflect.getMetadata("commands", target, propertyKey) || [];
    commands.forEach(cmd => applyRequiredPermissionToCommand(cmd, permissionData));

    // Apply to existing events
    const events: IEventDecoratorData[] = Reflect.getMetadata("events", target, propertyKey) || [];
    events.forEach(ev => applyRequiredPermissionToEvent(ev, permissionData));
  };
}

/**
 * PLUGINS: Specify which locks the command handler or event listener should wait for and lock during its execution
 */
function LockDecorator(locks: string | string[]) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const lockData: ILockDecoratorData = { locks };
    Reflect.defineMetadata("locks", lockData, target, propertyKey);

    // Apply to existing commands
    const commands: ICommandDecoratorData[] = Reflect.getMetadata("commands", target, propertyKey) || [];
    commands.forEach(cmd => applyLockToCommand(cmd, lockData));

    // Apply to existing events
    const events: IEventDecoratorData[] = Reflect.getMetadata("events", target, propertyKey) || [];
    events.forEach(ev => applyLockToEvent(ev, lockData));
  };
}

/**
 * PLUGINS: Specify a cooldown for a command
 */
function CooldownDecorator(time: number, permission: string = null) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const cooldownData: ICooldownDecoratorData = {
      time,
      permission
    };
    Reflect.defineMetadata("cooldown", cooldownData, target, propertyKey);

    // Apply to existing commands
    const commands: ICommandDecoratorData[] = Reflect.getMetadata("commands", target, propertyKey) || [];
    commands.forEach(cmd => applyCooldownToCommand(cmd, cooldownData));
  };
}

export default {
  command: CommandDecorator,
  event: OnEventDecorator,
  permission: PermissionDecorator,
  lock: LockDecorator,
  cooldown: CooldownDecorator
};
