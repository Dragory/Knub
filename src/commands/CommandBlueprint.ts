import { IParameter } from "knub-command-manager";
import { CommandFn, ICommandExtraData, PluginCommandConfig } from "./commandUtils";

type CommandSource = "guild" | "group" | "dm";

export interface CommandBlueprint {
  trigger: string;
  parameters?: IParameter[];
  run: CommandFn;
  config?: PluginCommandConfig;

  // Required permission name
  permission?: string;

  // Restrict the source of the command. Defaults to guild messages only.
  source?: CommandSource | CommandSource[];

  // Locks to wait for before running the command, and to acquire for the duration of the command
  locks?: string | string[];

  // Command cooldown. Time is in milliseconds.
  cooldown?:
    | number
    | {
        amount: number;
        permission: string;
      };

  // Description of the command
  description?: string;

  // Usage information for the command
  usage?: string;
}
