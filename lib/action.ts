import "server-only";
import { AuthError } from "./auth";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export class UserError extends Error {}

/** Runs an action body and turns expected failures into a message the UI can show. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof AuthError || err instanceof UserError) {
      return { ok: false, error: err.message };
    }
    console.error(err);
    return { ok: false, error: "發生錯誤，請稍後再試" };
  }
}

export function requireText(value: unknown, label: string, max = 5000) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new UserError(`請輸入${label}`);
  if (text.length > max) throw new UserError(`${label}最多 ${max} 字`);
  return text;
}
