import { ICommandDecoratorData, IEventDecoratorData } from "./decorators";
import { Plugin } from "./Plugin";

export function getPluginIterableProps(plugin: typeof Plugin) {
  // Have to do this to access class methods
  const nonEnumerableProps = Object.getOwnPropertyNames(plugin.prototype);
  const enumerableProps = Object.keys(plugin);
  return [...nonEnumerableProps, ...enumerableProps];
}

export function getPluginDecoratorCommands(plugin: typeof Plugin): ICommandDecoratorData[] {
  return Array.from(getPluginIterableProps(plugin)).reduce((arr: ICommandDecoratorData[], prop) => {
    if (typeof plugin[prop] !== "function") {
      return arr;
    }

    const decoratorCommands: ICommandDecoratorData[] = Reflect.getMetadata("commands", plugin, prop) || [];
    if (decoratorCommands) arr.push(...decoratorCommands);

    return arr;
  }, []);
}

export function getPluginDecoratorEventListeners(plugin: typeof Plugin): IEventDecoratorData[] {
  return Array.from(getPluginIterableProps(plugin)).reduce((arr: IEventDecoratorData[], prop) => {
    if (typeof plugin[prop] !== "function") {
      return arr;
    }

    const decoratorEvents: IEventDecoratorData[] = Reflect.getMetadata("events", plugin, prop);
    if (decoratorEvents) arr.push(...decoratorEvents);

    return arr;
  }, []);
}
