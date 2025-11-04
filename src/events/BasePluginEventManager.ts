import type { Lock } from "../locks/LockManager.ts";
import type { AnyPluginData, GuildPluginData } from "../plugins/PluginData.ts";
import { type Awaitable, sleep } from "../utils.ts";
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
  protected runningListeners: Set<Promise<void>> = new Set();

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

  public async destroy(timeout: number): Promise<void> {
    this.clearAllListeners();
    await this.waitForRunningListeners(timeout);
  }

  protected addRunningListener(awaitable: any): void {
    const promise = Promise.resolve(awaitable).finally(() => {
      this.runningListeners.delete(promise);
    });
    this.runningListeners.add(promise);
  }

  protected async waitForRunningListeners(timeout: number): Promise<void> {
    const { promise, resolve, reject } = Promise.withResolvers<void>();

    // Basically Promise.race(), but we remove the timeout as soon as the main promise resolves so tests don't hang
    Promise.allSettled(Array.from(this.runningListeners)).then(() => resolve());
    const timeoutId = setTimeout(() => resolve(), timeout);
    promise.finally(() => clearTimeout(timeoutId));

    return promise;
  }
}
