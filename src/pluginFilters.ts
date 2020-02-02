import { Listener } from "./PluginEventManager";
import { PluginData } from "./PluginData";
import { eventToChannel, eventToGuild } from "./utils";
import { GroupChannel, PrivateChannel } from "eris";

export type EventFilter = (pluginData: PluginData, event: string, ...args: any[]) => boolean | Promise<boolean>;

export type FilteredListener<T extends Listener> = (...params: Parameters<T>) => ReturnType<T>;

/**
 * Runs the specified event listener if the event passes ALL of the specified
 * filter
 */
export function withFilters<T extends Listener>(
  event: string,
  listener: T,
  filters: EventFilter[]
): FilteredListener<T> {
  const wrapped = async (pluginData: PluginData, ...args) => {
    for (const filter of filters) {
      const filterResult = await filter(pluginData, event, ...args);
      if (!filterResult) return;
    }

    return listener(pluginData, ...args);
  };

  return wrapped as FilteredListener<T>;
}

/**
 * Runs the specified event listener if the event passes ANY of the specified
 * filters
 */
export function withAnyFilter<T extends Listener>(
  event: string,
  listener: T,
  filters: EventFilter[]
): FilteredListener<T> {
  const wrapped = async (pluginData: PluginData, ...args) => {
    for (const filter of filters) {
      const filterResult = await filter(pluginData, event, ...args);
      if (filterResult) {
        return listener(pluginData, ...args);
      }
    }

    return;
  };

  return wrapped as FilteredListener<T>;
}

export function onlyGuild(pluginData: PluginData, event: string, ...args: any[]): boolean {
  const guild = eventToGuild[event]?.(...args) ?? null;
  return guild && pluginData.guilds.includes(guild);
}

export function onlyDM(pluginData: PluginData, event: string, ...args: any[]): boolean {
  const channel = eventToChannel[event]?.(...args) ?? null;
  return channel && channel instanceof PrivateChannel;
}

export function onlyGroup(pluginData: PluginData, event: string, ...args: any[]): boolean {
  const channel = eventToChannel[event]?.(...args) ?? null;
  return channel && channel instanceof GroupChannel;
}
