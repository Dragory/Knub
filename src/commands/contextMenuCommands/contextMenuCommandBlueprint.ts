import type {
  Locale,
  MessageContextMenuCommandInteraction,
  Permissions,
  UserContextMenuCommandInteraction,
} from "discord.js";
import type { AnyPluginData, GlobalPluginData, GuildPluginData } from "../../plugins/PluginData.ts";
import type { BasePluginType } from "../../plugins/pluginTypes.ts";

export interface BaseContextMenuCommandBlueprint {
  name: string;
  nameLocalizations?: Record<Locale, string>;
  descriptionLocalizations?: Record<Locale, string>;
  defaultMemberPermissions?: Permissions;
  configPermission?: string;
  allowDms?: boolean;
}

// MESSAGE CONTEXT MENU COMMANDS

export interface MessageContextMenuCommandBlueprint<TPluginData extends AnyPluginData<any>>
  extends BaseContextMenuCommandBlueprint {
  type: "message-context-menu";
  run: (meta: MessageContextMenuCommandMeta<TPluginData>) => void | Promise<void>;
}

export type MessageContextMenuCommandMeta<TPluginData extends AnyPluginData<any>> = {
  pluginData: TPluginData;
  interaction: MessageContextMenuCommandInteraction;
};

// The two function signatures are not needed here, but for consistency with other blueprint helpers (and in case we
// want to add some inferred generics later) it's still using the same "double-call" signature.
type MessageContextMenuCommandCreator<TPluginData extends AnyPluginData<any>> = (
  blueprint: Omit<MessageContextMenuCommandBlueprint<TPluginData>, "type">,
) => MessageContextMenuCommandBlueprint<TPluginData>;
function messageContextMenuCommand(...args: any[]): unknown {
  if (args.length === 1) {
    return {
      ...args[0],
      type: "message-context-menu",
    } as MessageContextMenuCommandBlueprint<AnyPluginData<any>>;
  }

  if (args.length === 0) {
    return messageContextMenuCommand as MessageContextMenuCommandCreator<any>;
  }

  throw new Error(`No signature of guildMessageContextMenuCommand() takes ${args.length} arguments`);
}

export function guildPluginMessageContextMenuCommand(
  blueprint: Omit<MessageContextMenuCommandBlueprint<GuildPluginData<any>>, "type">,
): MessageContextMenuCommandBlueprint<GuildPluginData<any>>;
export function guildPluginMessageContextMenuCommand<
  TPluginType extends BasePluginType,
>(): MessageContextMenuCommandCreator<GuildPluginData<TPluginType>>;
export function guildPluginMessageContextMenuCommand(...args: unknown[]): unknown {
  return messageContextMenuCommand(...args);
}

export function globalPluginMessageContextMenuCommand(
  blueprint: Omit<MessageContextMenuCommandBlueprint<GlobalPluginData<any>>, "type">,
): MessageContextMenuCommandBlueprint<GlobalPluginData<any>>;
export function globalPluginMessageContextMenuCommand<
  TPluginType extends BasePluginType,
>(): MessageContextMenuCommandCreator<GlobalPluginData<TPluginType>>;
export function globalPluginMessageContextMenuCommand(...args: unknown[]): unknown {
  return messageContextMenuCommand(...args);
}

// USER CONTEXT MENU COMMANDS

export interface UserContextMenuCommandBlueprint<TPluginData extends AnyPluginData<any>>
  extends BaseContextMenuCommandBlueprint {
  type: "user-context-menu";
  run: (meta: UserContextMenuCommandMeta<TPluginData>) => void | Promise<void>;
}

export type UserContextMenuCommandMeta<TPluginData extends AnyPluginData<any>> = {
  pluginData: TPluginData;
  interaction: UserContextMenuCommandInteraction;
};

// The two function signatures are not needed here, but for consistency with other blueprint helpers (and in case we
// want to add some inferred generics later) it's still using the same "double-call" signature.
type UserContextMenuCommandCreator<TPluginData extends AnyPluginData<any>> = (
  blueprint: Omit<UserContextMenuCommandBlueprint<TPluginData>, "type">,
) => UserContextMenuCommandBlueprint<TPluginData>;
function userContextMenuCommand(...args: any[]): unknown {
  if (args.length === 1) {
    return {
      ...args[0],
      type: "user-context-menu",
    } as UserContextMenuCommandBlueprint<AnyPluginData<any>>;
  }

  if (args.length === 0) {
    return userContextMenuCommand as UserContextMenuCommandCreator<any>;
  }

  throw new Error(`No signature of guildUserContextMenuCommand() takes ${args.length} arguments`);
}

export function guildPluginUserContextMenuCommand(
  blueprint: Omit<UserContextMenuCommandBlueprint<GuildPluginData<any>>, "type">,
): UserContextMenuCommandBlueprint<GuildPluginData<any>>;
export function guildPluginUserContextMenuCommand<TPluginType extends BasePluginType>(): UserContextMenuCommandCreator<
  GuildPluginData<TPluginType>
>;
export function guildPluginUserContextMenuCommand(...args: unknown[]): unknown {
  return userContextMenuCommand(...args);
}

export function globalPluginUserContextMenuCommand(
  blueprint: Omit<UserContextMenuCommandBlueprint<GlobalPluginData<any>>, "type">,
): UserContextMenuCommandBlueprint<GlobalPluginData<any>>;
export function globalPluginUserContextMenuCommand<TPluginType extends BasePluginType>(): UserContextMenuCommandCreator<
  GlobalPluginData<TPluginType>
>;
export function globalPluginUserContextMenuCommand(...args: unknown[]): unknown {
  return userContextMenuCommand(...args);
}
