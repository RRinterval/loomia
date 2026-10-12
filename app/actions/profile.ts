"use server";

import { del } from "@vercel/blob";
import { refresh } from "next/cache";
import { authorize } from "@/lib/auth";
import { requireText, runAction, UserError } from "@/lib/action";
import { assertCaseBlob } from "@/lib/blob";
import { dbConnect } from "@/lib/db";
import { isDateKey, todayKey } from "@/lib/dates";
import { Case } from "@/lib/models";
import { can } from "@/lib/roles";

const MAX_CONDITIONS = 20;

export async function updateProfile(
  caseId: string,
  input: {
    name: string;
    birthDate: string;
    healthStatus: string;
    conditions: { name: string; date: string }[];
    primaryCaregiver: string;
  },
) {
  return runAction(async () => {
    await authorize({ caseId, allow: can.editProfile });
    const name = requireText(input.name, "姓名", 60);

    const birthDate = String(input.birthDate ?? "");
    if (birthDate && (!isDateKey(birthDate) || birthDate > todayKey())) throw new UserError("生日格式錯誤");

    const healthStatus = String(input.healthStatus ?? "").trim();
    if (healthStatus.length > 1000) throw new UserError("健康狀態最多 1000 字");

    if (!Array.isArray(input.conditions) || input.conditions.length > MAX_CONDITIONS) {
      throw new UserError(`重要疾病最多 ${MAX_CONDITIONS} 筆`);
    }
    const conditions = input.conditions
      .map((c) => ({ name: String(c?.name ?? "").trim().slice(0, 100), date: String(c?.date ?? "") }))
      .filter((c) => c.name)
      .map((c) => ({ ...c, date: /^\d{4}-\d{2}$/.test(c.date) ? c.date : "" }));

    const primaryCaregiver = String(input.primaryCaregiver ?? "").trim().slice(0, 100);

    await dbConnect();
    await Case.updateOne({ _id: caseId }, { name, birthDate, healthStatus, conditions, primaryCaregiver });
    refresh();
  });
}

/** 大頭照已由瀏覽器上傳到 Vercel Blob，這裡只把連結存進資料庫並刪除舊照片。 */
export async function updateAvatar(caseId: string, input: { url: string; pathname: string } | null) {
  return runAction(async () => {
    await authorize({ caseId, allow: can.editProfile });
    const next = input ? assertCaseBlob(caseId, input.url, input.pathname) : { url: "", pathname: "" };
    if (input && !next.pathname.startsWith(`cases/${caseId}/avatar/`)) throw new UserError("檔案路徑無效");

    await dbConnect();
    const kase = await Case.findById(caseId, { avatarUrl: 1 }).lean();
    if (!kase) throw new UserError("找不到個案");

    await Case.updateOne({ _id: caseId }, { avatarUrl: next.url, avatarPathname: next.pathname });
    if (kase.avatarUrl && kase.avatarUrl !== next.url) {
      await del(kase.avatarUrl).catch((err) => console.error("刪除舊大頭照失敗", err));
    }
    refresh();
  });
}
