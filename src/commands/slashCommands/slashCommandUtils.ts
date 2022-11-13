import { AnyPluginData, GlobalPluginData, GuildPluginData } from "../../plugins/PluginData";
import { BaseSlashCommandOption } from "./slashCommandOptions";
import { ChatInputCommandInteraction } from "discord.js";
import { BasePluginType } from "../../plugins/pluginTypes";
import { SlashCommandBlueprint } from "./slashCommandBlueprint";

export type SlashCommandSignature = Array<BaseSlashCommandOption<any, any>>;

type OptionsFromSignature<TSignature extends SlashCommandSignature> = {
  [Opt in TSignature[number] as Opt["name"]]: Opt["required"] extends true
    ? ReturnType<Opt["resolveValue"]>
    : ReturnType<Opt["resolveValue"]> | null;
};

export type SlashCommandMeta<TPluginData extends AnyPluginData<any>, TSignature extends SlashCommandSignature> = {
  interaction: ChatInputCommandInteraction;
  options: OptionsFromSignature<TSignature>;
  pluginData: TPluginData;
};

export type SlashCommandFn<
  TPluginData extends AnyPluginData<any>,
  TSignature extends SlashCommandSignature,
> = (
  meta: SlashCommandMeta<TPluginData, TSignature>,
) => void | Promise<void>;
