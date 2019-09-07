import { createCommandTriggerRegexp, ICommandConfig, IParameter, parseParameterString } from "./CommandManager";
import { logger } from "./logger";

export interface ICommandDecoratorData {
  trigger: RegExp;
  parameters: IParameter[];
  config: ICommandConfig;
  _prop: string;
}

export interface IEventDecoratorData {
  eventName: string;
  restrict: string;
  ignoreSelf: boolean;
  requiredPermission: string;
  locks: string | string[];
  _prop: string;
}

/**
 * PLUGINS: Turn a class method into a command handler
 */
function CommandDecorator(
  trigger: string | RegExp,
  parameters: string | IParameter[] = [],
  config: ICommandConfig = {}
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!Reflect.hasMetadata("commands", target, propertyKey)) {
      Reflect.defineMetadata("commands", [], target, propertyKey);
    }

    const commands: ICommandDecoratorData[] = Reflect.getMetadata("commands", target, propertyKey);

    const finalTrigger = createCommandTriggerRegexp(trigger);
    const finalParameters = typeof parameters === "string" ? parseParameterString(parameters) : parameters;

    commands.push({
      trigger: finalTrigger,
      parameters: finalParameters,
      config,
      _prop: propertyKey
    });
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
    events.push({
      eventName,
      restrict,
      ignoreSelf,
      requiredPermission,
      locks,
      _prop: propertyKey
    });
  };
}

/**
 * PLUGINS: Augments command handlers and event listeners by adding a permission requirement.
 * Must be used after the command or event decorator!
 */
function PermissionDecorator(permission: string, suppressWarnings = false) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (Reflect.hasMetadata("commands", target, propertyKey)) {
      const commands: ICommandDecoratorData[] = Reflect.getMetadata("commands", target, propertyKey);
      for (const command of commands) {
        command.config.requiredPermission = permission;
      }
    }

    if (Reflect.hasMetadata("events", target, propertyKey)) {
      const events: IEventDecoratorData[] = Reflect.getMetadata("events", target, propertyKey);
      for (const event of events) {
        event.requiredPermission = permission;
      }
    }

    if (
      !suppressWarnings &&
      (!Reflect.hasMetadata("commands", target, propertyKey) || !Reflect.hasMetadata("events", target, propertyKey))
    ) {
      logger.warn(
        "PermissionDecorator used without prior CommandDecorator or EventDecorator (you can suppress this warning with the second argument to PermissionDecorator)"
      );
    }

    Reflect.defineMetadata("requiredPermission", { permission, _prop: propertyKey }, target, propertyKey);
  };
}

/**
 * PLUGINS: Specify which locks the listener should wait for, and lock during its execution
 */
function LockDecorator(locks: string | string[], suppressWarnings = false) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (Reflect.hasMetadata("commands", target, propertyKey)) {
      const commands: ICommandDecoratorData[] = Reflect.getMetadata("commands", target, propertyKey);
      for (const command of commands) {
        command.config.locks = locks;
      }
    }

    if (Reflect.hasMetadata("events", target, propertyKey)) {
      const events: IEventDecoratorData[] = Reflect.getMetadata("events", target, propertyKey);
      for (const event of events) {
        event.locks = locks;
      }
    }

    if (
      !suppressWarnings &&
      (!Reflect.hasMetadata("commands", target, propertyKey) || !Reflect.hasMetadata("events", target, propertyKey))
    ) {
      logger.warn(
        "LockDecorator used without prior CommandDecorator or EventDecorator (you can suppress this warning with the second argument to LockDecorator)"
      );
    }

    Reflect.defineMetadata("locks", locks, target, propertyKey);
  };
}

/**
 * PLUGINS: Specify a cooldown
 */
function CooldownDecorator(cdTime: number, cdPermission: string = null, suppressWarnings = false) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (Reflect.hasMetadata("commands", target, propertyKey)) {
      const commands: ICommandDecoratorData[] = Reflect.getMetadata("commands", target, propertyKey);
      for (const command of commands) {
        command.config.cooldown = cdTime;
        command.config.cooldownPermission = cdPermission;
      }
    } else if (!suppressWarnings) {
      logger.warn(
        "CooldownDecorator used without prior CommandDecorator (you can suppress this warning with the third argument to CooldownDecorator)"
      );
    }

    Reflect.defineMetadata("cooldown", { time: cdTime, permission: cdPermission }, target, propertyKey);
  };
}

export default {
  command: CommandDecorator,
  event: OnEventDecorator,
  permission: PermissionDecorator,
  lock: LockDecorator,
  cooldown: CooldownDecorator
};
