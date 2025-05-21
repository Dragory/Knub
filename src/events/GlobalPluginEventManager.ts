import type { GlobalPluginData } from "../index.ts";
import type { AnyGlobalEventListenerBlueprint } from "../plugins/PluginBlueprint.ts";
import { BasePluginEventManager, type Listener, type OnOpts, type WrappedListener } from "./BasePluginEventManager.ts";
import { type FilteredListener, ignoreBots, ignoreSelf, withFilters } from "./eventFilters.ts";
import type { EventArguments, ValidEvent } from "./eventTypes.ts";

export class GlobalPluginEventManager<
  TPluginData extends GlobalPluginData<any>,
> extends BasePluginEventManager<TPluginData> {
  registerEventListener<T extends AnyGlobalEventListenerBlueprint<TPluginData>>(blueprint: T): WrappedListener {
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
        // @ts-ignore TS is having trouble inferring this correctly. We know TPluginData extends GlobalPluginData, which
        // means that args should be EventArguments[T["event"]], which it is as per the type annotation above.
        args,
        pluginData: this.pluginData!,
      });
    };

    this.listeners.get(blueprint.event)!.add(wrappedListener);
    this.eventRelay.onAnyEvent(blueprint.event, wrappedListener);

    return wrappedListener;
  }

  off(event: ValidEvent, listener: WrappedListener): void {
    if (!this.listeners.has(event)) {
      return;
    }

    this.listeners.get(event)!.delete(listener);
    this.eventRelay.offAnyEvent(event, listener);
  }

  on<TEventName extends ValidEvent>(
    event: TEventName,
    listener: Listener<TPluginData, TEventName>,
    opts?: OnOpts,
  ): WrappedListener {
    return this.registerEventListener({
      ...opts,
      event,
      listener,
    } as AnyGlobalEventListenerBlueprint<TPluginData>);
  }
}
