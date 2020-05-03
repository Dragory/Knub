import { Listener, OnOpts } from "./PluginEventManager";

export interface EventListenerBlueprint<T extends string = any> {
  event: T;
  listener: Listener<T>;
  opts?: OnOpts;
}
