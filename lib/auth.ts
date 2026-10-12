import "server-only";
import { cache } from "react";
import { isValidObjectId } from "mongoose";
import { redirect } from "next/navigation";
import { dbConnect } from "./db";
import { User } from "./models";
import { getSessionUserId } from "./session";
import type { Role } from "./roles";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  role: Role;
  caseIds: string[];
};

/** Reads the session cookie and loads the user once per request. */
export const getCurrentUser = cache(async (): Promise<Viewer | null> => {
  const userId = await getSessionUserId();
  if (!userId || !isValidObjectId(userId)) return null;

  await dbConnect();
  const user = await User.findById(userId).lean();
  if (!user) return null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    caseIds: (user.cases ?? []).map(String),
  };
});

/** For pages: redirect to login when signed out. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function canAccessCase(user: Viewer, caseId: string) {
  return user.role === "admin" || user.caseIds.includes(caseId);
}

export class AuthError extends Error {}

/** For server actions and route handlers: throw instead of redirecting. */
export async function authorize(options: { caseId?: string; allow?: (role: Role) => boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("請先登入");
  if (options.caseId !== undefined) {
    if (!isValidObjectId(options.caseId) || !canAccessCase(user, options.caseId)) {
      throw new AuthError("沒有此個案的權限");
    }
  }
  if (options.allow && !options.allow(user.role)) throw new AuthError("沒有執行此動作的權限");
  return user;
}
