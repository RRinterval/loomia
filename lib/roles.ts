// Shared by server and client code — keep this file free of server-only imports.

export const ROLES = ["patient", "caregiver", "therapist", "family", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  patient: "個案",
  caregiver: "照顧者",
  therapist: "治療師",
  family: "親友",
  admin: "管理員",
};

/** 第一類：個案與照顧者，頁面與權限相同 */
export function isMember(role: Role) {
  return role === "patient" || role === "caregiver";
}

/** 治療師視角（管理員沿用治療師的檢視與權限） */
export function isStaff(role: Role) {
  return role === "therapist" || role === "admin";
}

export const can = {
  post: (role: Role) => isMember(role),
  completeTask: (role: Role) => isMember(role),
  reply: (role: Role) => isStaff(role),
  manageTasks: (role: Role) => isStaff(role),
  manageGoals: (role: Role) => isStaff(role),
  editProfile: (role: Role) => isMember(role) || isStaff(role),
  useAi: (role: Role) => isStaff(role),
  moderate: (role: Role) => role === "admin",
};
