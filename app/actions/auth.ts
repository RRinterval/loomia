"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import { homePathFor } from "@/lib/home";
import { User } from "@/lib/models";
import { createSession, deleteSession } from "@/lib/session";

export type FormState = { error?: string } | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "請輸入 Email 與密碼" };

  await dbConnect();
  const user = await User.findOne({ email }).lean();
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Email 或密碼錯誤" };
  }

  await createSession(String(user._id));
  // 直接導到該身分的落點，不經過 "/" 再轉一次
  redirect(homePathFor({ role: user.role, caseIds: (user.cases ?? []).map(String) }));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

/** 系統還沒有任何使用者時，建立第一個管理員帳號。 */
export async function setupAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || !email) return { error: "請輸入姓名與 Email" };
  if (password.length < 8) return { error: "密碼至少 8 個字元" };

  await dbConnect();
  if ((await User.countDocuments()) > 0) return { error: "系統已完成初始設定，請直接登入" };

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: "admin",
    cases: [],
  });

  await createSession(String(user._id));
  redirect("/admin");
}
