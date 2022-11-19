import {
  APIApplicationCommand,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  Client,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes
} from "discord.js";
import { AnySlashCommandSignature, SlashCommandBlueprint } from "./slashCommandBlueprint";
import { AnyPluginData } from "../../plugins/PluginData";
import { BaseSlashCommandOption } from "./slashCommandOptions";
import {
  APIApplicationCommandOption
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import { SlashGroupBlueprint } from "./slashGroupBlueprint";
import { indexBy } from "../../utils";

type CommandOrGroup = SlashCommandBlueprint<AnyPluginData<any>, any> | SlashGroupBlueprint<any>;

type RegisterResult = {
  create: number;
  update: number;
  delete: number;
};

export async function registerSlashCommands(client: Client<true>, commands: CommandOrGroup[]): Promise<RegisterResult> {
  const pendingAPIData = commands.map(cmd => commandOrGroupToAPIData(cmd));
  const pendingAPIDataByName = indexBy(pendingAPIData, "name");

  const existingAPIData = await client.rest.get(
    Routes.applicationCommands(client.application.id),
    { query: new URLSearchParams({ with_localizations: "true" }) },
  ) as APIApplicationCommand[];
  const existingAPIDataByName = indexBy(existingAPIData, "name");

  const diff = compareAPIData(pendingAPIDataByName, existingAPIDataByName);
  for (const dataToCreate of diff.create) {
    await client.rest.post(
      Routes.applicationCommands(client.application.id),
      { body: dataToCreate }
    );
  }
  for (const dataToUpdate of diff.update) {
    // Updating a command is the same operation as creating one, but we're keeping them separate here for semantic purposes
    await client.rest.post(
      Routes.applicationCommands(client.application.id),
      { body: dataToUpdate }
    );
  }
  for (const dataToDelete of diff.delete) {
    await client.rest.delete(
      Routes.applicationCommand(client.application.id, dataToDelete.id),
    );
  }

  return {
    create: diff.create.length,
    update: diff.update.length,
    delete: diff.delete.length,
  };
}

type DiffResult = {
  create: RESTPostAPIChatInputApplicationCommandsJSONBody[];
  update: RESTPostAPIChatInputApplicationCommandsJSONBody[];
  delete: APIApplicationCommand[];
};

function compareAPIData(pendingAPIDataByName: Map<string, RESTPostAPIChatInputApplicationCommandsJSONBody>, existingAPIDataByName: Map<string, APIApplicationCommand>): DiffResult {
  const diff: DiffResult = {
    create: [],
    update: [],
    delete: [],
  };

  for (const pendingName of pendingAPIDataByName.keys()) {
    if (! existingAPIDataByName.has(pendingName)) {
      diff.create.push(pendingAPIDataByName.get(pendingName)!);
      continue;
    }

    if (hasPendingDataChanged(pendingAPIDataByName.get(pendingName), existingAPIDataByName.get(pendingName))) {
      diff.update.push(pendingAPIDataByName.get(pendingName)!);
    }
  }

  for (const [existingName, existingItem] of existingAPIDataByName.entries()) {
    if (existingItem.type !== ApplicationCommandType.ChatInput) {
      continue;
    }

    if (! pendingAPIDataByName.has(existingName)) {
      diff.delete.push(existingAPIDataByName.get(existingName)!);
    }
  }

  return diff;
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
function hasPendingDataChanged(pendingData: any, existingData: any): boolean {
  if (pendingData == null && existingData == null) {
    return false;
  }

  if (typeof pendingData !== typeof existingData) {
    return true;
  }

  if (typeof pendingData !== "object") {
    if (pendingData !== existingData) {
    }
    return (pendingData !== existingData);
  }

  if (Array.isArray(pendingData)) {
    if (! Array.isArray(existingData)) {
      return true;
    }

    if (pendingData.length !== existingData.length) {
      return true;
    }

    for (const [i, pendingItem] of pendingData.entries()) {
      const existingItem = existingData[i]!;
      if (hasPendingDataChanged(pendingItem, existingItem)) {
        return true;
      }
    }

    return false;
  }

  // We only care about changed keys in pendingData
  // Extra keys in existingData are fine
  for (const key of Object.keys(pendingData)) {
    if (hasPendingDataChanged(pendingData[key], existingData[key])) {
      return true;
    }
  }

  if (("default_member_permissions" in existingData) && ! ("default_member_permissions" in pendingData)) {
    return true;
  }

  return false;
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */

function commandOrGroupToAPIData(input: CommandOrGroup): RESTPostAPIChatInputApplicationCommandsJSONBody {
  if (input.type === "slash-group") {
    return slashGroupToAPIData(input);
  }

  if (input.type === "slash") {
    return slashCommandToAPIData(input);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/restrict-template-expressions
  throw new Error(`Unknown command type: ${(input as any).type}`);
}

function slashGroupToAPIData(blueprint: SlashGroupBlueprint<AnyPluginData<any>>, depth = 1): RESTPostAPIChatInputApplicationCommandsJSONBody {
  if (depth >= 3) {
    throw new Error("Subcommands can only be nested in one subcommand group");
  }

  if ("defaultMemberPermissions" in blueprint && depth > 1) {
    throw new Error("Only top-level slash groups and commands can have defaultMemberPermissions");
  }

  return {
    type: ApplicationCommandType.ChatInput,
    name: blueprint.name,
    name_localizations: blueprint.nameLocalizations,
    description: blueprint.description,
    description_localizations: blueprint.descriptionLocalizations,
    ...(depth === 1 ? {
      // Only included on the top level, not in a nested subcommand group
      default_member_permissions: blueprint.defaultMemberPermissions,
      dm_permission: Boolean(blueprint.allowDms),
    } : {}),
    options: blueprint.subcommands.map(subCommand => {
      if (subCommand.type === "slash-group") {
        return {
          ...slashGroupToAPIData(subCommand, depth + 1),
          type: ApplicationCommandOptionType.SubcommandGroup,
        } as APIApplicationCommandOption;
      }

      return {
        ...slashCommandToAPIData(subCommand, depth + 1),
        type: ApplicationCommandOptionType.Subcommand,
      } as APIApplicationCommandOption;
    }),
  };
}

function slashCommandToAPIData(blueprint: SlashCommandBlueprint<AnyPluginData<any>, AnySlashCommandSignature>, depth = 1): RESTPostAPIChatInputApplicationCommandsJSONBody {
  if ("defaultMemberPermissions" in blueprint && depth > 1) {
    throw new Error("Only top-level slash groups and commands can have defaultMemberPermissions");
  }

  return {
    name: blueprint.name,
    name_localizations: blueprint.nameLocalizations,
    description: blueprint.description,
    description_localizations: blueprint.descriptionLocalizations,
    ...(depth === 1 ? {
      // Only included on the top level, not in subcommands
      default_member_permissions: blueprint.defaultMemberPermissions,
      dm_permission: Boolean(blueprint.allowDms),
    } : {}),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    options: blueprint.signature.map(option => optionToAPIData(option)),
  };
}

function optionToAPIData(option: BaseSlashCommandOption<any, AnySlashCommandSignature>): APIApplicationCommandOption {
  return {
    name: option.name,
    name_localizations: option.nameLocalizations,
    description: option.description,
    description_localizations: option.descriptionLocalizations,
    required: option.required,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    type: option.type,
    ...option.getExtraAPIProps(),
  };
}
