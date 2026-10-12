"use client";

import { useRef, useState, useTransition } from "react";
import { createGoal, deleteGoal, updateGoal } from "@/app/actions/goals";
import { toDateKey } from "@/lib/dates";
import { GOAL_STEPS } from "@/lib/goals";
import { can } from "@/lib/roles";
import type { GoalDTO } from "@/lib/types";
import { Icon, Sheet } from "../ui";
import type { ViewerInfo } from "./CaseApp";
import { Linkify } from "../Linkify";

/** 日曆上方的目標卡：可左右滑動切換多個目標，治療師可新增／編輯。 */
export function GoalCarousel({ goals, viewer, caseId }: { goals: GoalDTO[]; viewer: ViewerInfo; caseId: string }) {
  const canEdit = can.manageGoals(viewer.role);
  const [editing, setEditing] = useState<GoalDTO | "new" | null>(null);
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  if (goals.length === 0 && !canEdit) return null;

  const scrollTo = (i: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section>
      {goals.length === 0 ? (
        <button
          onClick={() => setEditing("new")}
          className="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-brand/40 bg-surface py-6 text-sm font-medium text-brand"
        >
          <Icon name="plus" className="size-5" />
          設定治療目標
        </button>
      ) : (
        <>
          <div
            ref={scroller}
            onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-3xl"
          >
            {goals.map((g) => (
              <div key={g.id} className="w-full shrink-0 snap-center">
                <GoalCard goal={g} onEdit={canEdit ? () => setEditing(g) : undefined} />
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-center gap-3">
            {goals.length > 1 && (
              <div className="flex gap-1.5">
                {goals.map((g, i) => (
                  <button
                    key={g.id}
                    onClick={() => scrollTo(i)}
                    aria-label={`目標 ${i + 1}`}
                    className={`size-2 rounded-full transition ${i === index ? "bg-brand" : "bg-dot"}`}
                  />
                ))}
              </div>
            )}
            {canEdit && (
              <button onClick={() => setEditing("new")} className="text-xs text-brand">
                ＋ 新增目標
              </button>
            )}
          </div>
        </>
      )}

      {canEdit && (
        <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "設定新目標" : "更新目標"}>
          {editing !== null && (
            <GoalEditor
              key={editing === "new" ? "new" : editing.id}
              goal={editing === "new" ? null : editing}
              caseId={caseId}
              onDone={() => setEditing(null)}
            />
          )}
        </Sheet>
      )}
    </section>
  );
}

/** 扁平版目標卡：左邊進度環、右邊目標／狀況／日期，高度約為個案區塊的兩倍 */
function GoalCard({ goal, onEdit }: { goal: GoalDTO; onEdit?: () => void }) {
  return (
    <div className="relative flex h-40 items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1aa28d] via-brand to-[#2d63b3] p-3 text-white">
      {/* 背景的半透明方塊裝飾 */}
      <span className="absolute -top-4 right-16 size-16 rotate-12 rounded-2xl bg-white/8" />
      <span className="absolute -right-4 bottom-3 size-12 -rotate-6 rounded-xl bg-white/10" />

      <ProgressGauge progress={goal.progress} size="sm" />

      <div className="relative flex h-full min-w-0 flex-1 flex-col justify-between py-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-white/80">本次目標</p>
            <p className="line-clamp-2 leading-snug font-semibold break-words" title={goal.title}>
              {goal.title}
            </p>
          </div>
          {onEdit && (
            <button onClick={onEdit} className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs hover:bg-white/30">
              更新
            </button>
          )}
        </div>
        {goal.note && (
          <p className="line-clamp-2 rounded-xl bg-white/15 px-3 py-1.5 text-sm break-words backdrop-blur-sm" title={goal.note}>
            <Linkify text={goal.note} linkClassName="text-white underline underline-offset-2" />
          </p>
        )}
        <p className="text-[11px] text-white/75">{toDateKey(goal.updatedAt)} 更新</p>
      </div>
    </div>
  );
}

/* ---------- 環形進度表：270° 弧分成 5 格，每格 20% ---------- */

const SEGMENT_COLORS = ["#7eecd6", "#a8ebc4", "#d9e8a8", "#f8c28f", "#f07f5b"];
const CX = 100;
const CY = 100;
const R = 80;

function point(angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return `${(CX + R * Math.sin(a)).toFixed(2)} ${(CY - R * Math.cos(a)).toFixed(2)}`;
}

function arc(from: number, to: number) {
  return `M ${point(from)} A ${R} ${R} 0 0 1 ${point(to)}`;
}

export function ProgressGauge({ progress, size = "md" }: { progress: number; size?: "sm" | "md" }) {
  const filled = Math.round(progress / 20);
  const segment = 270 / 5;

  return (
    <div className={`relative mx-auto ${size === "sm" ? "w-32 shrink-0" : "my-2 w-48"}`}>
      <svg viewBox="0 0 200 200" className="w-full" role="img" aria-label={`目標完成度 ${progress}%`}>
        <circle cx={CX} cy={CY} r={62} fill="rgba(0,0,0,0.08)" />
        {SEGMENT_COLORS.map((color, i) => {
          const start = -135 + i * segment + 1.5;
          const end = -135 + (i + 1) * segment - 1.5;
          return (
            <path
              key={i}
              d={arc(start, end)}
              fill="none"
              stroke={i < filled ? color : "rgba(255,255,255,0.2)"}
              strokeWidth={16}
              strokeLinecap="butt"
            />
          );
        })}
        <circle cx={CX} cy={CY} r={50} fill="white" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-brand">
        <svg viewBox="0 0 24 24" className={size === "sm" ? "size-4" : "size-6"} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden>
          <path d="M2 20l6.5-10 4 6 2.5-3.5L21 20z" />
          <path d="M8.5 10V3.5l4 1.5-4 1.5" />
        </svg>
        <span className={`font-bold leading-none ${size === "sm" ? "mt-0.5 text-base" : "mt-1 text-2xl"}`}>{progress}%</span>
        <span className={`text-ink/70 ${size === "sm" ? "text-[9px]" : "mt-0.5 text-[11px]"}`}>目標完成度</span>
      </div>
    </div>
  );
}

/* ---------- 治療師設定／更新目標 ---------- */

function GoalEditor({ goal, caseId, onDone }: { goal: GoalDTO | null; caseId: string; onDone: () => void }) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [progress, setProgress] = useState(goal?.progress ?? 0);
  const [note, setNote] = useState(goal?.note ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError("");
      const result = await action();
      if (result.ok) onDone();
      else setError(result.error ?? "發生錯誤");
    });

  const save = () =>
    run(() => (goal ? updateGoal(goal.id, { title, progress, note }) : createGoal({ caseId, title, progress, note })));

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-muted">目標</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：自己拿湯匙吃飯"
          maxLength={60}
          className="w-full rounded-xl border border-line px-3 py-2.5 text-base outline-none focus:border-brand"
        />
      </label>

      <div>
        <span className="mb-1 block text-sm text-muted">完成度</span>
        <div className="rounded-2xl bg-gradient-to-br from-[#1aa28d] via-brand to-[#2d63b3] py-1">
          <ProgressGauge progress={progress} size="sm" />
        </div>
        <div className="mt-2 grid grid-cols-6 gap-1 rounded-xl bg-canvas p-1">
          {GOAL_STEPS.map((step) => (
            <button
              key={step}
              onClick={() => setProgress(step)}
              className={`rounded-lg py-2 text-sm ${progress === step ? "bg-brand font-medium text-white" : "text-ink"}`}
            >
              {step}%
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-muted">目前狀況</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：可以做到瞄準東東了"
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-xl border border-line p-3 text-base outline-none focus:border-brand"
        />
      </label>

      {error && <p className="text-sm text-alert">{error}</p>}
      <button
        onClick={save}
        disabled={pending}
        className="w-full rounded-xl bg-brand py-3 font-medium text-white active:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "儲存中…" : goal ? "儲存更新" : "建立目標"}
      </button>
      {goal && (
        <button
          onClick={() => confirm(`確定要刪除目標「${goal.title}」嗎？`) && run(() => deleteGoal(goal.id))}
          disabled={pending}
          className="w-full py-2 text-sm text-alert"
        >
          刪除目標
        </button>
      )}
    </div>
  );
}
