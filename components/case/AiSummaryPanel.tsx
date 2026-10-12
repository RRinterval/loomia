"use client";

import { useState, useTransition } from "react";
import { generateSummary } from "@/app/actions/ai";
import { formatDateTime, formatKey } from "@/lib/dates";
import type { AiSummaryDTO } from "@/lib/types";
import { Icon } from "../ui";
import { Linkify } from "../Linkify";

const RANGES = [7, 14, 30];
const MAX_INSTRUCTION = 500;

export function AiSummaryPanel({ caseId, summaries }: { caseId: string; summaries: AiSummaryDTO[] }) {
  const [days, setDays] = useState(7);
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState("");
  // 記錄是哪個按鈕在跑，只讓那顆顯示「整理中」
  const [running, setRunning] = useState<"summary" | "custom" | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (mode: "summary" | "custom") =>
    startTransition(async () => {
      setError("");
      setRunning(mode);
      const result = await generateSummary({
        caseId,
        days,
        instruction: mode === "custom" ? instruction : undefined,
      });
      setRunning(null);
      if (!result.ok) setError(result.error);
      else if (mode === "custom") setInstruction("");
    });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">AI 會讀取期間內的日誌、提問、回覆與照片，整理成給治療師參考的摘要。</p>
      <div className="flex gap-2">
        {RANGES.map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`flex-1 rounded-xl py-2 text-sm ${days === d ? "bg-brand text-white" : "bg-canvas text-ink"}`}
          >
            近 {d} 天
          </button>
        ))}
      </div>
      <button
        onClick={() => run("summary")}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo py-3 font-medium text-white disabled:opacity-60"
      >
        <Icon name="sparkle" />
        {running === "summary" ? "AI 整理中…" : "產生摘要"}
      </button>

      {/* 治療師自訂指令：期間沿用上方選擇 */}
      <section className="rounded-2xl border border-indigo/25 bg-indigo-soft/50 p-4">
        <h3 className="text-sm font-semibold text-ink">自訂指令</h3>
        <p className="mt-0.5 mb-2.5 text-xs text-muted">依上方選擇的近 {days} 天資料，請 AI 照你的要求回答。</p>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={3}
          maxLength={MAX_INSTRUCTION}
          placeholder="例如：列出所有和疼痛有關的紀錄，並整理出現的時間與情境"
          className="w-full resize-none rounded-xl border border-line bg-surface p-3 text-base outline-none focus:border-indigo"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-muted tabular-nums">
            {instruction.length} / {MAX_INSTRUCTION}
          </span>
          <button
            onClick={() => run("custom")}
            disabled={pending || !instruction.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-indigo px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Icon name="sparkle" className="size-4" />
            {running === "custom" ? "AI 整理中…" : "依指令產生"}
          </button>
        </div>
      </section>

      {error && <p className="text-sm text-alert">{error}</p>}

      <div className="space-y-3 pt-2">
        {summaries.map((s) => (
          <article key={s.id} className="rounded-2xl border border-line p-4">
            <p className="mb-2 text-xs text-muted">
              {formatKey(s.rangeStart)} – {formatKey(s.rangeEnd)}・{s.requestedBy}・{formatDateTime(s.createdAt)}
            </p>
            {s.instruction && (
              <p className="mb-3 rounded-xl bg-indigo-soft/60 px-3 py-2 text-xs text-indigo">
                <span className="font-semibold">指令：</span>
                {s.instruction}
              </p>
            )}
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              <Linkify text={s.content} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
