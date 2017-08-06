import { Member } from "eris";

export interface IPermissions {
  permissions?: string[];
  roles?: string[];
  users?: string[];
}

export function isAllowed(permissions: IPermissions, member: Member): boolean {
  // Basic permissions
  if (
    permissions.permissions &&
    permissions.permissions.some(perm => !member.permission.has(perm))
  ) {
    return false;
  }

  // Role permissions
  if (
    permissions.roles &&
    permissions.roles.some(roleId => !member.roles.includes(roleId))
  ) {
    return false;
  }

  // User id permissions
  if (permissions.users && !permissions.users.includes(member.id)) {
    return false;
  }

  return true;
}
