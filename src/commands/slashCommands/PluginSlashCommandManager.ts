import { AnySlashCommandSignature, SlashCommandBlueprint } from "./slashCommandBlueprint";
import { AnyPluginData } from "../../plugins/PluginData";
import { ChatInputCommandInteraction, CommandInteractionOption, Interaction } from "discord.js";
import { SlashCommandMeta } from "./slashCommandUtils";
import { SlashGroupBlueprint } from "./slashGroupBlueprint";

type CommandOrGroup<TPluginData extends AnyPluginData<any>> = SlashCommandBlueprint<TPluginData, AnySlashCommandSignature> | SlashGroupBlueprint<TPluginData>;

export class PluginSlashCommandManager<TPluginData extends AnyPluginData<any>> {
  protected pluginData: TPluginData | undefined;
  protected nameToCommandOrGroup: Record<string, CommandOrGroup<TPluginData>> = {};

  public setPluginData(pluginData: TPluginData): void {
    if (this.pluginData) {
      throw new Error("Plugin data already set");
    }

    this.pluginData = pluginData;
  }

  public add(commandOrGroup: CommandOrGroup<TPluginData>): void {
    this.nameToCommandOrGroup[commandOrGroup.name] = commandOrGroup;
  }

  public runFromInteraction(interaction: Interaction): Promise<void> | null {
    if (! interaction.isChatInputCommand()) {
      return null;
    }

    if (! this.nameToCommandOrGroup[interaction.commandName]) {
      return null;
    }

    const commandOrGroup = this.nameToCommandOrGroup[interaction.commandName];
    const command = this.resolveSubcommand(interaction, commandOrGroup);
    if (! command) {
      return null;
    }

    const nestedOptions = this.getNestedOptionsData(interaction.options.data);
    const receivedOptionNames = new Set(nestedOptions.map(opt => opt.name));
    const optionsWithValues: Record<string, any> = {};
    for (const option of command.signature) {
      // If we haven't received a specific option at all, it has to be optional and we can set it to null.
      // We *could* put in a sanity check here to make sure we don't do this for options marked as required,
      // but we should be able to trust the slash command system that a required option *will always be included*.
      if (! receivedOptionNames.has(option.name)) {
        optionsWithValues[option.name] = null;
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      optionsWithValues[option.name] = option.resolveValue(interaction);
    }

    const meta: SlashCommandMeta<TPluginData, AnySlashCommandSignature> = {
      interaction,
      options: optionsWithValues,
      pluginData: this.pluginData!,
    };

    return Promise.resolve(command.run(meta));
  }

  protected resolveSubcommand(interaction: ChatInputCommandInteraction, commandOrGroup: CommandOrGroup<TPluginData>): SlashCommandBlueprint<TPluginData, AnySlashCommandSignature> | null {
    if (commandOrGroup.type === "slash") {
      return commandOrGroup;
    }

    const subcommandGroupName = interaction.options.getSubcommandGroup();
    const subcommandName = interaction.options.getSubcommand();

    if (subcommandGroupName) {
      for (const item of commandOrGroup.subcommands) {
        if (item.name !== subcommandGroupName) {
          continue;
        }

        if (item.type === "slash-group") {
          for (const subItem of item.subcommands) {
            if (subItem.name !== subcommandName) {
              continue;
            }

            if (subItem.type === "slash") {
              return subItem;
            }
          }
        }

        // eslint-disable-next-line no-console
        console.warn(`[WARN] Received interaction for subcommand group ${interaction.commandName} -> ${subcommandGroupName} but expected subcommand`);
        return null;
      }
    }

    if (subcommandName) {
      for (const item of commandOrGroup.subcommands) {
        if (item.name !== subcommandName) {
          continue;
        }

        if (item.type === "slash") {
          return item;
        }

        // eslint-disable-next-line no-console
        console.warn(`[WARN] Received interaction for subcommand ${interaction.commandName} -> ${subcommandName} but expected subcommand group`);
        return null;
      }
    }

    return null;
  }

  protected getNestedOptionsData(optionsData: readonly CommandInteractionOption[]): readonly CommandInteractionOption[] {
    for (const option of optionsData) {
      if ("options" in option && option.options != null) {
        return this.getNestedOptionsData(option.options);
      }
    }

    return optionsData;
  }
}
