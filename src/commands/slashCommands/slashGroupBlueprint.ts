import { Locale, Permissions } from "discord.js";
import { AnyPluginData, GlobalPluginData, GuildPluginData } from "../../plugins/PluginData";
import { BasePluginType } from "../../plugins/pluginTypes";
import { SlashCommandBlueprint } from "./slashCommandBlueprint";

export type SlashGroupBlueprint<TPluginData extends AnyPluginData<any>> = {
  type: "slash-group";
  name: string;
  nameLocalizations?: Record<Locale, string>;
  description: string;
  descriptionLocalizations?: Record<Locale, string>;
  defaultMemberPermissions?: Permissions;
  allowDms?: boolean;
  subcommands: Array<SlashCommandBlueprint<TPluginData, any> | SlashGroupBlueprint<TPluginData>>;
};

type SlashGroupBlueprintCreator<TPluginData extends AnyPluginData<any>> = (
  blueprint: Omit<SlashGroupBlueprint<TPluginData>, "type">,
) => SlashGroupBlueprint<TPluginData>;

function slashGroup<TPluginData extends AnyPluginData<BasePluginType>>(...args) {
  if (args.length === 1) {
    // (blueprint)
    // Return group blueprint
    return {
      ...args[0],
      type: "slash-group",
    };
  }

  if (args.length === 0) {
    // No arguments, with TPluginType - return self
    return slashGroup as SlashGroupBlueprintCreator<TPluginData>;
  }

  throw new Error(`No signature of slashGroup() takes ${args.length} arguments`);
}

/**
 * Helper function that creates a blueprint for a guild slash group.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `guildPluginSlashGroup<TPluginType>()(blueprint)`
 */
export function guildPluginSlashGroup(
  blueprint: Omit<SlashGroupBlueprint<GuildPluginData<any>>, "type">,
): SlashGroupBlueprint<GuildPluginData<any>>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function guildPluginSlashGroup<TPluginType extends BasePluginType>(): SlashGroupBlueprintCreator<
  GuildPluginData<TPluginType>
>;

export function guildPluginSlashGroup(...args: any[]): any {
  return slashGroup<GuildPluginData<any>>(...args);
}

/**
 * Helper function that creates a blueprint for a guild slash group.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `globalPluginSlashGroup<TPluginType>()(blueprint)`
 */
export function globalPluginSlashGroup(
  blueprint: Omit<SlashGroupBlueprint<GlobalPluginData<any>>, "type">,
): SlashGroupBlueprint<GlobalPluginData<any>>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function globalPluginSlashGroup<TPluginType extends BasePluginType>(): SlashGroupBlueprintCreator<
  GlobalPluginData<TPluginType>
>;

export function globalPluginSlashGroup(...args: any[]): any {
  return slashGroup<GlobalPluginData<any>>(...args);
}
