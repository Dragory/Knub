import { Listener, OnOpts } from "./BasePluginEventManager";
import { BasePluginType } from "../plugins/pluginTypes";
import { AnyPluginData, GlobalPluginData, GuildPluginData } from "../plugins/PluginData";
import { GuildEvent, ValidEvent } from "./eventTypes";

export interface EventListenerBlueprint<
  TPluginData extends AnyPluginData<any>,
  TEventName extends ValidEvent = ValidEvent
> extends OnOpts {
  event: TEventName;
  listener: Listener<TPluginData, TEventName>;
}

/**
 * Helper function to create an event listener blueprint with type hints
 */
type EventListenerBlueprintCreator<TPluginData extends AnyPluginData<any>, TBaseEventName extends ValidEvent> = <
  TEventName extends TBaseEventName
>(
  blueprint: EventListenerBlueprint<TPluginData, TEventName>
) => EventListenerBlueprint<TPluginData, TEventName>;

function eventListener<TPluginData extends AnyPluginData<BasePluginType>>(...args) {
  if (args.length === 1) {
    // (blueprint)
    // Return event listener blueprint
    return args[0];
  }

  if (args.length === 0) {
    // No arguments, with TPluginType - return self
    return eventListener as EventListenerBlueprintCreator<TPluginData, ValidEvent>;
  }

  throw new Error(`No signature of eventListener() takes ${args.length} arguments`);
}

/**
 * Helper function to create an event listener blueprint for guild events.
 * Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `guildEventListener<TPluginType>()(blueprint)`
 */
export function typedGuildEventListener<TEventName extends GuildEvent>(
  blueprint: EventListenerBlueprint<GuildPluginData<any>, TEventName>
): EventListenerBlueprint<GuildPluginData<any>, TEventName>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function typedGuildEventListener<TPluginType extends BasePluginType>(): EventListenerBlueprintCreator<
  GuildPluginData<TPluginType>,
  GuildEvent
>;

export function typedGuildEventListener(...args) {
  return eventListener<GuildPluginData<any>>(...args);
}

/**
 * Helper function to create an event listener blueprint for global events.
 * Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `globalEventListener<TPluginType>()(blueprint)`
 */
export function typedGlobalEventListener<TEventName extends ValidEvent>(
  blueprint: EventListenerBlueprint<GlobalPluginData<any>, TEventName>
): EventListenerBlueprint<GlobalPluginData<any>, TEventName>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function typedGlobalEventListener<TPluginType extends BasePluginType>(): EventListenerBlueprintCreator<
  GlobalPluginData<TPluginType>,
  ValidEvent
>;

export function typedGlobalEventListener(...args) {
  return eventListener<GlobalPluginData<any>>(...args);
}
