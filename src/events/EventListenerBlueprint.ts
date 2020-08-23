import { Listener, OnOpts } from "./PluginEventManager";
import { BasePluginType } from "../plugins/pluginTypes";
import { AnyPluginData, GlobalPluginData, GuildPluginData } from "../plugins/PluginData";

export interface EventListenerBlueprint<TPluginData extends AnyPluginData<any>, TEventName extends string = any>
  extends OnOpts {
  event: TEventName;
  listener: Listener<TPluginData, TEventName>;
}

/**
 * Helper function to create an event listener blueprint with type hints
 */
type EventListenerBlueprintCreatorIdentity<TPluginData extends AnyPluginData<any>> = <TEventName extends string>(
  blueprint: EventListenerBlueprint<TPluginData, TEventName>
) => EventListenerBlueprint<TPluginData, TEventName>;

/**
 * Helper function to create an event listener blueprint with just event name and listener function
 */
type EventListenerBlueprintCreatorWithoutOpts<TPluginData extends AnyPluginData<any>> = <TEventName extends string>(
  event: TEventName,
  listener: EventListenerBlueprint<TPluginData, TEventName>["listener"]
) => EventListenerBlueprint<TPluginData, TEventName>;

/**
 * Helper function to create an event listener blueprint with event name, options, and a listener function
 */
type EventListenerBlueprintCreatorWithOpts<TPluginData extends AnyPluginData<any>> = <TEventName extends string>(
  event: TEventName,
  options: Omit<EventListenerBlueprint<TPluginData, TEventName>, "listener" | "event">,
  listener: EventListenerBlueprint<TPluginData, TEventName>["listener"]
) => EventListenerBlueprint<TPluginData, TEventName>;

// prettier-ignore
type EventListenerBlueprintCreator<TPluginData extends AnyPluginData<any>> =
  & EventListenerBlueprintCreatorIdentity<TPluginData>
  & EventListenerBlueprintCreatorWithoutOpts<TPluginData>
  & EventListenerBlueprintCreatorWithOpts<TPluginData>;

function eventListener<TPluginData extends AnyPluginData<BasePluginType>>(...args) {
  if (args.length === 1) {
    // (blueprint)
    // Return event listener blueprint
    return args[0];
  } else if (args.length === 2) {
    // (event, listener)
    // Return event listener blueprint
    const [event, listener] = args;
    return {
      event,
      listener,
    } as EventListenerBlueprint<AnyPluginData<BasePluginType>>;
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
    return eventListener as EventListenerBlueprintCreator<TPluginData>;
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
export function guildEventListener<TEventName extends string>(
  blueprint: EventListenerBlueprint<GuildPluginData<any>, TEventName>
): EventListenerBlueprint<GuildPluginData<any>, TEventName>;

/**
 * Helper function to create an event listener blueprint for guild events.
 * Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `guildEventListener<TPluginType>()(event, listener)`
 */
export function guildEventListener<TEventName extends string>(
  event: TEventName,
  listener: EventListenerBlueprint<GuildPluginData<any>, TEventName>["listener"]
): EventListenerBlueprint<GuildPluginData<any>, TEventName>;

/**
 * Helper function to create an event listener blueprint for guild events.
 * Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `guildEventListener<TPluginType>()(event, options, listener)`
 */
export function guildEventListener<TEventName extends string>(
  event: TEventName,
  options: Omit<EventListenerBlueprint<GuildPluginData<any>, TEventName>, "listener" | "event">,
  listener: EventListenerBlueprint<GuildPluginData<any>, TEventName>["listener"]
): EventListenerBlueprint<GuildPluginData<any>, TEventName>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function guildEventListener<TPluginType extends BasePluginType>(): EventListenerBlueprintCreator<
  GuildPluginData<TPluginType>
>;

export function guildEventListener(...args) {
  return eventListener<GuildPluginData<any>>(...args);
}

/**
 * Helper function to create an event listener blueprint for global events.
 * Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `globalEventListener<TPluginType>()(blueprint)`
 */
export function globalEventListener<TEventName extends string>(
  blueprint: EventListenerBlueprint<GlobalPluginData<any>, TEventName>
): EventListenerBlueprint<GlobalPluginData<any>, TEventName>;

/**
 * Helper function to create an event listener blueprint for global events.
 * Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `globalEventListener<TPluginType>()(event, listener)`
 */
export function globalEventListener<TEventName extends string>(
  event: TEventName,
  listener: EventListenerBlueprint<GlobalPluginData<any>, TEventName>["listener"]
): EventListenerBlueprint<GlobalPluginData<any>, TEventName>;

/**
 * Helper function to create an event listener blueprint for global events.
 * Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `globalEventListener<TPluginType>()(event, options, listener)`
 */
export function globalEventListener<TEventName extends string>(
  event: TEventName,
  options: Omit<EventListenerBlueprint<GlobalPluginData<any>, TEventName>, "listener" | "event">,
  listener: EventListenerBlueprint<GlobalPluginData<any>, TEventName>["listener"]
): EventListenerBlueprint<GlobalPluginData<any>, TEventName>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function globalEventListener<TPluginType extends BasePluginType>(): EventListenerBlueprintCreator<
  GlobalPluginData<TPluginType>
>;

export function globalEventListener(...args) {
  return eventListener<GlobalPluginData<any>>(...args);
}
