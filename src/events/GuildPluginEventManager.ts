import { BasePluginEventManager, Listener, OnOpts, WrappedListener } from "./BasePluginEventManager";
import { EventListenerBlueprint, GuildPluginData } from "..";
import { EventArguments, GuildEvent } from "./eventTypes";
import { ignoreBots, ignoreSelf, withFilters } from "./eventFilters";

export class GuildPluginEventManager<TPluginData extends GuildPluginData<any>> extends BasePluginEventManager<
  TPluginData
> {
  registerEventListener(blueprint: EventListenerBlueprint<TPluginData, GuildEvent>): WrappedListener {
    if (!this.listeners.has(blueprint.event)) {
      this.listeners.set(blueprint.event, new Set());
    }

    const filters = blueprint.filters || [];

    if (!blueprint.allowSelf) {
      filters.unshift(ignoreSelf());
    }

    if (!blueprint.allowBots) {
      filters.unshift(ignoreBots());
    }

    const filteredListener = withFilters(blueprint.event, blueprint.listener, filters);

    const wrappedListener: WrappedListener = (args: EventArguments[GuildEvent]) => {
      return filteredListener({
        args,
        pluginData: this.pluginData,
      });
    };

    this.listeners.get(blueprint.event).add(wrappedListener);
    this.eventRelay.onGuildEvent(this.pluginData.guild.id, blueprint.event, wrappedListener);

    return wrappedListener;
  }

  off(event: GuildEvent, listener: WrappedListener): void {
    if (!this.listeners.has(event)) {
      return;
    }

    this.listeners.get(event).delete(listener);
    this.eventRelay.offGuildEvent(this.pluginData.guild.id, event, listener);
  }

  on<TEventName extends GuildEvent>(
    event: TEventName,
    listener: Listener<TPluginData, TEventName>,
    opts?: OnOpts
  ): WrappedListener {
    return this.registerEventListener({
      ...opts,
      event,
      listener,
    });
  }
}
