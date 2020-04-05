import EventEmitter = NodeJS.EventEmitter;
import { PluginData } from "./PluginData";
import { Guild } from "eris";
import {
  chainMiddleware,
  EventHandlerMeta,
  EventMiddleware,
  ignoreBots,
  ignoreSelf,
  onlyPluginGuild
} from "./pluginEventMiddleware";
import { noop } from "./utils";
import { PluginError } from "./PluginError";

export interface PluginEventManagerOpts {
  implicitGuildRestriction?: boolean;
  implicitIgnoreSelf?: boolean;
  implicitIgnoreBots?: boolean;
}

export interface OnOpts {
  respectImplicitGuildRestriction?: boolean;
  respectImplicitIgnoreSelf?: boolean;
  respectImplicitIgnoreBots?: boolean;
}

const rethrowPluginErrors: EventMiddleware = async (_, { next }) => {
  try {
    await next();
  } catch (e) {
    throw new PluginError(e);
  }
};

/**
 * A wrapper for the Eris event emitter that passes plugin data to the listener
 * functions and, by default, restricts events to the plugin's guilds.
 */
export class PluginEventManager {
  private listeners: Map<string, Set<EventMiddleware>>;
  private pluginData: PluginData;

  private readonly implicitGuildRestriction: boolean;
  private readonly implicitIgnoreSelf: boolean;
  private readonly implicitIgnoreBots: boolean;

  constructor(opts?: PluginEventManagerOpts) {
    this.listeners = new Map();
    this.implicitGuildRestriction = opts?.implicitGuildRestriction !== false;
    this.implicitIgnoreSelf = opts?.implicitIgnoreSelf !== false;
    this.implicitIgnoreBots = opts?.implicitIgnoreBots !== false;
  }

  public setPluginData(pluginData: PluginData) {
    if (this.pluginData) {
      throw new Error("Plugin data already set");
    }

    this.pluginData = pluginData;
  }

  public on(event: string, listener: EventMiddleware, opts?: OnOpts): EventMiddleware {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    if (this.implicitGuildRestriction && opts?.respectImplicitGuildRestriction !== false) {
      listener = chainMiddleware([onlyPluginGuild(), listener]);
    }

    if (this.implicitIgnoreSelf && opts?.respectImplicitIgnoreSelf !== false) {
      listener = chainMiddleware([ignoreSelf(), listener]);
    }

    if (this.implicitIgnoreBots && opts?.respectImplicitIgnoreBots !== false) {
      listener = chainMiddleware([ignoreBots(), listener]);
    }

    // In production mode, rethrow plugin errors as PluginError so they can be handled gracefully
    if (process.env.NODE_ENV === "production") {
      listener = chainMiddleware([rethrowPluginErrors, listener]);
    }

    this.listeners.get(event).add(listener);
    this.pluginData.client.on(event, listener);

    return listener;
  }

  public off(event: string, listener: EventMiddleware): void {
    if (this.listeners.has(event)) {
      this.pluginData.client.off(event, listener);
      this.listeners.get(event).delete(listener);
    }
  }

  public clearAllListeners(event?: string) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners = new Map();
    }
  }

  public async emit(event: string, args: any): Promise<boolean> {
    if (this.listeners.has(event)) {
      const meta: EventHandlerMeta = {
        eventName: event,
        pluginData: this.pluginData
      };

      for (const listener of this.listeners.get(event)) {
        await listener(args, { meta, next: noop });
      }

      return true;
    }

    return false;
  }
}
