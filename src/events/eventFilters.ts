import { EventMeta, Listener } from "./PluginEventManager";
import { Awaitable } from "../utils";
import { GroupChannel, PrivateChannel } from "eris";
import { eventToChannel, eventToGuild, eventToMessage, eventToUser } from "./eventUtils";
import { EventArguments } from "./eventArguments";
import { hasPermission, resolveMember } from "../helpers";
import { isGuildPluginData } from "../plugins/PluginData";

export type EventFilter = <TEventName extends string>(
  event: TEventName,
  meta: EventMeta<any, EventArguments[TEventName]>
) => Awaitable<boolean>;

export type FilteredListener<T extends Listener<any, any>> = (...params: Parameters<T>) => ReturnType<T>;

/**
 * Runs the specified event listener if the event passes ALL of the specified
 * filter
 */
export function withFilters<T extends Listener<any, any>>(
  event: string,
  listener: T,
  filters: EventFilter[]
): FilteredListener<T> {
  const wrapped: Listener<any, any> = async (meta) => {
    for (const filter of filters) {
      const filterResult = await filter(event, meta);
      if (!filterResult) return;
    }

    return listener(meta);
  };

  return wrapped as FilteredListener<T>;
}

/**
 * Runs the specified event listener if the event passes ANY of the specified
 * filters
 */
export function withAnyFilter<T extends Listener<any, any>>(
  event: string,
  listener: T,
  filters: EventFilter[]
): FilteredListener<T> {
  const wrapped: Listener<any, any> = async (meta) => {
    for (const filter of filters) {
      const filterResult = await filter(event, meta);
      if (filterResult) {
        return listener(meta);
      }
    }

    return;
  };

  return wrapped as FilteredListener<T>;
}

export function onlyGuild(): EventFilter {
  return (event, { args, pluginData }) => {
    if (!isGuildPluginData(pluginData)) {
      return false;
    }

    const guild = eventToGuild[event as string]?.(args) ?? null;
    return guild && pluginData.guild === guild;
  };
}

export function onlyDM(): EventFilter {
  return (event, { args }) => {
    const channel = eventToChannel[event as string]?.(args) ?? null;
    return channel && channel instanceof PrivateChannel;
  };
}

export function onlyGroup(): EventFilter {
  return (event, { args }) => {
    const channel = eventToChannel[event as string]?.(args) ?? null;
    return channel && channel instanceof GroupChannel;
  };
}

let evCdKeyNum = 1;
export function cooldown(timeMs: number, permission?: string): EventFilter {
  const cdKey = `event-${evCdKeyNum++}`;
  return (event, { args, pluginData }) => {
    let cdApplies = true;
    if (permission) {
      const user = eventToUser[event as string]?.(args);
      const channel = eventToChannel[event as string]?.(args);
      const msg = eventToMessage[event as string]?.(args);
      const config = pluginData.config.getMatchingConfig({
        channelId: channel?.id,
        userId: user?.id,
        message: msg,
      });

      cdApplies = !config || hasPermission(config, permission);
    }

    if (cdApplies && pluginData.cooldowns.isOnCooldown(cdKey)) {
      // We're on cooldown
      return false;
    }

    pluginData.cooldowns.setCooldown(cdKey, timeMs);
    return true;
  };
}

export function requirePermission(permission: string): EventFilter {
  return (event, { args, pluginData }) => {
    const user = eventToUser[event as string]?.(args) ?? null;
    const member = user && isGuildPluginData(pluginData) ? resolveMember(pluginData.guild, user.id) : null;
    const config = member
      ? pluginData.config.getForMember(member)
      : user
      ? pluginData.config.getForUser(user)
      : pluginData.config.get();

    return hasPermission(config, permission);
  };
}

export function ignoreBots(): EventFilter {
  return (event, { args }) => {
    const user = eventToUser[event as string]?.(args) ?? null;
    return !user || !user.bot;
  };
}

export function ignoreSelf(): EventFilter {
  return (event, { args, pluginData }) => {
    const user = eventToUser[event as string]?.(args) ?? null;
    return !user || user.id !== pluginData.client.user.id;
  };
}

export function locks(locksToAcquire: string | string[]): EventFilter {
  return async (event, meta) => {
    const lock = await meta.pluginData.locks.acquire(locksToAcquire);
    if (lock.interrupted) return false;

    meta.lock = lock;

    return true;
  };
}
