import type { ChatInputCommandInteraction } from "discord.js";
import type { AnyPluginData } from "../../plugins/PluginData.ts";
import type { BaseSlashCommandOption } from "./slashCommandOptions.ts";

export type SlashCommandSignature = Array<BaseSlashCommandOption<any, any>>;

export type OptionsFromSignature<TSignature extends SlashCommandSignature> = {
  [Opt in TSignature[number] as Opt["name"]]: Opt["required"] extends true
    ? ReturnType<Opt["resolveValue"]>
    : ReturnType<Opt["resolveValue"]> | null;
};

export type SlashCommandMeta<TPluginData extends AnyPluginData<any>, TSignature extends SlashCommandSignature> = {
  interaction: ChatInputCommandInteraction;
  options: OptionsFromSignature<TSignature>;
  pluginData: TPluginData;
};

export type SlashCommandFn<TPluginData extends AnyPluginData<any>, TSignature extends SlashCommandSignature> = (
  meta: SlashCommandMeta<TPluginData, TSignature>,
) => void | Promise<void>;
