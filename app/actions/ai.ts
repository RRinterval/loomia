"use server";

import type { ResponseInputContent } from "openai/resources/responses/responses";
import { refresh } from "next/cache";
import { authorize } from "@/lib/auth";
import { runAction, UserError } from "@/lib/action";
import { AI_MODEL, openai } from "@/lib/ai";
import { dbConnect } from "@/lib/db";
import { addDays, todayKey } from "@/lib/dates";
import { AiSummary, Comment, Post } from "@/lib/models";
import { can, isStaff, ROLE_LABELS, type Role } from "@/lib/roles";

const MAX_IMAGES = 6;

const MAX_INSTRUCTION = 500;

// 共同規則：快捷摘要與治療師自訂指令都適用
const BASE_RULES = `你是協助治療師整理個案近況的助理。資料來自個案與照顧者在 Loomia 上寫的日誌、提問，以及治療師的回覆。
請用繁體中文回答，只根據提供的內容，不要臆測診斷；資訊不足時直接說明。
輸出純文字，不要使用 Markdown 符號（例如 **、#），條列用「1.」「-」即可。`;

const SUMMARY_FORMAT = `請寫一份給治療師看的摘要，格式：
1. 整體近況（2–3 句）
2. 值得注意的變化或狀況（條列）
3. 尚未回覆或需要追蹤的提問（條列，沒有就寫「無」）
4. 可考慮的下一步建議任務（條列 1–3 項）`;

type Author = { name: string; role: string } | null;

/** instruction 為空時產生固定格式的摘要；有填寫時依治療師的指令回答。 */
export async function generateSummary(input: { caseId: string; days: number; instruction?: string }) {
  return runAction(async () => {
    const user = await authorize({ caseId: input.caseId, allow: can.useAi });
    const instruction = String(input.instruction ?? "").trim();
    if (instruction.length > MAX_INSTRUCTION) throw new UserError(`指令最多 ${MAX_INSTRUCTION} 字`);
    const days = [7, 14, 30].includes(input.days) ? input.days : 7;
    const rangeEnd = todayKey();
    const rangeStart = addDays(rangeEnd, -(days - 1));

    await dbConnect();
    const posts = await Post.find({ case: input.caseId, date: { $gte: rangeStart, $lte: rangeEnd } })
      .sort({ date: 1, createdAt: 1 })
      .populate("author", "name role")
      .lean();
    if (posts.length === 0) throw new UserError(`近 ${days} 天沒有日誌或提問可以摘要`);

    const allComments = await Comment.find({ post: { $in: posts.map((p) => p._id) } })
      .sort({ createdAt: 1 })
      .populate("author", "name role")
      .lean();
    // 治療師只能讓 AI 讀到自己的回覆，不包含其他治療師與個案的互動
    const comments = allComments.filter((c) => {
      const a = c.author as unknown as { _id: unknown; role: string } | null;
      return !(user.role === "therapist" && a?.role === "therapist" && String(a._id) !== user.id);
    });

    const label = (a: Author) => (a ? `${a.name}（${ROLE_LABELS[a.role as Role] ?? a.role}）` : "已刪除的使用者");

    const lines: string[] = [];
    const images: string[] = [];
    for (const p of posts) {
      const author = p.author as unknown as Author;
      const mediaNote = p.media.length
        ? `［附 ${p.media.filter((m) => m.type === "image").length} 張照片、${p.media.filter((m) => m.type === "video").length} 部影片］`
        : "";
      lines.push(`【${p.date}｜${p.kind === "question" ? "提問" : "日誌"}｜${label(author)}】${p.text || "（無文字）"}${mediaNote}`);
      for (const c of comments.filter((c) => String(c.post) === String(p._id))) {
        const ca = c.author as unknown as Author;
        lines.push(`  ↳ ${isStaff((ca?.role ?? "family") as Role) ? "治療師回覆" : "回覆"} ${label(ca)}：${c.text}`);
      }
      for (const m of p.media) {
        if (m.type === "image" && images.length < MAX_IMAGES) images.push(m.url);
      }
    }

    const content: ResponseInputContent[] = [
      { type: "input_text", text: `期間：${rangeStart} ～ ${rangeEnd}\n\n${lines.join("\n")}` },
      ...images.map((url) => ({ type: "input_image" as const, image_url: url, detail: "low" as const })),
    ];

    const response = await openai().responses.create({
      model: AI_MODEL,
      instructions: `${BASE_RULES}\n\n${instruction ? `請依照治療師的要求回答：\n${instruction}` : SUMMARY_FORMAT}`,
      input: [{ role: "user", content }],
    });
    const text = response.output_text?.trim();
    if (!text) throw new UserError("AI 沒有產生內容，請再試一次");

    await AiSummary.create({
      case: input.caseId,
      requestedBy: user.id,
      rangeStart,
      rangeEnd,
      model: AI_MODEL,
      instruction,
      content: text,
      sourceMedia: images,
    });
    refresh();
  });
}
