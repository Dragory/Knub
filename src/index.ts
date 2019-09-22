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

import * as configUtils from "./configUtils";
export { configUtils };

import * as pluginUtils from "./pluginUtils";
export { pluginUtils };

export {
  IPermissionLevelDefinitions,
  IBasePluginConfig,
  IGuildConfig,
  IGlobalConfig,
  IPartialPluginOptions,
  IPluginOptions
} from "./configInterfaces";

export { CommandConfig, CommandDefinition, TypeConverterFn, TypeConversionError } from "knub-command-manager";

export {
  getCommandSignature,
  IKnubPluginCommandDefinition,
  IKnubPluginCommandConfig,
  IKnubPluginCommandManager,
  ICommandContext,
  ICommandExtraData
} from "./commandUtils";

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
