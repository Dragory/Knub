import { ICommandConfig, IParameter } from "./CommandManager";

/**
 * PLUGINS: Turn a class method into a command handler
 */
function CommandDecorator(
  command: string | RegExp,
  parameters: string | IParameter[] = [],
  options: ICommandConfig = {}
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const commands = Reflect.getMetadata("commands", target, propertyKey) || [];
    commands.push({ command, parameters, options, _prop: propertyKey });
    Reflect.defineMetadata("commands", commands, target, propertyKey);
  };
}

/**
 * PLUGINS: Turn a class method into an event listener
 */
function OnEventDecorator(eventName: string, restrict: string = null, ignoreSelf: boolean = null) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const events = Reflect.getMetadata("events", target, propertyKey) || [];
    events.push({ eventName, restrict, ignoreSelf, _prop: propertyKey });
    Reflect.defineMetadata("events", events, target, propertyKey);
  };
}

/**
 * PLUGINS: Augments command handlers and event listeners by adding a permission requirement
 */
function PermissionDecorator(permission: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata("requiredPermission", { permission, _prop: propertyKey }, target, propertyKey);
  };
}

/**
 * PLUGINS: Turns the event listener/command into non-blocking
 */
function NonBlockingDecorator() {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata("blocking", false, target, propertyKey);
  };
}

export default {
  command: CommandDecorator,
  event: OnEventDecorator,
  permission: PermissionDecorator,
  nonBlocking: NonBlockingDecorator
};
