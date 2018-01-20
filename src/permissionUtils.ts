import { IBasicPermissions } from "./ConfigInterfaces";
import { Message } from "discord.js";

export function checkBasicPermissions(permissions: IBasicPermissions, msg: Message) {
  // Explicit channel IDs
  // If channels are specified, the command won't trigger outside of the specified channels, not even by admins
  if (permissions.channels && permissions.channels.length && !permissions.channels.includes(msg.channel.id)) {
    return false;
  }

  if (
    permissions.exclude_channels &&
    permissions.exclude_channels.length &&
    permissions.exclude_channels.includes(msg.channel.id)
  ) {
    return false;
  }

  // Explicit user IDs
  if (permissions.users && permissions.users.length && permissions.users.includes(msg.author.id)) {
    return true;
  }

  if (
    permissions.exclude_users &&
    permissions.exclude_users.length &&
    permissions.exclude_users.includes(msg.author.id)
  ) {
    return false;
  }

  // Explicit role IDs
  if (
    msg.member &&
    permissions.roles &&
    permissions.roles.length &&
    permissions.roles.some(role => msg.member.roles.has(role))
  ) {
    return true;
  }

  if (
    msg.member &&
    permissions.exclude_roles &&
    permissions.exclude_roles.length &&
    permissions.exclude_roles.some(role => msg.member.roles.has(role))
  ) {
    return false;
  }

  return true;
}
