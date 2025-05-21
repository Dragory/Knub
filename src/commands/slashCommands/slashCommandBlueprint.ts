import { Locale, Permissions } from "discord.js";
import { AnyPluginData, GlobalPluginData, GuildPluginData } from "../../plugins/PluginData.ts";
import { BasePluginType } from "../../plugins/pluginTypes.ts";
import { BaseSlashCommandOption } from "./slashCommandOptions.ts";
import { SlashCommandFn, SlashCommandSignature } from "./slashCommandUtils.ts";

export type AnySlashCommandSignature = Array<BaseSlashCommandOption<any, any>>;

export type SlashCommandBlueprint<
  TPluginData extends AnyPluginData<any>,
  TSignature extends AnySlashCommandSignature,
> = {
  type: "slash";
  name: string;
  nameLocalizations?: Record<Locale, string>;
  description: string;
  descriptionLocalizations?: Record<Locale, string>;
  defaultMemberPermissions?: Permissions;
  configPermission?: string;
  allowDms?: boolean;
  signature: TSignature;
  run: SlashCommandFn<TPluginData, TSignature>;
};

type SlashCommandBlueprintCreator<TPluginData extends AnyPluginData<any>> = <TSignature extends SlashCommandSignature>(
  blueprint: Omit<SlashCommandBlueprint<TPluginData, TSignature>, "type">,
) => SlashCommandBlueprint<TPluginData, TSignature>;

function slashCommand<TPluginData extends AnyPluginData<BasePluginType>>(...args) {
  if (args.length === 1) {
    // (blueprint)
    // Return command blueprint
    return {
      ...args[0],
      type: "slash",
    };
  }

  if (args.length === 0) {
    // No arguments, with TPluginType - return self
    return slashCommand as SlashCommandBlueprintCreator<TPluginData>;
  }

  throw new Error(`No signature of command() takes ${args.length} arguments`);
}

/**
 * Helper function that creates a command blueprint for a guild slash command.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `guildCommand<TPluginType>()(blueprint)`
 */
export function guildPluginSlashCommand<TSignature extends SlashCommandSignature>(
  blueprint: Omit<SlashCommandBlueprint<GuildPluginData<any>, TSignature>, "type">,
): SlashCommandBlueprint<GuildPluginData<any>, TSignature>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function guildPluginSlashCommand<TPluginType extends BasePluginType>(): SlashCommandBlueprintCreator<
  GuildPluginData<TPluginType>
>;

export function guildPluginSlashCommand(...args: any[]): any {
  return slashCommand<GuildPluginData<any>>(...args);
}

/**
 * Helper function that creates a command blueprint for a guild slash command.
 *
 * To specify `TPluginType` for additional type hints, use:
 * `guildCommand<TPluginType>()(blueprint)`
 */
export function globalPluginSlashCommand<TSignature extends SlashCommandSignature>(
  blueprint: Omit<SlashCommandBlueprint<GlobalPluginData<any>, TSignature>, "type">,
): SlashCommandBlueprint<GlobalPluginData<any>, TSignature>;

/**
 * Specify `TPluginType` for type hints and return self
 */
export function globalPluginSlashCommand<TPluginType extends BasePluginType>(): SlashCommandBlueprintCreator<
  GlobalPluginData<TPluginType>
>;

export function globalPluginSlashCommand(...args: any[]): any {
  return slashCommand<GlobalPluginData<any>>(...args);
}
