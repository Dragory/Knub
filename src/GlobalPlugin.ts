import { Plugin } from "./Plugin";
import { BasePluginConfig } from "./config/configInterfaces";

export class GlobalPlugin<TConfig extends {} = BasePluginConfig> extends Plugin<TConfig> {}

export class AnyExtendedGlobalPlugin extends GlobalPlugin<any> {}
