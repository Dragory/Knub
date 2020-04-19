import { EventMeta, Listener } from "./PluginEventManager";
import { PluginData } from "./PluginData";
import { Awaitable, eventToChannel, eventToGuild, eventToUser, resolveMember } from "./utils";
import { GroupChannel, PrivateChannel } from "eris";
import { hasPermission } from "./pluginUtils";

export type EventFilter = (event: string, args: any[], eventMeta: EventMeta) => Awaitable<boolean>;

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
  const wrapped: Listener = async (args, eventMeta) => {
    for (const filter of filters) {
      const filterResult = await filter(event, args, eventMeta);
      if (!filterResult) return;
    }

    return listener(args, eventMeta);
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
  const wrapped: Listener = async (args, eventMeta) => {
    for (const filter of filters) {
      const filterResult = await filter(event, args, eventMeta);
      if (filterResult) {
        return listener(args, eventMeta);
      }
    }

    return;
  };

  return wrapped as FilteredListener<T>;
}

export function onlyGuild(): EventFilter {
  return (event, args, meta) => {
    const guild = eventToGuild[event]?.(...args) ?? null;
    return guild && meta.pluginData.guild === guild;
  };
}

export function onlyDM(): EventFilter {
  return (event, args) => {
    const channel = eventToChannel[event]?.(...args) ?? null;
    return channel && channel instanceof PrivateChannel;
  };
}

export function onlyGroup(): EventFilter {
  return (event, args) => {
    const channel = eventToChannel[event]?.(...args) ?? null;
    return channel && channel instanceof GroupChannel;
  };
}

export function requirePermission(permission: string): EventFilter {
  return (event, args, meta) => {
    const user = eventToUser[event]?.(...args) ?? null;
    const member = user ? resolveMember(meta.pluginData.guild, user.id) : null;
    const config = member
      ? meta.pluginData.config.getForMember(member)
      : user
      ? meta.pluginData.config.getForUser(user)
      : meta.pluginData.config.get();

    return hasPermission(config, permission);
  };
}

export function ignoreBots(): EventFilter {
  return (event, args) => {
    const user = eventToUser[event]?.(...args) ?? null;
    return !user || !user.bot;
  };
}

export function ignoreSelf(): EventFilter {
  return (event, args, meta) => {
    const user = eventToUser[event]?.(...args) ?? null;
    return !user || user.id !== meta.pluginData.client.user.id;
  };
}

export function locks(locksToAcquire: string | string[]): EventFilter {
  return async (event, args, meta) => {
    const lock = await meta.pluginData.locks.acquire(locksToAcquire);
    if (lock.interrupted) return false;

    return true;
  };
}
