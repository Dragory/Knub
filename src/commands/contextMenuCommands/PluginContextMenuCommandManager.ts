import { Interaction, MessageContextMenuCommandInteraction } from "discord.js";
import { AnyPluginData } from "../../plugins/PluginData";
import { get } from "../../utils";
import { MessageContextMenuCommandBlueprint, UserContextMenuCommandBlueprint } from "./contextMenuCommandBlueprint";

type AnyContextMenuCommand<TPluginData extends AnyPluginData<any>> =
  | MessageContextMenuCommandBlueprint<TPluginData>
  | UserContextMenuCommandBlueprint<TPluginData>;

export class PluginContextMenuCommandManager<TPluginData extends AnyPluginData<any>> {
  #pluginData: TPluginData | null = null;

  #nameToCommand: Record<string, AnyContextMenuCommand<TPluginData>> = {};

  setPluginData(pluginData: TPluginData): void {
    this.#pluginData = pluginData;
  }

  add(command: AnyContextMenuCommand<TPluginData>): void {
    this.#nameToCommand[command.name] = command;
  }

  public getAll(): Array<AnyContextMenuCommand<TPluginData>> {
    return Object.values(this.#nameToCommand);
  }

  async runFromInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isContextMenuCommand()) {
      return;
    }

    if (!this.#nameToCommand[interaction.commandName]) {
      return;
    }

    const command = this.#nameToCommand[interaction.commandName]!;

    // Check custom, config-based permissions
    if (command.configPermission) {
      const matchingConfig = await this.#pluginData!.config.getMatchingConfig({
        member: interaction.member,
        userId: interaction.user.id,
        channel: interaction.channel,
      });
      if (!get(matchingConfig, command.configPermission)) {
        void interaction.reply({
          content: "You don't have permission to use this command",
          ephemeral: true,
        });
        return;
      }
    }

    if (interaction.isMessageContextMenuCommand()) {
      await (command as MessageContextMenuCommandBlueprint<TPluginData>).run({
        pluginData: this.#pluginData!,
        interaction,
      });
      return;
    }

    if (interaction.isUserContextMenuCommand()) {
      await (command as UserContextMenuCommandBlueprint<TPluginData>).run({
        pluginData: this.#pluginData!,
        interaction,
      });
      return;
    }

    throw new Error("Unknown context menu command type encountered");
  }
}
