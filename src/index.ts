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

export { ICommandConfig, ICommandDefinition, IMatchedCommand } from "./CommandManager";
export {
  IPermissionLevelDefinitions,
  IBasePluginConfig,
  IGuildConfig,
  IGlobalConfig,
  IPartialPluginOptions,
  IPluginOptions
} from "./configInterfaces";

export { CommandArgumentTypeError, getCommandSignature } from "./commandUtils";

export {
  waitForReaction,
  waitForReply,
  reply,
  disableLinkPreviews,
  disableCodeBlocks,
  deactivateMentions,
  getInviteLink
} from "./helpers";

export { PluginError } from "./PluginError";

export { LockManager, Lock } from "./LockManager";

export { CooldownManager } from "./CooldownManager";
