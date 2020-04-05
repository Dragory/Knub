import { PluginData } from "./PluginData";
import { Awaitable, eventToChannel, eventToGuild, eventToMessage, eventToUser, get, noop } from "./utils";
import { GroupChannel, Guild, PrivateChannel } from "eris";
import { hasPermission } from "./pluginUtils";

export interface EventHandlerMeta {
  eventName: string;
  pluginData: PluginData;
}

export interface EventHandlerProps {
  meta: EventHandlerMeta;
  next: () => Awaitable<void>;
}

export type EventMiddleware<TArgs = any, TProps extends EventHandlerProps = EventHandlerProps> = (
  args: TArgs,
  props: TProps
) => Awaitable<void>;

export function chainMiddleware<TArgs = any>(middlewareList: Array<EventMiddleware<TArgs>>): EventMiddleware {
  return function(args: TArgs, { meta, next }) {
    for (let i = middlewareList.length - 1; i >= 0; i--) {
      next = middlewareList[i].bind(this, args, { meta, next });
    }
    return next();
  };
}

export function onlyPluginGuild(): EventMiddleware {
  return (args, { meta, next }) => {
    const guild = eventToGuild[meta.eventName]?.(...args) ?? null;
    if (guild && meta.pluginData.guild === guild) next();
  };
}

export function onlyDM(): EventMiddleware {
  return (args, { meta, next }) => {
    const channel = eventToChannel[meta.eventName]?.(...args) ?? null;
    if (channel && channel instanceof PrivateChannel) next();
  };
}

export function onlyGroup(): EventMiddleware {
  return (args, { meta, next }) => {
    const channel = eventToChannel[meta.eventName]?.(...args) ?? null;
    if (channel && channel instanceof GroupChannel) next();
  };
}

export function ignoreSelf(): EventMiddleware {
  return (args, { meta, next }) => {
    const user = eventToUser[meta.eventName]?.(...args) ?? null;
    if (!user || user.id !== meta.pluginData.client.user.id) next();
  };
}

export function ignoreBots(): EventMiddleware {
  return (args, { meta, next }) => {
    const user = eventToUser[meta.eventName]?.(...args) ?? null;
    if (!user || !user.bot) next();
  };
}

export function requirePermission(permission: string): EventMiddleware {
  return (args, { meta, next }) => {
    const guild = eventToGuild[meta.eventName]?.(...args) ?? null;
    const user = eventToUser[meta.eventName]?.(...args) ?? null;
    const member = guild && user && guild.members.get(user.id);
    if (member && get(meta.pluginData.config.getForMember(member), permission) === true) {
      next();
    }
  };
}

export function lock(locks: string | string[], addToArgs = false): EventMiddleware {
  return async (args, { meta, next }) => {
    const theLock = await meta.pluginData.locks.acquire(locks);
    if (theLock.interrupted) return;

    if (addToArgs) {
      args.push(theLock);
    }

    await next();

    theLock.unlock();
  };
}

let cooldownId = 1;
export function cooldown(time: number, permission: string = null): EventMiddleware {
  const thisCooldownId = cooldownId++;
  return async (args, { meta, next }) => {
    if (permission) {
      const message = eventToMessage[meta.eventName]?.(...args);
      if (message) {
        const config = meta.pluginData.config.getForMessage(message);
        if (!hasPermission(config, permission)) {
          return next();
        }
      }
    }

    const user = eventToUser[meta.eventName]?.(...args);
    if (!user || !meta.pluginData.cooldowns.isOnCooldown(`${thisCooldownId}-${user.id}`)) {
      return next();
    }
  };
}
