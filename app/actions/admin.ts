"use server";

import bcrypt from "bcryptjs";
import { del } from "@vercel/blob";
import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { authorize } from "@/lib/auth";
import { requireText, runAction, UserError } from "@/lib/action";
import { dbConnect } from "@/lib/db";
import { AiSummary, Case, Comment, Goal, Post, Task, User } from "@/lib/models";
import { ROLES, type Role } from "@/lib/roles";

const isAdmin = (role: Role) => role === "admin";

function parseRole(value: FormDataEntryValue | null): Role {
  const role = String(value ?? "") as Role;
  if (!ROLES.includes(role)) throw new UserError("請選擇身分");
  return role;
}

function parseCaseIds(formData: FormData) {
  return formData.getAll("cases").map(String).filter(isValidObjectId);
}

function parsePassword(value: FormDataEntryValue | null) {
  const password = String(value ?? "");
  if (password.length < 8) throw new UserError("密碼至少 8 個字元");
  return password;
}

/* ---------- 個案 ---------- */

export async function createCase(formData: FormData) {
  return runAction(async () => {
    await authorize({ allow: isAdmin });
    const name = requireText(formData.get("name"), "個案名稱", 60);
    const note = String(formData.get("note") ?? "").trim().slice(0, 500);
    await dbConnect();
    const kase = await Case.create({ name, note });
    await setCaseMembers(String(kase._id), formData);
    refresh();
  });
}

export async function updateCase(caseId: string, formData: FormData) {
  return runAction(async () => {
    await authorize({ allow: isAdmin });
    if (!isValidObjectId(caseId)) throw new UserError("找不到個案");
    const name = requireText(formData.get("name"), "個案名稱", 60);
    const note = String(formData.get("note") ?? "").trim().slice(0, 500);
    await dbConnect();
    await Case.updateOne({ _id: caseId }, { name, note });
    await setCaseMembers(caseId, formData);
    refresh();
  });
}

/** 依表單勾選的成員，把個案加入／移出使用者的 cases（管理員不需指派）。 */
async function setCaseMembers(caseId: string, formData: FormData) {
  const memberIds = formData.getAll("members").map(String).filter(isValidObjectId);
  await Promise.all([
    User.updateMany({ _id: { $in: memberIds }, role: { $ne: "admin" } }, { $addToSet: { cases: caseId } }),
    User.updateMany({ _id: { $nin: memberIds }, cases: caseId }, { $pull: { cases: caseId } }),
  ]);
}

/** 刪除個案及其所有日誌、回覆、任務、AI 摘要與上傳檔案。 */
export async function deleteCase(caseId: string) {
  return runAction(async () => {
    await authorize({ allow: isAdmin });
    if (!isValidObjectId(caseId)) throw new UserError("找不到個案");
    await dbConnect();

    const posts = await Post.find({ case: caseId }, { media: 1 }).lean();
    const urls = posts.flatMap((p) => (p.media ?? []).map((m) => m.url));

    await Promise.all([
      Post.deleteMany({ case: caseId }),
      Comment.deleteMany({ case: caseId }),
      Task.deleteMany({ case: caseId }),
      AiSummary.deleteMany({ case: caseId }),
      Goal.deleteMany({ case: caseId }),
      User.updateMany({ cases: caseId }, { $pull: { cases: caseId } }),
      Case.deleteOne({ _id: caseId }),
    ]);
    if (urls.length) await del(urls).catch((err) => console.error("刪除 Blob 失敗", err));
    refresh();
  });
}

/* ---------- 使用者 ---------- */

export async function createUser(formData: FormData) {
  return runAction(async () => {
    await authorize({ allow: isAdmin });
    const name = requireText(formData.get("name"), "姓名", 60);
    const email = requireText(formData.get("email"), "Email", 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError("Email 格式錯誤");
    const role = parseRole(formData.get("role"));
    const password = parsePassword(formData.get("password"));

    await dbConnect();
    if (await User.exists({ email })) throw new UserError("此 Email 已被使用");
    await User.create({
      name,
      email,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      cases: role === "admin" ? [] : parseCaseIds(formData),
    });
    refresh();
  });
}

export async function updateUser(userId: string, formData: FormData) {
  return runAction(async () => {
    const admin = await authorize({ allow: isAdmin });
    if (!isValidObjectId(userId)) throw new UserError("找不到使用者");
    const name = requireText(formData.get("name"), "姓名", 60);
    const role = parseRole(formData.get("role"));
    if (userId === admin.id && role !== "admin") throw new UserError("不能移除自己的管理員身分");

    const update: Record<string, unknown> = {
      name,
      role,
      cases: role === "admin" ? [] : parseCaseIds(formData),
    };
    const newPassword = String(formData.get("password") ?? "");
    if (newPassword) update.passwordHash = await bcrypt.hash(parsePassword(newPassword), 10);

    await dbConnect();
    await User.updateOne({ _id: userId }, update);
    refresh();
  });
}

export async function deleteUser(userId: string) {
  return runAction(async () => {
    const admin = await authorize({ allow: isAdmin });
    if (userId === admin.id) throw new UserError("不能刪除自己的帳號");
    if (!isValidObjectId(userId)) throw new UserError("找不到使用者");
    await dbConnect();
    await User.deleteOne({ _id: userId });
    refresh();
  });
}
