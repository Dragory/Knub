import EventEmitter = NodeJS.EventEmitter;
import { PluginData } from "./PluginData";
import { Guild } from "eris";
import { onlyGuild, withFilters } from "./pluginFilters";

export type Listener = (pluginData: PluginData, ...args: any[]) => void | Promise<void>;

export interface PluginEventManagerOpts {
  implicitGuildRestriction?: boolean;
}

/**
 * A wrapper for the Eris event emitter that passes plugin data to the listener
 * functions and, by default, restricts events to the plugin's guilds.
 */
export class PluginEventManager {
  private listeners: Map<string, Set<Listener>>;
  private pluginData: PluginData;
  private readonly implicitGuildRestriction: boolean;

  constructor(guilds: Guild[], opts?: PluginEventManagerOpts) {
    this.listeners = new Map();
    this.implicitGuildRestriction = guilds.length && (opts?.implicitGuildRestriction ?? true);
  }

  public setPluginData(pluginData: PluginData) {
    if (this.pluginData) {
      throw new Error("Plugin data already set");
    }

    this.pluginData = pluginData;
  }

  public on(event: string, listener: Listener, ignoreImplicitGuildRestriction?: boolean): Listener {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    if (this.implicitGuildRestriction && !ignoreImplicitGuildRestriction) {
      const wrappedListener = withFilters(event, listener, [onlyGuild]);
      this.listeners.get(event).add(wrappedListener);
      return wrappedListener;
    }

    this.listeners.get(event).add(listener);
    return listener;
  }

  public off(event: string, listener: Listener): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(listener);
    }

    return;
  }

  public async emit(event: string, ...args): Promise<boolean> {
    if (this.listeners.has(event)) {
      for (const listener of this.listeners.get(event)) {
        await listener(this.pluginData, ...args);
      }

      return true;
    }

    return false;
  }
}
