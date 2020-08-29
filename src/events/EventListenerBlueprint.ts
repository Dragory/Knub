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
type EventListenerBlueprintCreatorIdentity<
  TPluginData extends AnyPluginData<any>,
  TBaseEventName extends ValidEvent
> = <TEventName extends TBaseEventName>(
  blueprint: EventListenerBlueprint<TPluginData, TEventName>
) => EventListenerBlueprint<TPluginData, TEventName>;

/**
 * Helper function to create an event listener blueprint with just event name and listener function
 */
type EventListenerBlueprintCreatorWithoutOpts<
  TPluginData extends AnyPluginData<any>,
  TBaseEventName extends ValidEvent
> = <TEventName extends TBaseEventName>(
  event: TEventName,
  listener: EventListenerBlueprint<TPluginData, TEventName>["listener"]
) => EventListenerBlueprint<TPluginData, TEventName>;

/**
 * Helper function to create an event listener blueprint with event name, options, and a listener function
 */
type EventListenerBlueprintCreatorWithOpts<
  TPluginData extends AnyPluginData<any>,
  TBaseEventName extends ValidEvent
> = <TEventName extends TBaseEventName>(
  event: TEventName,
  options: Omit<EventListenerBlueprint<TPluginData, TEventName>, "listener" | "event">,
  listener: EventListenerBlueprint<TPluginData, TEventName>["listener"]
) => EventListenerBlueprint<TPluginData, TEventName>;

// prettier-ignore
type EventListenerBlueprintCreator<TPluginData extends AnyPluginData<any>, TEventName extends ValidEvent> =
  & EventListenerBlueprintCreatorIdentity<TPluginData, TEventName>
  & EventListenerBlueprintCreatorWithoutOpts<TPluginData, TEventName>
  & EventListenerBlueprintCreatorWithOpts<TPluginData, TEventName>;

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
export function guildEventListener<TEventName extends GuildEvent>(
  blueprint: EventListenerBlueprint<GuildPluginData<any>, TEventName>
): EventListenerBlueprint<GuildPluginData<any>, TEventName>;

/**
 * Helper function to create an event listener blueprint for guild events.
 * Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `guildEventListener<TPluginType>()(event, listener)`
 */
export function guildEventListener<TEventName extends GuildEvent>(
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
export function guildEventListener<TEventName extends GuildEvent>(
  event: TEventName,
  options: Omit<EventListenerBlueprint<GuildPluginData<any>, TEventName>, "listener" | "event">,
  listener: EventListenerBlueprint<GuildPluginData<any>, TEventName>["listener"]
): EventListenerBlueprint<GuildPluginData<any>, TEventName>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function guildEventListener<TPluginType extends BasePluginType>(): EventListenerBlueprintCreator<
  GuildPluginData<TPluginType>,
  GuildEvent
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
export function globalEventListener<TEventName extends ValidEvent>(
  blueprint: EventListenerBlueprint<GlobalPluginData<any>, TEventName>
): EventListenerBlueprint<GlobalPluginData<any>, TEventName>;

/**
 * Helper function to create an event listener blueprint for global events.
 * Used for type inference from event name.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `globalEventListener<TPluginType>()(event, listener)`
 */
export function globalEventListener<TEventName extends ValidEvent>(
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
export function globalEventListener<TEventName extends ValidEvent>(
  event: TEventName,
  options: Omit<EventListenerBlueprint<GlobalPluginData<any>, TEventName>, "listener" | "event">,
  listener: EventListenerBlueprint<GlobalPluginData<any>, TEventName>["listener"]
): EventListenerBlueprint<GlobalPluginData<any>, TEventName>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function globalEventListener<TPluginType extends BasePluginType>(): EventListenerBlueprintCreator<
  GlobalPluginData<TPluginType>,
  ValidEvent
>;

export function globalEventListener(...args) {
  return eventListener<GlobalPluginData<any>>(...args);
}
