import { PluginOptions } from "../config/configTypes";
import { Awaitable } from "../utils";
import { PluginData } from "./PluginData";
import { CommandBlueprint } from "../commands/CommandBlueprint";
import { EventListenerBlueprint } from "../events/EventListenerBlueprint";
import { ResolvablePlugin } from "./pluginUtils";
import { CustomOverrideMatcher } from "../config/configUtils";
import { BasePluginType } from "./pluginTypes";

/**
 * Each value in the public interface is a function that returns the actual
 * value that other plugins can access when using the interface.
 * This allows other plugins to be unaware of the pluginData object for the
 * plugin with the public interface.
 */
export interface PluginBlueprintPublicInterface<TPluginType extends BasePluginType> {
  [key: string]: (pluginData: PluginData<TPluginType>) => any;
}

// The actual interface that other plugins receive
export type ResolvedPluginBlueprintPublicInterface<T extends PluginBlueprintPublicInterface<any>> = {
  [P in keyof T]: ReturnType<T[P]>;
};

export interface PluginBlueprint<TPluginType extends BasePluginType = BasePluginType> {
  // REQUIRED: Internal name for the plugin
  name: string;

  // Arbitrary info about the plugin, e.g. description.
  // This property is mainly here to set a convention, as it's not actually used in Knub itself.
  info?: any;

  // Other plugins that are required for this plugin to function. They will be loaded before this plugin.
  dependencies?: ResolvablePlugin[];

  // The plugin's default options, including overrides
  defaultOptions?: PluginOptions<TPluginType>;

  // Commands that are automatically registered on plugin load
  commands?: Array<CommandBlueprint<TPluginType, any>>;

  // Event listeners that are automatically registered on plugin load
  events?: Array<EventListenerBlueprint<TPluginType>>;

  // If this plugin includes any custom overrides, this function evaluates them
  customOverrideMatcher?: CustomOverrideMatcher<TPluginType>;

  // Public interface for this plugin
  public?: PluginBlueprintPublicInterface<TPluginType>;

  onLoad?: (pluginData: PluginData<TPluginType>) => Awaitable<void>;
  onUnload?: (pluginData: PluginData<TPluginType>) => Awaitable<void>;
}
