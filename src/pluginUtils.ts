import { Plugin } from "./Plugin";
import { PermissionLevels } from "./config/configInterfaces";
import { Member } from "eris";
import { get } from "./utils";

export function getMemberLevel(levels: PermissionLevels, member: Member): number {
  if (member.guild.ownerID === member.id) {
    return 99999;
  }

  for (const [id, level] of Object.entries(levels)) {
    if (member.id === id || (member.roles && member.roles.includes(id))) {
      return level;
    }
  }

  return 0;
}

export function hasPermission(config: any, permission: string) {
  return get(config, permission) === true;
}
