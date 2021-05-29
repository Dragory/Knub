import { Client, Constants, RawPacket } from "eris";
import { EventArguments, fromErisArgs, GuildEvent, isGuildEvent, ValidEvent } from "./eventTypes";
import { eventToGuild, UnknownEventConverter, unknownEventConverters } from "./eventUtils";

export type RelayListener<TEvent extends ValidEvent> = (args: EventArguments[TEvent]) => any;
type GuildListenerMap = Map<string, Map<GuildEvent, Set<RelayListener<GuildEvent>>>>;
type AnyListenerMap = Map<ValidEvent, Set<RelayListener<ValidEvent>>>;

/**
 * Relays Discord events to the appropriate plugins.
 * Guild events are a subset of all events, that apply to a specific guild.
 */
export class EventRelay {
  protected guildListeners: GuildListenerMap = new Map() as GuildListenerMap;
  protected anyListeners: AnyListenerMap = new Map() as AnyListenerMap;
  protected registeredRelays: Set<ValidEvent> = new Set();

  constructor(protected client: Client) {
    this.client.on("rawWS", (packet) => this.onRawWS(packet));
  }

  onRawWS(packet: RawPacket): void {
    // By parsing raw packets, we can add support for new events before Eris supports them officially
    // This should be used extremely sparingly due to potential compatibility problems later
    const event = this.rawPacketToEvent(packet);
    if (event) {
      this.relayEvent(event[0], event[1]);
    }
  }

  rawPacketToEvent(packet: RawPacket): ReturnType<UnknownEventConverter> {
    if (packet.op !== Constants.GatewayOPCodes.EVENT) {
      return null;
    }

    if (packet.t && unknownEventConverters[packet.t]) {
      return unknownEventConverters[packet.t](this.client, packet);
    }

    return null;
  }

  onGuildEvent<TEvent extends GuildEvent>(guildId: string, ev: TEvent, listener: RelayListener<TEvent>): void {
    if (!this.guildListeners.has(guildId)) {
      this.guildListeners.set(guildId, new Map());
    }

    const guildListeners = this.guildListeners.get(guildId)!;
    if (!guildListeners.has(ev)) {
      guildListeners.set(ev, new Set());
    }

    guildListeners.get(ev)!.add(listener as RelayListener<GuildEvent>);
    this.registerEventRelay(ev);
  }

  offGuildEvent<TEvent extends GuildEvent>(guildId: string, ev: TEvent, listener: RelayListener<TEvent>): void {
    this.guildListeners
      .get(guildId)
      ?.get(ev)
      ?.delete(listener as RelayListener<GuildEvent>);
  }

  onAnyEvent<TEvent extends ValidEvent>(ev: TEvent, listener: RelayListener<TEvent>): void {
    if (!this.anyListeners.has(ev)) {
      this.anyListeners.set(ev, new Set());
    }

    this.anyListeners.get(ev)!.add(listener as RelayListener<ValidEvent>);
    this.registerEventRelay(ev);
  }

  offAnyEvent<TEvent extends ValidEvent>(ev: TEvent, listener: RelayListener<TEvent>): void {
    if (!this.anyListeners.has(ev)) {
      return;
    }

    this.anyListeners.get(ev)!.delete(listener as RelayListener<ValidEvent>);
  }

  protected registerEventRelay(ev: ValidEvent): void {
    if (this.registeredRelays.has(ev)) {
      return;
    }

    this.registeredRelays.add(ev);
    this.client.on(ev, (...args) => {
      this.relayEvent(ev, args);
    });
  }

  protected relayEvent(ev: ValidEvent, args: any[]): void {
    const convertedArgs = fromErisArgs[ev](...args);

    if (isGuildEvent(ev)) {
      // Only guild events are passed to guild listeners, and only to the matching guild
      const guild = eventToGuild[ev]?.(convertedArgs as any);
      if (guild && this.guildListeners.get(guild.id)?.has(ev)) {
        for (const listener of this.guildListeners.get(guild.id)!.get(ev)!.values()!) {
          listener(convertedArgs as EventArguments[GuildEvent]);
        }
      }
    }

    // Guild events and global events are both passed to "any listeners"
    if (this.anyListeners.has(ev)) {
      for (const listener of this.anyListeners.get(ev)!.values()) {
        listener(convertedArgs);
      }
    }
  }
}
