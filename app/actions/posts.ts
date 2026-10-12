"use server";

import { del } from "@vercel/blob";
import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { authorize } from "@/lib/auth";
import { runAction, UserError } from "@/lib/action";
import { assertCaseBlob } from "@/lib/blob";
import { dbConnect } from "@/lib/db";
import { isDateKey } from "@/lib/dates";
import { Comment, Post } from "@/lib/models";
import { can, isStaff } from "@/lib/roles";
import type { MediaDTO } from "@/lib/types";

const MAX_MEDIA = 10;

function validateMedia(caseId: string, media: unknown): MediaDTO[] {
  if (!Array.isArray(media)) return [];
  if (media.length > MAX_MEDIA) throw new UserError(`一次最多上傳 ${MAX_MEDIA} 個檔案`);

  return media.map((m) => {
    const { url, pathname } = assertCaseBlob(caseId, m?.url, m?.pathname);
    const contentType = String(m?.contentType ?? "");
    const type = contentType.startsWith("video/") ? "video" : "image";
    return { url, pathname, contentType, type };
  });
}

export async function createPost(input: {
  caseId: string;
  kind: "journal" | "question";
  text: string;
  date: string;
  media: MediaDTO[];
}) {
  return runAction(async () => {
    const user = await authorize({ caseId: input.caseId, allow: can.post });
    if (input.kind !== "journal" && input.kind !== "question") throw new UserError("類型錯誤");
    if (!isDateKey(input.date)) throw new UserError("日期格式錯誤");

    const text = String(input.text ?? "").trim();
    if (text.length > 5000) throw new UserError("內容最多 5000 字");
    const media = validateMedia(input.caseId, input.media);
    if (!text && media.length === 0) throw new UserError("請輸入內容或加入照片／影片");

    await dbConnect();
    await Post.create({
      case: input.caseId,
      author: user.id,
      kind: input.kind,
      text,
      media,
      date: input.date,
      readBy: [],
    });
    refresh();
  });
}

export async function deletePost(postId: string) {
  return runAction(async () => {
    if (!isValidObjectId(postId)) throw new UserError("找不到貼文");
    await dbConnect();
    const post = await Post.findById(postId).lean();
    if (!post) throw new UserError("找不到貼文");

    const user = await authorize({ caseId: String(post.case) });
    if (String(post.author) !== user.id && !can.moderate(user.role)) {
      throw new UserError("只能刪除自己的貼文");
    }

    await Promise.all([Post.deleteOne({ _id: postId }), Comment.deleteMany({ post: postId })]);
    const urls = (post.media ?? []).map((m) => m.url);
    if (urls.length) await del(urls).catch((err) => console.error("刪除 Blob 失敗", err));
    refresh();
  });
}

/** 畫面上看過的項目標記為已讀：治療師讀貼文、個案端讀治療師回覆。 */
export async function markRead(input: { caseId: string; postIds: string[]; commentIds: string[] }) {
  return runAction(async () => {
    const user = await authorize({ caseId: input.caseId });
    const postIds = (input.postIds ?? []).filter(isValidObjectId).slice(0, 200);
    const commentIds = (input.commentIds ?? []).filter(isValidObjectId).slice(0, 200);

    await dbConnect();
    if (postIds.length && isStaff(user.role)) {
      await Post.updateMany(
        { _id: { $in: postIds }, case: input.caseId },
        { $addToSet: { readBy: user.id } },
      );
    }
    if (commentIds.length && !isStaff(user.role)) {
      await Comment.updateMany(
        { _id: { $in: commentIds }, case: input.caseId },
        { $addToSet: { readBy: user.id } },
      );
    }
    refresh();
  });
}
