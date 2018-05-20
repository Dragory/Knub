import { ICommandOptions, IParameter } from "./CommandManager";

/**
 * PLUGINS: Turn a class method into a command handler
 */
function CommandDecorator(
  command: string | RegExp,
  parameters: string | IParameter[] = [],
  options: ICommandOptions = {}
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata("command", { command, parameters, options, _prop: propertyKey }, target, propertyKey);
  };
}

/**
 * PLUGINS: Turn a class method into an event listener
 */
function OnEventDecorator(eventName: string, restrict: string = null, ignoreSelf: boolean = null) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata("event", { eventName, restrict, ignoreSelf, _prop: propertyKey }, target, propertyKey);
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

export default {
  command: CommandDecorator,
  event: OnEventDecorator,
  permission: PermissionDecorator
};
