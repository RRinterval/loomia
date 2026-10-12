"use server";

import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { authorize } from "@/lib/auth";
import { requireText, runAction, UserError } from "@/lib/action";
import { dbConnect } from "@/lib/db";
import { Comment, Post } from "@/lib/models";
import { can } from "@/lib/roles";

/** 治療師回覆某則日誌／提問。 */
export async function createComment(input: { caseId: string; postId: string; text: string }) {
  return runAction(async () => {
    const user = await authorize({ caseId: input.caseId, allow: can.reply });
    const text = requireText(input.text, "回覆內容", 3000);

    await dbConnect();
    if (!isValidObjectId(input.postId)) throw new UserError("找不到貼文");
    const post = await Post.findOne({ _id: input.postId, case: input.caseId }).lean();
    if (!post) throw new UserError("找不到貼文");
    // 回覆即代表已讀
    await Post.updateOne({ _id: post._id }, { $addToSet: { readBy: user.id } });

    await Comment.create({
      case: input.caseId,
      post: input.postId,
      author: user.id,
      text,
      readBy: [user.id],
    });
    refresh();
  });
}

export async function deleteComment(commentId: string) {
  return runAction(async () => {
    if (!isValidObjectId(commentId)) throw new UserError("找不到回覆");
    await dbConnect();
    const comment = await Comment.findById(commentId).lean();
    if (!comment) throw new UserError("找不到回覆");

    const user = await authorize({ caseId: String(comment.case) });
    if (String(comment.author) !== user.id && !can.moderate(user.role)) {
      throw new UserError("只能刪除自己的回覆");
    }
    await Comment.deleteOne({ _id: commentId });
    refresh();
  });
}
