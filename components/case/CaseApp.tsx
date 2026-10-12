"use client";

import { useState } from "react";
import type { CaseData } from "@/lib/data";
import { formatKey } from "@/lib/dates";
import { can, isStaff, type Role } from "@/lib/roles";
import type { PostDTO } from "@/lib/types";
import { BrandStripe, Logo } from "../Brand";
import { EmptyState, Icon, Sheet, type IconName } from "../ui";
import { AiSummaryPanel } from "./AiSummaryPanel";
import { Calendar } from "./Calendar";
import { CaseProfile } from "./CaseProfile";
import { GoalCarousel } from "./GoalCard";
import { Composer } from "./Composer";
import { PostCard } from "./PostCard";
import { ReadTracker } from "./ReadTracker";
import { TasksSection } from "./TasksSection";

export type ViewerInfo = { id: string; name: string; role: Role };

type Tab = "journal" | "question" | "task";

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "journal", label: "日誌", icon: "journal" },
  { id: "question", label: "問題", icon: "question" },
  { id: "task", label: "任務", icon: "task" },];

export function CaseApp({
  viewer,
  data,
  hasMultipleCases,
}: {
  viewer: ViewerInfo;
  data: CaseData;
  hasMultipleCases: boolean;
}) {
  const caseId = data.case.id;
  const staffView = isStaff(viewer.role);

  const [tab, setTab] = useState<Tab>("journal");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const selectTab = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  const postsOf = (kind: PostDTO["kind"]) =>
    data.posts.filter((p) => p.kind === kind && (!selectedDate || p.date === selectedDate));

  const badges = computeBadges(data, staffView);

  // 工具箱：目前只有 AI 摘要；之後新增的工具也放這裡（沒有任何可用工具時整個區塊不顯示）
  const tools = [
    can.useAi(viewer.role) && (
      <button
        key="ai"
        onClick={() => setAiOpen(true)}
        className="flex items-center gap-1 rounded-full bg-indigo px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-indigo/30 hover:bg-indigo/90"
      >
        <Icon name="sparkle" className="size-3.5" />
        AI 摘要
      </button>
    ),
  ].filter(Boolean);
  const toolbox = tools.length > 0 && (
    <section className="rounded-2xl bg-surface p-4 shadow-sm">
      <h2 className="mb-3 text-xs font-medium tracking-wide text-muted">工具箱</h2>
      <div className="flex flex-wrap gap-2">{tools}</div>
    </section>
  );

  return (
    <ReadTracker caseId={caseId}>
      <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-10 lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8 lg:px-6">
        {/* 筆電：左側欄。手機／平板：display: contents 讓子區塊直接排在頁面流裡 */}
        <aside className="contents lg:sticky lg:top-0 lg:block lg:h-dvh lg:space-y-4 lg:self-start lg:overflow-y-auto lg:py-6">
          <header className="overflow-hidden bg-surface lg:rounded-2xl lg:shadow-sm">
            <div className="flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 md:mx-auto md:max-w-3xl md:px-6 md:pt-4 lg:max-w-none lg:p-4">
              <Logo className="h-7 w-auto" />
            </div>
            <BrandStripe className="h-[3px]" />
          </header>

          {/* 個案區塊＋目標卡：在日曆上方，手機／平板會隨頁面捲走 */}
          <div className="space-y-3 px-3 pt-3 md:mx-auto md:max-w-3xl md:px-6 lg:max-w-none lg:space-y-4 lg:p-0">
            <CaseProfile
              kase={data.case}
              profile={data.profile}
              goalHistory={data.goalHistory}
              viewer={viewer}
              canSwitchCase={hasMultipleCases || staffView}
            />
            <GoalCarousel goals={data.goals} viewer={viewer} caseId={caseId} />
            {/* 手機／直向平板：工具箱接在目標卡下方 */}
            {toolbox && <div className="lg:hidden">{toolbox}</div>}
          </div>

          {/* 日曆＋分頁：手機／直向平板捲動時固定在畫面上方；筆電／橫向平板只留分頁選單（日曆移到右欄） */}
          <div className="sticky top-0 z-30 mt-3 bg-surface shadow-[0_1px_0_var(--color-line)] lg:static lg:mt-0 lg:space-y-4 lg:bg-transparent lg:shadow-none">
            <div className="md:mx-auto md:max-w-3xl md:px-4 lg:hidden">
              <Calendar marks={data.marks} selected={selectedDate} onSelect={setSelectedDate} staffView={staffView} />
            </div>

            {/* 平板：日曆下方的橫向分頁；筆電：側欄的直式選單 */}
            <nav className="hidden border-t border-line px-4 md:mx-auto md:flex md:max-w-3xl lg:max-w-none lg:flex-col lg:gap-1 lg:rounded-2xl lg:border-0 lg:bg-surface lg:p-2 lg:shadow-sm">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTab(t.id)}
                  className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm lg:justify-start lg:rounded-xl lg:border-0 lg:px-4 ${
                    tab === t.id
                      ? "border-brand font-medium text-brand lg:bg-brand-soft"
                      : "border-transparent text-muted hover:text-ink lg:hover:bg-canvas"
                  }`}
                >
                  <Icon name={t.icon} />
                  {t.label}
                  {badges[t.id] > 0 && (
                    <span className="min-w-5 rounded-full bg-alert px-1.5 text-center text-[11px] leading-5 text-white lg:ml-auto">
                      {badges[t.id] > 99 ? "99+" : badges[t.id]}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* 筆電／橫向平板：工具箱在分頁選單下方 */}
          {toolbox && <div className="hidden lg:block">{toolbox}</div>}
        </aside>

        <main className="space-y-3 px-3 pt-3 md:mx-auto md:w-full md:max-w-3xl md:space-y-4 md:px-6 md:pt-5 lg:max-w-none lg:px-0 lg:py-6">
          {/* 筆電／橫向平板：日曆在右欄最上方，跟日誌、問題放在一起，捲動時固定 */}
          <div className="sticky top-0 z-20 -mt-6 hidden bg-canvas pt-6 pb-1 lg:block">
            <div className="overflow-hidden rounded-2xl shadow-sm">
              <Calendar marks={data.marks} selected={selectedDate} onSelect={setSelectedDate} staffView={staffView} />
            </div>
          </div>

          {selectedDate && (tab === "journal" || tab === "question") && (
            <button
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-sm text-brand"
            >
              只顯示 {formatKey(selectedDate)}
              <Icon name="close" className="size-3.5" />
            </button>
          )}

          {viewer.role === "family" && (
            <p className="rounded-xl bg-surface px-3 py-2 text-center text-xs text-muted">親友身分僅能瀏覽內容</p>
          )}

          {(tab === "journal" || tab === "question") && (
            <>
              {can.post(viewer.role) && (
                <Composer key={tab} caseId={caseId} kind={tab} viewer={viewer} defaultDate={selectedDate} />
              )}
              <PostList posts={postsOf(tab)} viewer={viewer} caseId={caseId} kind={tab} filtered={!!selectedDate} />
            </>
          )}

          {tab === "task" && <TasksSection tasks={data.tasks} viewer={viewer} caseId={caseId} />}
        </main>

        {/* 手機：底部分頁列 */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                tab === t.id ? "text-brand" : "text-muted"
              }`}
            >
              <Icon name={t.icon} className="size-6" />
              {t.label}
              {badges[t.id] > 0 && (
                <span className="absolute top-1.5 left-1/2 ml-2 min-w-4.5 rounded-full bg-alert px-1 text-center text-[10px] leading-4.5 text-white">
                  {badges[t.id] > 99 ? "99+" : badges[t.id]}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {can.useAi(viewer.role) && (
        <Sheet open={aiOpen} onClose={() => setAiOpen(false)} title="AI 個案摘要">
          <AiSummaryPanel caseId={caseId} summaries={data.summaries} />
        </Sheet>
      )}
    </ReadTracker>
  );
}

