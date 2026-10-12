// Shared by server and client code.

/** 目標進度只能是 0–100%，每 20% 一格 */
export const GOAL_STEPS = [0, 20, 40, 60, 80, 100] as const;

export function isGoalStep(value: unknown): value is (typeof GOAL_STEPS)[number] {
  return GOAL_STEPS.includes(value as (typeof GOAL_STEPS)[number]);
}
