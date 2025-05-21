import type { Lock } from "../locks/LockManager.ts";
import type { AnyPluginData, GuildPluginData } from "../plugins/PluginData.ts";
import type { Awaitable } from "../utils.ts";
import type { EventRelay } from "./EventRelay.ts";
import type { EventFilter } from "./eventFilters.ts";
import type { EventArguments, GuildEventArguments, ValidEvent } from "./eventTypes.ts";

export interface EventMeta<TPluginData extends AnyPluginData<any>, TArguments> {
  args: TArguments;
  pluginData: TPluginData;

  // Added by locks() event filter
  lock?: Lock;
}

export type Listener<TPluginData extends AnyPluginData<any>, TEventName extends ValidEvent> = (
  meta: EventMeta<
    TPluginData,
    TPluginData extends GuildPluginData<any> ? GuildEventArguments[TEventName] : EventArguments[TEventName]
  >,
) => Awaitable<void>;

export type WrappedListener = (args: any) => Awaitable<void>;

export interface OnOpts {
  allowBots?: boolean;
  allowSelf?: boolean;
  filters?: EventFilter[];
}

/**
 * A wrapper for the d.js event emitter that passes plugin data to the listener
 * functions and, by default, restricts events to the plugin's guilds.
 */
export abstract class BasePluginEventManager<TPluginData extends AnyPluginData<any>> {
  protected listeners: Map<string, Set<WrappedListener>> = new Map<string, Set<WrappedListener>>();
  protected pluginData: TPluginData | undefined;

  constructor(protected eventRelay: EventRelay) {}

  public setPluginData(pluginData: TPluginData): void {
    if (this.pluginData) {
      throw new Error("Plugin data already set");
    }

    this.pluginData = pluginData;
  }

  abstract off(event: string, listener: WrappedListener): void;

  public getListenerCount(): number {
    let count = 0;
    for (const listeners of this.listeners.values()) {
      count += listeners.size;
    }
    return count;
  }

  public clearAllListeners(): void {
    for (const [event, listeners] of this.listeners.entries()) {
      for (const listener of listeners) {
        this.off(event, listener);
      }
    }
  }

  public destroy(): void {
    this.clearAllListeners();
  }
}
