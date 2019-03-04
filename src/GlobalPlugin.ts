import { Plugin } from "./Plugin";
import { IBasePluginConfig, IBasePluginPermissions } from "./configInterfaces";

export class GlobalPlugin<
  TConfig extends {} = IBasePluginConfig,
  TPermissions extends {} = IBasePluginPermissions
> extends Plugin<TConfig, TPermissions> {}
