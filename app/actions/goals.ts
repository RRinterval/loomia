"use server";

import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { authorize } from "@/lib/auth";
import { requireText, runAction, UserError } from "@/lib/action";
import { dbConnect } from "@/lib/db";
import { isGoalStep } from "@/lib/goals";
import { Goal } from "@/lib/models";
import { can } from "@/lib/roles";

type GoalInput = { title: string; progress: number; note: string };

function parseGoal(input: GoalInput) {
  const title = requireText(input.title, "目標", 60);
  if (!isGoalStep(input.progress)) throw new UserError("進度必須是 0、20、40、60、80 或 100%");
  const note = String(input.note ?? "").trim();
  if (note.length > 500) throw new UserError("目前狀況最多 500 字");
  return { title, progress: input.progress, note };
}

export async function createGoal(input: GoalInput & { caseId: string }) {
  return runAction(async () => {
    const user = await authorize({ caseId: input.caseId, allow: can.manageGoals });
    const goal = parseGoal(input);
    await dbConnect();
    await Goal.create({
      case: input.caseId,
      therapist: user.id,
      ...goal,
      history: [{ progress: goal.progress, note: goal.note, by: user.id, at: new Date() }],
    });
    refresh();
  });
}

async function loadGoal(goalId: string) {
  if (!isValidObjectId(goalId)) throw new UserError("找不到目標");
  await dbConnect();
  const goal = await Goal.findById(goalId).lean();
  if (!goal) throw new UserError("找不到目標");
  return goal;
}

export async function updateGoal(goalId: string, input: GoalInput) {
  return runAction(async () => {
    const existing = await loadGoal(goalId);
    const user = await authorize({ caseId: String(existing.case), allow: can.manageGoals });
    const goal = parseGoal(input);

    // 進度或狀況有變才留下一筆歷程
    const changed = goal.progress !== existing.progress || goal.note !== existing.note;
    await Goal.updateOne(
      { _id: goalId },
      {
        $set: goal,
        ...(changed && {
          $push: { history: { progress: goal.progress, note: goal.note, by: user.id, at: new Date() } },
        }),
      },
    );
    refresh();
  });
}

export async function deleteGoal(goalId: string) {
  return runAction(async () => {
    const goal = await loadGoal(goalId);
    await authorize({ caseId: String(goal.case), allow: can.manageGoals });
    await Goal.deleteOne({ _id: goalId });
    refresh();
  });
}
