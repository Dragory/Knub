import { BasePluginEventManager, Listener, OnOpts, WrappedListener } from "./BasePluginEventManager";
import { GuildPluginData } from "..";
import { EventArguments, GuildEvent } from "./eventTypes";
import { FilteredListener, ignoreBots, ignoreSelf, withFilters } from "./eventFilters";
import { AnyGuildEventListenerBlueprint } from "../plugins/PluginBlueprint";

export class GuildPluginEventManager<TPluginData extends GuildPluginData<any>> extends BasePluginEventManager<
  TPluginData
> {
  registerEventListener<T extends AnyGuildEventListenerBlueprint<TPluginData>>(blueprint: T): WrappedListener {
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

    const filteredListener = withFilters(blueprint.event, blueprint.listener, filters) as FilteredListener<
      Listener<TPluginData["_pluginType"], T["event"]>
    >;

    const wrappedListener: WrappedListener = (args: EventArguments[T["event"]]) => {
      return filteredListener({
        args,
        pluginData: this.pluginData!,
      });
    };

    this.listeners.get(blueprint.event)!.add(wrappedListener);
    this.eventRelay.onGuildEvent(this.pluginData!.guild.id, blueprint.event, wrappedListener);

    return wrappedListener;
  }

  off(event: GuildEvent, listener: WrappedListener): void {
    if (!this.listeners.has(event)) {
      return;
    }

    this.listeners.get(event)!.delete(listener);
    this.eventRelay.offGuildEvent(this.pluginData!.guild.id, event, listener);
  }

  on<TEventName extends GuildEvent>(
    event: TEventName,
    listener: Listener<TPluginData, TEventName>,
    opts?: OnOpts
  ): WrappedListener {
    return this.registerEventListener({
      ...opts,
      event: event as GuildEvent,
      listener,
    } as AnyGuildEventListenerBlueprint<TPluginData>);
  }
}
