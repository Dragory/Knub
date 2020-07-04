import { Listener, OnOpts } from "./PluginEventManager";
import { BasePluginType } from "../plugins/pluginTypes";

export interface EventListenerBlueprint<TPluginType extends BasePluginType, TEventName extends string = any>
  extends OnOpts {
  event: TEventName;
  listener: Listener<TPluginType, TEventName>;
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
  options: Omit<EventListenerBlueprint<TPluginType, TEventName>, "listener" | "event">,
  listener: EventListenerBlueprint<TPluginType, TEventName>["listener"]
) => EventListenerBlueprint<TPluginType, TEventName>;

// prettier-ignore
type EventListenerBlueprintCreator<TPluginType extends BasePluginType> =
  & EventListenerBlueprintCreatorWithoutOpts<TPluginType>
  & EventListenerBlueprintCreatorWithOpts<TPluginType>;

/**
 * Helper function to create an event listener blueprint. Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use: `eventListener<TPluginType>()(event, listener)`
 */
export function eventListener<TEventName extends string>(
  event: TEventName,
  listener: EventListenerBlueprint<any, TEventName>["listener"]
): EventListenerBlueprint<any, TEventName>;

/**
 * Helper function to create an event listener blueprint. Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use: `eventListener<TPluginType>()(event, options, listener)`
 */
export function eventListener<TEventName extends string>(
  event: TEventName,
  options: Omit<EventListenerBlueprint<any, TEventName>, "listener" | "event">,
  listener: EventListenerBlueprint<any, TEventName>["listener"]
): EventListenerBlueprint<any, TEventName>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function eventListener<TPluginType extends BasePluginType>(): EventListenerBlueprintCreator<TPluginType>;

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
      ...options,
      event,
      listener,
    };
  } else if (args.length === 0) {
    // No arguments, with TPluginType - return self
    return eventListener as EventListenerBlueprintCreator<BasePluginType>;
  }

  throw new Error(`No signature of eventListener() takes ${args.length} arguments`);
}
