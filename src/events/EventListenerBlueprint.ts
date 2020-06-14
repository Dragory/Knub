import { Listener, OnOpts } from "./PluginEventManager";
import { BasePluginType } from "../plugins/pluginTypes";

export interface EventListenerBlueprint<TPluginType extends BasePluginType, TEventName extends string = any> {
  event: TEventName;
  listener: Listener<TPluginType, TEventName>;
  opts?: OnOpts;
}

/**
 * Helper function that creates an event listener blueprint.
 * Used for type inference between `event` and the arguments for `listener()`.
 */
export function eventListener<TPluginType extends BasePluginType, TEventName extends string>(
  event: TEventName,
  listener: EventListenerBlueprint<TPluginType, TEventName>["listener"],
  rest?: Omit<EventListenerBlueprint<TPluginType, TEventName>, "event" | "listener">
): EventListenerBlueprint<TPluginType, TEventName> {
  return {
    event,
    listener,
    ...rest,
  };
}