function PostList({
  posts,
  viewer,
  caseId,
  kind,
  filtered,
}: {
  posts: PostDTO[];
  viewer: ViewerInfo;
  caseId: string;
  kind: PostDTO["kind"];
  filtered: boolean;
}) {
  if (posts.length === 0) {
    const what = kind === "journal" ? "日誌" : "提問";
    return <EmptyState>{filtered ? `這天沒有${what}` : `還沒有${what}`}</EmptyState>;
  }
  return posts.map((p) => <PostCard key={p.id} post={p} viewer={viewer} caseId={caseId} />);
}

function computeBadges(data: CaseData, staffView: boolean): Record<Tab, number> {
  const hasUnreadReply = (p: PostDTO) => p.comments.some((c) => c.unread);
  const journals = data.posts.filter((p) => p.kind === "journal");
  const questions = data.posts.filter((p) => p.kind === "question");

  if (staffView) {
    return {
      journal: journals.filter((p) => p.unread).length,
      question: questions.filter((p) => !p.comments.some((c) => isStaff(c.author.role))).length,
      task: 0,
    };
  }
  return {
    journal: journals.filter(hasUnreadReply).length,
    question: questions.filter(hasUnreadReply).length,
    task: data.tasks.filter((t) => !t.completedAt).length,
  };
}
