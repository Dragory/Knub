import "reflect-metadata";

import { Knub } from "./Knub";

// Include both, a named and default export
export default Knub;
export { Knub };

export { Plugin } from "./Plugin";
export { GlobalPlugin } from "./GlobalPlugin";

export { default as decorators } from "./decorators";

export { logger } from "./logger";
import * as utils from "./utils";
export { utils };

export { ICommandOptions } from "./CommandManager";
export {
  IPermissionLevelDefinitions,
  IPluginConfig,
  IPluginPermissions,
  IGuildConfig,
  IGlobalConfig,
  IPluginOptions
} from "./configInterfaces";
