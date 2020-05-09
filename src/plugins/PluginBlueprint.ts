import { BasePluginConfig, PluginOptions } from "../config/configInterfaces";
import { CustomArgumentTypes } from "../commands/commandUtils";
import { Awaitable } from "../utils";
import { PluginData } from "./PluginData";
import { CommandBlueprint } from "../commands/CommandBlueprint";
import { EventListenerBlueprint } from "../events/EventListenerBlueprint";

export interface PluginBlueprint<TConfig extends {} = BasePluginConfig, TCustomOverrideCriteria extends {} = {}> {
  // REQUIRED: Internal name for the plugin
  name: string;

  // Arbitrary info about the plugin, e.g. description.
  // This property is mainly here to set a convention, as it's not actually used in Knub itself.
  info?: any;

  // The plugin's default options, including overrides
  defaultOptions?: PluginOptions<TConfig, TCustomOverrideCriteria>;

  // Commands that are automatically registered on plugin load
  commands?: CommandBlueprint[];

  // Event listeners that are automatically registered on plugin load
  events?: EventListenerBlueprint[];

  // Custom argument types for commands
  customArgumentTypes?: CustomArgumentTypes;

  onLoad?: (pluginData: PluginData) => Awaitable<void>;
  onUnload?: (pluginData: PluginData) => Awaitable<void>;
}
