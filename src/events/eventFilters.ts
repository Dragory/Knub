import { DMChannel, type User } from "discord.js";
import { hasPermission } from "../helpers.ts";
import { type AnyPluginData, isGuildPluginData } from "../plugins/PluginData.ts";
import type { BasePluginType } from "../plugins/pluginTypes.ts";
import type { Awaitable } from "../utils.ts";
import type { EventMeta, Listener } from "./BasePluginEventManager.ts";
import type { EventArguments, ValidEvent } from "./eventTypes.ts";
import { eventToChannel, eventToGuild, eventToMessage, eventToUser } from "./eventUtils.ts";

export type EventFilter = <TEventName extends ValidEvent>(
  event: TEventName,
  meta: EventMeta<AnyPluginData<BasePluginType>, EventArguments[TEventName]>,
) => Awaitable<boolean>;

export type FilteredListener<T extends Listener<any, any>> = T;

/**
 * Runs the specified event listener if the event passes ALL of the specified
 * filters
 */
export function withFilters<T extends Listener<any, any>>(
  event: ValidEvent,
  listener: T,
  filters: EventFilter[],
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
  event: ValidEvent,
  listener: T,
  filters: EventFilter[],
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

    const guild = eventToGuild[event]?.(args as any) ?? null;
    return Boolean(guild && pluginData.guild === guild);
  };
}

export function onlyDM(): EventFilter {
  return (event, { args }) => {
    const channel = eventToChannel[event]?.(args as any) ?? null;
    return Boolean(channel && channel instanceof DMChannel);
  };
}

let evCdKeyNum = 1;
export function cooldown(timeMs: number, permission?: string): EventFilter {
  const cdKey = `event-${evCdKeyNum++}`;
  return async (event, { args, pluginData }) => {
    let cdApplies = true;
    if (permission) {
      const user = eventToUser[event]?.(args as any);
      const channel = eventToChannel[event]?.(args as any);
      const msg = eventToMessage[event]?.(args as any);
      const config = await pluginData.config.getMatchingConfig({
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
  return async (event, { args, pluginData }) => {
    const user = eventToUser[event]?.(args as any) ?? null;
    const member = user && isGuildPluginData(pluginData) ? pluginData.guild.members.resolve(user.id) : null;
    const config = member
      ? await pluginData.config.getForMember(member)
      : user
        ? await pluginData.config.getForUser(user)
        : await pluginData.config.get();

    return hasPermission(config, permission);
  };
}

export function ignoreBots(): EventFilter {
  return (event, { args }) => {
    const user = eventToUser[event]?.(args as any) ?? null;
    return !user || !(user as User).bot;
  };
}

export function ignoreSelf(): EventFilter {
  return (event, { args, pluginData }) => {
    const user = eventToUser[event]?.(args as any) ?? null;
    return !user || user.id !== pluginData.client.user!.id;
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
