import "server-only";
import { UserError } from "./action";

/** 只接受本專案 Vercel Blob 儲存區、且屬於這個個案資料夾的檔案。 */
export function assertCaseBlob(caseId: string, rawUrl: unknown, rawPathname: unknown) {
  const urlText = String(rawUrl ?? "");
  const pathname = String(rawPathname ?? "");
  if (!URL.canParse(urlText)) throw new UserError("檔案連結無效");
  const url = new URL(urlText);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".blob.vercel-storage.com")) {
    throw new UserError("檔案連結無效");
  }
  if (!pathname.startsWith(`cases/${caseId}/`)) throw new UserError("檔案路徑無效");
  return { url: url.toString(), pathname };
}
