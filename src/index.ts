import "reflect-metadata";

export { Knub } from "./Knub";

export { PluginClass } from "./plugins/PluginClass";
export { PluginBlueprint } from "./plugins/PluginBlueprint";

import * as decorators from "./plugins/decorators";
export { decorators };

export { logger } from "./logger";

import * as configUtils from "./config/configUtils";
export { configUtils };

import * as pluginUtils from "./plugins/pluginUtils";
export { pluginUtils };

export { KnubOptions, KnubArgs, BaseContext, GuildContext, GlobalContext } from "./types";

export {
  PermissionLevels,
  BasePluginConfig,
  BaseConfig,
  PartialPluginOptions,
  PluginOptions,
} from "./config/configTypes";

export { getCommandSignature, PluginCommandConfig, CommandContext } from "./commands/commandUtils";

import * as helpers from "./helpers";
export { helpers };

export { PluginError } from "./plugins/PluginError";

export { PluginConfigManager } from "./config/PluginConfigManager";
export { PluginCommandManager } from "./commands/PluginCommandManager";
export { PluginEventManager } from "./events/PluginEventManager";
export { LockManager, Lock } from "./locks/LockManager";
export { CooldownManager } from "./cooldowns/CooldownManager";

export { TypeConversionError } from "knub-command-manager";

export { asPlugin } from "./plugins/pluginUtils";
export { asCommand } from "./commands/commandUtils";
export { asEventListener } from "./events/eventUtils";
