import "reflect-metadata";
import { ICommandDecoratorData, IEventDecoratorData } from "./decorators";
import { Plugin } from "./Plugin";
import { IPermissionLevelDefinitions } from "./configInterfaces";
import { Member } from "eris";
import { get } from "./utils";

export function getMemberLevel(levels: IPermissionLevelDefinitions, member: Member): number {
  if (member.guild.ownerID === member.id) {
    return 99999;
  }

  for (const [id, level] of Object.entries(levels)) {
    if (member.id === id || (member.roles && member.roles.includes(id))) {
      return level;
    }
  }

  return 0;
}

export function hasPermission(config: any, permission: string) {
  return get(config, permission) === true;
}

/**
 * Legacy plugin utilities
 */

export function getPluginIterableProps(plugin: typeof Plugin) {
  // Have to do this to access class methods
  const nonEnumerableProps = Object.getOwnPropertyNames(plugin.prototype);
  const enumerableProps = Object.keys(plugin);
  return [...nonEnumerableProps, ...enumerableProps];
}

export function getPluginDecoratorCommands(plugin: typeof Plugin): ICommandDecoratorData[] {
  return Array.from(getPluginIterableProps(plugin)).reduce((arr: ICommandDecoratorData[], prop) => {
    if (typeof plugin.prototype[prop] !== "function") {
      return arr;
    }

    const decoratorCommands: ICommandDecoratorData[] = Reflect.getMetadata("commands", plugin.prototype, prop) || [];
    if (decoratorCommands) arr.push(...decoratorCommands);

    return arr;
  }, []);
}

export function getPluginDecoratorEventListeners(plugin: typeof Plugin): IEventDecoratorData[] {
  return Array.from(getPluginIterableProps(plugin)).reduce((arr: IEventDecoratorData[], prop) => {
    if (typeof plugin.prototype[prop] !== "function") {
      return arr;
    }

    const decoratorEvents: IEventDecoratorData[] = Reflect.getMetadata("events", plugin.prototype, prop);
    if (decoratorEvents) arr.push(...decoratorEvents);

    return arr;
  }, []);
}
