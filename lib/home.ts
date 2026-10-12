import type { Role } from "./roles";

/** 登入後的落點：管理員→後台；治療師→選擇個案；其他人只屬於一個個案時直接進入。 */
export function homePathFor(user: { role: Role; caseIds: string[] }) {
  if (user.role === "admin") return "/admin";
  if (user.role !== "therapist" && user.caseIds.length === 1) return `/cases/${user.caseIds[0]}`;
  return "/cases";
}
