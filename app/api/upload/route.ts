import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth";
import { can } from "@/lib/roles";

const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB，影片也能上傳
const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

// 瀏覽器直接上傳到 Vercel Blob（避開伺服器 4.5MB 請求上限），這裡只負責核發上傳權杖。
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { caseId, purpose } = JSON.parse(clientPayload ?? "{}") as { caseId?: string; purpose?: string };

        // 個案大頭照：只收圖片
        if (purpose === "avatar") {
          await authorize({ caseId: caseId ?? "", allow: can.editProfile });
          if (!pathname.startsWith(`cases/${caseId}/avatar/`)) throw new Error("檔案路徑無效");
          return {
            allowedContentTypes: ["image/*"],
            maximumSizeInBytes: MAX_AVATAR_BYTES,
            addRandomSuffix: true,
          };
        }

        await authorize({ caseId: caseId ?? "", allow: can.post });
        if (!pathname.startsWith(`cases/${caseId}/`)) throw new Error("檔案路徑無效");

        return {
          allowedContentTypes: ["image/*", "video/*"],
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
        };
      },
      // 不設 onUploadCompleted：檔案連結在送出貼文時才寫入 MongoDB
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
