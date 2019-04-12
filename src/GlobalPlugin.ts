import { Plugin } from "./Plugin";
import { IBasePluginConfig } from "./configInterfaces";

export class GlobalPlugin<TConfig extends {} = IBasePluginConfig> extends Plugin<TConfig> {}
