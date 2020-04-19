import { Plugin } from "./Plugin";
import { BasePluginConfig } from "./configInterfaces";

export class GlobalPlugin<TConfig extends {} = BasePluginConfig> extends Plugin<TConfig> {}

export class AnyExtendedGlobalPlugin extends GlobalPlugin<any> {}
