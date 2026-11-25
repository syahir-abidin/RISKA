import type { Role } from "@/db/schema";

export type Permission = "edit" | "createStudy" | "approve" | "manageOrg" | "manageActions";
const MATRIX: Record<Permission, Role[]> = {
  edit: ["OWNER", "ADMIN", "FACILITATOR", "MEMBER"],
  createStudy: ["OWNER", "ADMIN", "FACILITATOR"],
  approve: ["OWNER", "ADMIN", "REVIEWER"],
  manageOrg: ["OWNER", "ADMIN"],
  manageActions: ["OWNER", "ADMIN", "FACILITATOR", "MEMBER", "REVIEWER"],
};
export const can = (role: Role, p: Permission) => MATRIX[p].includes(role);
export const ROLE_LABEL: Record<Role, string> = { OWNER: "Owner", ADMIN: "Admin", FACILITATOR: "Facilitator", MEMBER: "Member", REVIEWER: "Reviewer", VIEWER: "Viewer" };
