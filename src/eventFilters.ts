import { EventMeta, Listener } from "./PluginEventManager";
import { Awaitable, eventToChannel, eventToGuild, eventToMessage, eventToUser, resolveMember } from "./utils";
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

let evCdKeyNum = 1;
export function cooldown(timeMs: number, permission?: string): EventFilter {
  const cdKey = `event-${evCdKeyNum++}`;
  return (event, args, meta) => {
    let cdApplies = true;
    if (permission) {
      const user = eventToUser[event]?.(...args);
      const channel = eventToChannel[event]?.(...args);
      const msg = eventToMessage[event]?.(...args);
      const config = meta.pluginData.config.getMatchingConfig({
        channelId: channel?.id,
        userId: user?.id,
        message: msg,
      });

      cdApplies = !config || hasPermission(config, permission);
    }

    if (cdApplies && meta.pluginData.cooldowns.isOnCooldown(cdKey)) {
      // We're on cooldown
      return false;
    }

    meta.pluginData.cooldowns.setCooldown(cdKey, timeMs);
    return true;
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

    meta.lock = lock;

    return true;
  };
}
