import { IParameter } from "knub-command-manager";
import { CommandFn, PluginCommandConfig } from "./commandUtils";

export interface CommandBlueprint {
  trigger: string;
  parameters?: IParameter[];
  run: CommandFn;
  config?: PluginCommandConfig;
}
