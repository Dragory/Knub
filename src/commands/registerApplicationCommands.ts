import { APIApplicationCommandOption } from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {
  APIApplicationCommand,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  Client,
  RESTPostAPIApplicationCommandsJSONBody,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
  Routes,
} from "discord.js";
import { AnyPluginData } from "../plugins/PluginData";
import { indexBy } from "../utils";
import {
  MessageContextMenuCommandBlueprint,
  UserContextMenuCommandBlueprint,
} from "./contextMenuCommands/contextMenuCommandBlueprint";
import { AnySlashCommandSignature, SlashCommandBlueprint } from "./slashCommands/slashCommandBlueprint";
import { BaseSlashCommandOption } from "./slashCommands/slashCommandOptions";
import { SlashGroupBlueprint } from "./slashCommands/slashGroupBlueprint";

export type AnyApplicationCommandBlueprint =
  | SlashCommandBlueprint<any, any>
  | SlashGroupBlueprint<any>
  | MessageContextMenuCommandBlueprint<any>
  | UserContextMenuCommandBlueprint<any>;

type RegisterResult = {
  create: number;
  update: number;
  delete: number;
};

export async function registerApplicationCommands(
  client: Client<true>,
  commands: AnyApplicationCommandBlueprint[],
): Promise<RegisterResult> {
  const pendingAPIData = commands.map((cmd) => applicationCommandToAPIData(cmd));
  const pendingAPIDataByName = indexBy(pendingAPIData, "name");

  const existingAPIData = (await client.rest.get(Routes.applicationCommands(client.application.id), {
    query: new URLSearchParams({ with_localizations: "true" }),
  })) as APIApplicationCommand[];
  const existingAPIDataByName = indexBy(existingAPIData, "name");

  const diff = compareAPIData(pendingAPIDataByName, existingAPIDataByName);
  for (const dataToCreate of diff.create) {
    await client.rest.post(Routes.applicationCommands(client.application.id), { body: dataToCreate });
  }
  for (const dataToUpdate of diff.update) {
    // Updating a command is the same operation as creating one, but we're keeping them separate here for semantic purposes
    await client.rest.post(Routes.applicationCommands(client.application.id), { body: dataToUpdate });
  }
  for (const dataToDelete of diff.delete) {
    await client.rest.delete(Routes.applicationCommand(client.application.id, dataToDelete.id));
  }

  return {
    create: diff.create.length,
    update: diff.update.length,
    delete: diff.delete.length,
  };
}

type DiffResult = {
  create: RESTPostAPIApplicationCommandsJSONBody[];
  update: RESTPostAPIApplicationCommandsJSONBody[];
  delete: APIApplicationCommand[];
};

function compareAPIData(
  pendingAPIDataByName: Map<string, RESTPostAPIApplicationCommandsJSONBody>,
  existingAPIDataByName: Map<string, APIApplicationCommand>,
): DiffResult {
  const diff: DiffResult = {
    create: [],
    update: [],
    delete: [],
  };

  for (const pendingName of pendingAPIDataByName.keys()) {
    if (!existingAPIDataByName.has(pendingName)) {
      diff.create.push(pendingAPIDataByName.get(pendingName)!);
      continue;
    }

    if (hasPendingDataChanged(pendingAPIDataByName.get(pendingName), existingAPIDataByName.get(pendingName))) {
      diff.update.push(pendingAPIDataByName.get(pendingName)!);
    }
  }

  for (const existingName of existingAPIDataByName.keys()) {
    if (!pendingAPIDataByName.has(existingName)) {
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
    return pendingData !== existingData;
  }

  if (Array.isArray(pendingData)) {
    if (!Array.isArray(existingData)) {
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
    // Exception: An empty options list is not returned by the API
    if (
      key === "options" &&
      Array.isArray(pendingData[key]) &&
      pendingData[key].length === 0 &&
      existingData[key] == null
    ) {
      continue;
    }
    if (hasPendingDataChanged(pendingData[key], existingData[key])) {
      return true;
    }
  }

  if ("default_member_permissions" in existingData && !("default_member_permissions" in pendingData)) {
    return true;
  }

  return false;
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */

function applicationCommandToAPIData(input: AnyApplicationCommandBlueprint): RESTPostAPIApplicationCommandsJSONBody {
  if (input.type === "slash-group") {
    return slashGroupToAPIData(input);
  }

  if (input.type === "slash") {
    return slashCommandToAPIData(input);
  }

  if (input.type === "message-context-menu") {
    return messageContextMenuCommandToAPIData(input);
  }

  if (input.type === "user-context-menu") {
    return userContextMenuCommandToAPIData(input);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/restrict-template-expressions
  throw new Error(`Unknown command type: ${(input as any).type}`);
}

function slashGroupToAPIData(
  blueprint: SlashGroupBlueprint<AnyPluginData<any>>,
  depth = 1,
): RESTPostAPIChatInputApplicationCommandsJSONBody {
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
    ...(depth === 1
      ? {
          // Only included on the top level, not in a nested subcommand group
          default_member_permissions: blueprint.defaultMemberPermissions ?? "0",
          dm_permission: Boolean(blueprint.allowDms),
        }
      : {}),
    options: blueprint.subcommands.map((subCommand) => {
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

function slashCommandToAPIData(
  blueprint: SlashCommandBlueprint<AnyPluginData<any>, AnySlashCommandSignature>,
  depth = 1,
): RESTPostAPIChatInputApplicationCommandsJSONBody {
  if ("defaultMemberPermissions" in blueprint && depth > 1) {
    throw new Error("Only top-level slash groups and commands can have defaultMemberPermissions");
  }

  return {
    name: blueprint.name,
    name_localizations: blueprint.nameLocalizations,
    description: blueprint.description,
    description_localizations: blueprint.descriptionLocalizations,
    ...(depth === 1
      ? {
          // Only included on the top level, not in subcommands
          default_member_permissions: blueprint.defaultMemberPermissions ?? "0",
          dm_permission: Boolean(blueprint.allowDms),
        }
      : {}),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    options: blueprint.signature.map((option) => optionToAPIData(option)),
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

function messageContextMenuCommandToAPIData(
  blueprint: MessageContextMenuCommandBlueprint<any>,
): RESTPostAPIContextMenuApplicationCommandsJSONBody {
  return {
    type: ApplicationCommandType.Message,
    name: blueprint.name,
    name_localizations: blueprint.nameLocalizations,
    description_localizations: blueprint.descriptionLocalizations,
    default_member_permissions: blueprint.defaultMemberPermissions ?? "0",
    dm_permission: Boolean(blueprint.allowDms),
  };
}

function userContextMenuCommandToAPIData(
  blueprint: UserContextMenuCommandBlueprint<any>,
): RESTPostAPIContextMenuApplicationCommandsJSONBody {
  return {
    type: ApplicationCommandType.User,
    name: blueprint.name,
    name_localizations: blueprint.nameLocalizations,
    description_localizations: blueprint.descriptionLocalizations,
    default_member_permissions: blueprint.defaultMemberPermissions ?? "0",
    dm_permission: Boolean(blueprint.allowDms),
  };
}
