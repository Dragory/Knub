import { Client } from "eris";
import { EventArguments, fromErisArgs, GuildEvent, isGuildEvent, ValidEvent } from "./eventTypes";
import { eventToGuild } from "./eventUtils";

export type RelayListener<TEvent extends ValidEvent> = (args: EventArguments[TEvent]) => any;
type GuildListenerMap = Map<string, Map<GuildEvent, Set<RelayListener<GuildEvent>>>>;
type AnyListenerMap = Map<ValidEvent, Set<RelayListener<ValidEvent>>>;

/**
 * Relays Discord events to the appropriate plugins.
 * Guild events are a subset of all events, that apply to a specific guild.
 */
export class EventRelay {
  protected guildListeners: GuildListenerMap = new Map();
  protected anyListeners: AnyListenerMap = new Map();
  protected registeredRelays: Set<ValidEvent> = new Set();

  constructor(protected client: Client) {}

  onGuildEvent<TEvent extends GuildEvent>(guildId: string, ev: TEvent, listener: RelayListener<TEvent>) {
    if (!this.guildListeners.has(guildId)) {
      this.guildListeners.set(guildId, new Map());
    }

    const guildListeners = this.guildListeners.get(guildId);
    if (!guildListeners.has(ev)) {
      guildListeners.set(ev, new Set());
    }

    guildListeners.get(ev).add(listener);
    this.registerEventRelay(ev);
  }

  offGuildEvent<TEvent extends GuildEvent>(guildId: string, ev: TEvent, listener: RelayListener<TEvent>) {
    this.guildListeners.get(guildId)?.get(ev)?.delete(listener);
  }

  onAnyEvent<TEvent extends ValidEvent>(ev: TEvent, listener: RelayListener<TEvent>) {
    if (!this.anyListeners.has(ev)) {
      this.anyListeners.set(ev, new Set());
    }

    this.anyListeners.get(ev).add(listener);
    this.registerEventRelay(ev);
  }

  offAnyEvent<TEvent extends ValidEvent>(ev: TEvent, listener: RelayListener<TEvent>) {
    if (!this.anyListeners.has(ev)) {
      return;
    }

    this.anyListeners.get(ev).delete(listener);
  }

  protected registerEventRelay(ev: ValidEvent) {
    if (this.registeredRelays.has(ev)) {
      return;
    }

    this.registeredRelays.add(ev);
    this.client.on(ev, (...args) => {
      this.relayEvent(ev, args);
    });
  }

  protected relayEvent(ev: ValidEvent, args) {
    const convertedArgs = fromErisArgs[ev](...args);

    if (isGuildEvent(ev)) {
      // Only guild events are passed to guild listeners, and only to the matching guild
      const guild = eventToGuild[ev]?.(convertedArgs as any);
      if (guild && this.guildListeners.get(guild.id)?.has(ev)) {
        for (const listener of this.guildListeners.get(guild.id)?.get(ev).values()) {
          listener(convertedArgs as EventArguments[GuildEvent]);
        }
      }
    }

    // Guild events and global events are both passed to "any listeners"
    if (this.anyListeners.has(ev)) {
      for (const listener of this.anyListeners.get(ev).values()) {
        listener(convertedArgs);
      }
    }
  }
}
