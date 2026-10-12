"use client";

import { useState, useTransition } from "react";
import { completeTask, createTask, deleteTask } from "@/app/actions/tasks";
import { formatDateTime } from "@/lib/dates";
import { can } from "@/lib/roles";
import type { TaskDTO } from "@/lib/types";
import { EmptyState, Icon, Sheet } from "../ui";
import type { ViewerInfo } from "./CaseApp";
import { Linkify } from "../Linkify";

const CARD_TONES = [
  "bg-brand-soft/70 border-brand/25",
  "bg-alert-soft border-alert/30",
  "bg-indigo-soft border-indigo/25",
  "bg-[#fbf3d9] border-[#efd98f]",
  "bg-[#eee9f6] border-[#d5c9ee]",
];

function tone(id: string) {
  const n = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return CARD_TONES[n % CARD_TONES.length];
}

export function TasksSection({ tasks, viewer, caseId }: { tasks: TaskDTO[]; viewer: ViewerInfo; caseId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [boxOpen, setBoxOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const pending = tasks.filter((t) => !t.completedAt);
  const done = tasks
    .filter((t) => t.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const current = tasks.find((t) => t.id === openId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          待執行任務 <span className="text-muted">{pending.length}</span>
        </h2>
        <button
          onClick={() => setBoxOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-brand shadow-sm"
        >
          <Icon name="box" className="size-4" />
          已完成收集盒 {done.length}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {can.manageTasks(viewer.role) && (
          <button
            onClick={() => setCreating(true)}
            className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 text-brand"
          >
            <Icon name="plus" className="size-7" />
            <span className="text-sm font-medium">新增建議任務</span>
          </button>
        )}
        {pending.map((t) => (
          <TaskCard key={t.id} task={t} onClick={() => setOpenId(t.id)} />
        ))}
      </div>

      {pending.length === 0 && !can.manageTasks(viewer.role) && (
        <EmptyState>目前沒有待執行的任務 🎉</EmptyState>
      )}

      <Sheet open={!!current} onClose={() => setOpenId(null)} title="建議任務">
        {current && <TaskDetail task={current} viewer={viewer} onDone={() => setOpenId(null)} />}
      </Sheet>

      <Sheet open={boxOpen} onClose={() => setBoxOpen(false)} title={`已完成收集盒（${done.length}）`}>
        {done.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">完成的任務小卡會收在這裡</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {done.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onClick={() => {
                  setBoxOpen(false);
                  setOpenId(t.id);
                }}
              />
            ))}
          </div>
        )}
      </Sheet>

      <Sheet open={creating} onClose={() => setCreating(false)} title="新增建議任務">
        <CreateTaskForm caseId={caseId} onDone={() => setCreating(false)} />
      </Sheet>
    </div>
  );
}

function TaskCard({ task, onClick }: { task: TaskDTO; onClick: () => void }) {
  const done = !!task.completedAt;
  return (
    <button
      onClick={onClick}
      className={`relative flex min-h-36 flex-col rounded-2xl border p-4 text-left shadow-sm transition active:scale-[0.97] ${tone(task.id)}`}
    >
      {done && (
        <span className="absolute top-3 right-3 rounded-full bg-brand p-1 text-white">
          <Icon name="check" className="size-3.5" />
        </span>
      )}
      <span className="line-clamp-3 pr-5 font-semibold leading-snug">{task.title}</span>
      <span className="mt-auto pt-3 text-[11px] text-muted">
        {done ? `完成於 ${formatDateTime(task.completedAt!)}` : `${task.therapist.name}・${formatDateTime(task.createdAt)}`}
      </span>
    </button>
  );
}

function TaskDetail({ task, viewer, onDone }: { task: TaskDTO; viewer: ViewerInfo; onDone: () => void }) {
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) onDone();
      else alert(result.error);
    });

  return (
    <div className={`rounded-2xl border p-5 ${tone(task.id)}`}>
      <h3 className="text-xl font-semibold leading-snug">{task.title}</h3>
      <p className="mt-1 text-xs text-muted">
        {task.therapist.name} 治療師・{formatDateTime(task.createdAt)}
      </p>
      {task.content && <p className="mt-4 leading-relaxed whitespace-pre-wrap">
          <Linkify text={task.content} />
        </p>}

      {task.completedAt ? (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-white/70 px-4 py-3 text-sm text-brand">
          <Icon name="check" />
          {task.completedBy?.name ?? ""} 已於 {formatDateTime(task.completedAt)} 完成
        </p>
      ) : (
        can.completeTask(viewer.role) && (
          <button
            onClick={() => run(() => completeTask(task.id))}
            disabled={pending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-medium text-white active:bg-brand-dark disabled:opacity-60"
          >
            <Icon name="check" />
            {pending ? "收進收集盒…" : "執行好了"}
          </button>
        )
      )}

      {can.manageTasks(viewer.role) && (
        <button
          onClick={() => confirm("確定要刪除這個任務嗎？") && run(() => deleteTask(task.id))}
          disabled={pending}
          className="mt-3 w-full py-2 text-sm text-muted"
        >
          刪除任務
        </button>
      )}
    </div>
  );
}

function CreateTaskForm({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await createTask({ caseId, title, content });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setContent("");
      onDone();
    });

  return (
    <div className="space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="任務標題，例如：每天練習吞嚥操 10 分鐘"
        maxLength={60}
        className="w-full rounded-xl border border-line px-3 py-3 text-base outline-none focus:border-brand"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="執行方式、注意事項…"
        rows={6}
        maxLength={3000}
        className="w-full resize-none rounded-xl border border-line p-3 text-base outline-none focus:border-brand"
      />
      {error && <p className="text-sm text-alert">{error}</p>}
      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-xl bg-brand py-3 font-medium text-white active:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "建立中…" : "建立任務小卡"}
      </button>
    </div>
  );
}
