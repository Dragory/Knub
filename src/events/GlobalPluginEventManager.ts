import { BasePluginEventManager, Listener, OnOpts, WrappedListener } from "./BasePluginEventManager";
import { EventListenerBlueprint, GlobalPluginData } from "..";
import { EventArguments, ValidEvent } from "./eventTypes";
import { ignoreBots, ignoreSelf, withFilters } from "./eventFilters";

export class GlobalPluginEventManager<TPluginData extends GlobalPluginData<any>> extends BasePluginEventManager<
  TPluginData
> {
  registerEventListener(blueprint: EventListenerBlueprint<TPluginData, ValidEvent>): WrappedListener {
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

    const wrappedListener: WrappedListener = (args: EventArguments[ValidEvent]) => {
      return filteredListener({
        args,
        pluginData: this.pluginData,
      });
    };

    this.listeners.get(blueprint.event).add(wrappedListener);
    this.eventRelay.onAnyEvent(blueprint.event, wrappedListener);

    return wrappedListener;
  }

  off(event: ValidEvent, listener: WrappedListener): void {
    if (!this.listeners.has(event)) {
      return;
    }

    this.listeners.get(event).delete(listener);
    this.eventRelay.offAnyEvent(event, listener);
  }

  on<TEventName extends ValidEvent>(
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
