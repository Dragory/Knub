import { Listener, OnOpts } from "./PluginEventManager";
import { BasePluginType } from "../plugins/pluginTypes";

export interface EventListenerBlueprint<TPluginType extends BasePluginType, TEventName extends string = any> {
  event: TEventName;
  listener: Listener<TPluginType, TEventName>;
  opts?: OnOpts;
}
