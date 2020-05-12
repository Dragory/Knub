import { BasePluginConfig, PluginOptions } from "../config/configTypes";
import { CustomArgumentTypes } from "../commands/commandUtils";
import { Awaitable } from "../utils";
import { PluginData } from "./PluginData";
import { CommandBlueprint } from "../commands/CommandBlueprint";
import { EventListenerBlueprint } from "../events/EventListenerBlueprint";
import { ResolvablePlugin } from "./pluginUtils";

/**
 * Each value in the public interface is a function that returns the actual
 * value that other plugins can access when using the interface.
 * This allows other plugins to be unaware of the pluginData object for the
 * plugin with the public interface.
 */
export interface PluginBlueprintPublicInterface<TConfig, TCustomOverrideCriteria> {
  [key: string]: (pluginData: PluginData<TConfig, TCustomOverrideCriteria>) => any;
}

// The actual interface that other plugins receive
export type ResolvedPluginBlueprintPublicInterface<T extends PluginBlueprintPublicInterface<any, any>> = {
  [P in keyof T]: ReturnType<T[P]>;
};

export interface PluginBlueprint<TConfig extends {} = BasePluginConfig, TCustomOverrideCriteria extends {} = {}> {
  // REQUIRED: Internal name for the plugin
  name: string;

  // Arbitrary info about the plugin, e.g. description.
  // This property is mainly here to set a convention, as it's not actually used in Knub itself.
  info?: any;

  // Other plugins that are required for this plugin to function. They will be loaded before this plugin.
  dependencies?: ResolvablePlugin[];

  // The plugin's default options, including overrides
  defaultOptions?: PluginOptions<TConfig, TCustomOverrideCriteria>;

  // Commands that are automatically registered on plugin load
  commands?: CommandBlueprint[];

  // Event listeners that are automatically registered on plugin load
  events?: EventListenerBlueprint[];

  // Custom argument types for commands
  customArgumentTypes?: CustomArgumentTypes;

  // Public interface for this plugin
  public?: PluginBlueprintPublicInterface<TConfig, TCustomOverrideCriteria>;

  onLoad?: (pluginData: PluginData) => Awaitable<void>;
  onUnload?: (pluginData: PluginData) => Awaitable<void>;
}
