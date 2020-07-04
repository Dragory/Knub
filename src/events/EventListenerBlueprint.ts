import { Listener, OnOpts } from "./PluginEventManager";
import { BasePluginType } from "../plugins/pluginTypes";

export interface EventListenerBlueprint<TPluginType extends BasePluginType, TEventName extends string = any> {
  event: TEventName;
  listener: Listener<TPluginType, TEventName>;
  opts?: OnOpts;
}

/**
 * Helper function to create an event listener blueprint with just event name and listener function
 */
type EventListenerBlueprintCreatorWithoutOpts<TPluginType extends BasePluginType> = <TEventName extends string>(
  event: TEventName,
  listener: EventListenerBlueprint<TPluginType, TEventName>["listener"]
) => EventListenerBlueprint<TPluginType, TEventName>;

/**
 * Helper function to create an event listener blueprint with event name, options, and a listener function
 */
type EventListenerBlueprintCreatorWithOpts<TPluginType extends BasePluginType> = <TEventName extends string>(
  event: TEventName,
  options: OnOpts,
  listener: EventListenerBlueprint<TPluginType, TEventName>["listener"]
) => EventListenerBlueprint<TPluginType, TEventName>;

type EventListenerCreator<TPluginType extends BasePluginType> = EventListenerBlueprintCreatorWithoutOpts<TPluginType> &
  EventListenerBlueprintCreatorWithOpts<TPluginType>;

/**
 * Helper function to create an event listener blueprint. Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use: `eventListener<TPluginType>()(event, listener)`
 */
export function eventListener<TEventName extends string>(
  event: TEventName,
  listener: EventListenerBlueprint<BasePluginType, TEventName>["listener"]
): EventListenerBlueprint<BasePluginType, TEventName>;

/**
 * Helper function to create an event listener blueprint. Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use: `eventListener<TPluginType>()(event, options, listener)`
 */
export function eventListener<TEventName extends string>(
  event: TEventName,
  options: OnOpts,
  listener: EventListenerBlueprint<BasePluginType, TEventName>["listener"]
): EventListenerBlueprint<BasePluginType, TEventName>;

/**
 * Specify `TPluginType` for type hints and return a function: `eventListener(event, listener, rest?)`
 */
export function eventListener<TPluginType extends BasePluginType>(): EventListenerCreator<TPluginType>;

export function eventListener(...args) {
  if (args.length === 2) {
    // (event, listener)
    // Return event listener blueprint
    const [event, listener] = args;
    return {
      event,
      listener,
    } as EventListenerBlueprint<BasePluginType>;
  } else if (args.length === 3) {
    // (event, options, listener)
    // Return event listener blueprint
    const [event, options, listener] = args;
    return {
      event,
      listener,
      opts: options,
    };
  }

  // No arguments, with TPluginType - return self
  return eventListener as EventListenerCreator<BasePluginType>;
}
