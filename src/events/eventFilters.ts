import { EventMeta, Listener } from "./BasePluginEventManager";
import { Awaitable } from "../utils";
import { eventToChannel, eventToGuild, eventToMessage, eventToUser } from "./eventUtils";
import { EventArguments, ValidEvent } from "./eventTypes";
import { hasPermission } from "../helpers";
import { AnyPluginData, isGuildPluginData } from "../plugins/PluginData";
import { BasePluginType } from "../plugins/pluginTypes";
import { DMChannel, User } from "discord.js";

export type EventFilter = <TEventName extends ValidEvent>(
  event: TEventName,
  meta: EventMeta<AnyPluginData<BasePluginType>, EventArguments[TEventName]>
) => Awaitable<boolean>;

export type FilteredListener<T extends Listener<any, any>> = T;

/**
 * Runs the specified event listener if the event passes ALL of the specified
 * filters
 */
export function withFilters<T extends Listener<any, any>>(
  event: ValidEvent,
  listener: T,
  filters: EventFilter[]
): FilteredListener<T> {
  const wrapped: Listener<any, any> = async (meta) => {
    for (const filter of filters) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
  filters: EventFilter[]
): FilteredListener<T> {
  const wrapped: Listener<any, any> = async (meta) => {
    for (const filter of filters) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const filterResult = await filter(event, meta);
      if (filterResult) {
        return listener(meta);
      }
    }

    return;
  };

  return wrapped as FilteredListener<T>;
}

// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-member-access */

export function onlyGuild(): EventFilter {
  return (event, { args, pluginData }) => {
    if (!isGuildPluginData(pluginData)) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const guild = eventToGuild[event]?.(args as any) ?? null;
    return Boolean(guild && pluginData.guild === guild);
  };
}

export function onlyDM(): EventFilter {
  return (event, { args }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const user = eventToUser[event]?.(args as any);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const channel = eventToChannel[event]?.(args as any);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const user = eventToUser[event]?.(args as any) ?? null;
    const member = user && isGuildPluginData(pluginData) ? pluginData.guild.members.resolve(user.id) : null;
    const config = member
      ? await pluginData.config.getForMember(member)
      : user
      ? await pluginData.config.getForUser(user)
      : pluginData.config.get();

    return hasPermission(config, permission);
  };
}

export function ignoreBots(): EventFilter {
  return (event, { args }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const user = eventToUser[event]?.(args as any) ?? null;
    return !user || !(user as User).bot;
  };
}

export function ignoreSelf(): EventFilter {
  return (event, { args, pluginData }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
