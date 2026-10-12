"use server";

import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { authorize } from "@/lib/auth";
import { requireText, runAction, UserError } from "@/lib/action";
import { dbConnect } from "@/lib/db";
import { Task } from "@/lib/models";
import { can } from "@/lib/roles";

export async function createTask(input: { caseId: string; title: string; content: string }) {
  return runAction(async () => {
    const user = await authorize({ caseId: input.caseId, allow: can.manageTasks });
    const title = requireText(input.title, "任務標題", 60);
    const content = String(input.content ?? "").trim();
    if (content.length > 3000) throw new UserError("任務內容最多 3000 字");

    await dbConnect();
    await Task.create({ case: input.caseId, therapist: user.id, title, content });
    refresh();
  });
}

async function loadTask(taskId: string) {
  if (!isValidObjectId(taskId)) throw new UserError("找不到任務");
  await dbConnect();
  const task = await Task.findById(taskId).lean();
  if (!task) throw new UserError("找不到任務");
  return task;
}

/** 個案端按下「執行好了」，任務收進已完成收集盒。 */
export async function completeTask(taskId: string) {
  return runAction(async () => {
    const task = await loadTask(taskId);
    const user = await authorize({ caseId: String(task.case), allow: can.completeTask });
    if (task.completedAt) return;
    await Task.updateOne({ _id: taskId }, { completedAt: new Date(), completedBy: user.id });
    refresh();
  });
}

export async function deleteTask(taskId: string) {
  return runAction(async () => {
    const task = await loadTask(taskId);
    const user = await authorize({ caseId: String(task.case), allow: can.manageTasks });
    // 治療師只能刪除自己指派的任務；管理員不受限
    if (user.role === "therapist" && String(task.therapist) !== user.id) throw new UserError("只能刪除自己指派的任務");
    await Task.deleteOne({ _id: taskId });
    refresh();
  });
}
