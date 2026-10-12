"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, keyToUtc, todayKey, weekdayOf } from "@/lib/dates";
import type { DayMark } from "@/lib/types";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKS_BEFORE_TODAY = 12;

/** 可左右滑動的週曆：有日誌的日期顯示小點，未讀整顆變色、已讀未回覆半顆變色。 */
export function Calendar({
  marks,
  selected,
  onSelect,
  staffView,
}: {
  marks: Record<string, DayMark>;
  selected: string | null;
  onSelect: (date: string | null) => void;
  staffView: boolean;
}) {
  const today = todayKey();

  const weeks = useMemo(() => {
    const earliestMark = Object.keys(marks).sort()[0];
    let start = addDays(today, -7 * WEEKS_BEFORE_TODAY);
    if (earliestMark && earliestMark < start) start = earliestMark;
    start = addDays(start, -weekdayOf(start)); // 對齊到週日
    const end = addDays(today, 6 - weekdayOf(today)); // 本週週六

    const result: string[][] = [];
    for (let d = start; d <= end; d = addDays(d, 7)) {
      result.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
    }
    return result;
  }, [marks, today]);

  const scroller = useRef<HTMLDivElement>(null);
  const [visibleWeek, setVisibleWeek] = useState(weeks.length - 1);

  const scrollToWeek = (index: number, behavior: ScrollBehavior = "smooth") => {
    const el = scroller.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(weeks.length - 1, index));
    el.scrollTo({ left: clamped * el.clientWidth, behavior });
  };

  // 一開始停在本週；之後寬度改變（轉向、從隱藏變顯示）時對齊回目前那一週
  const weekRef = useRef(weeks.length - 1);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0) el.scrollTo({ left: weekRef.current * el.clientWidth, behavior: "instant" });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onScroll = () => {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    const week = Math.round(el.scrollLeft / el.clientWidth);
    weekRef.current = week;
    setVisibleWeek(week);
  };

  // 展開成整月：顯示 monthKey（YYYY-MM）那個月
  const [expanded, setExpanded] = useState(false);
  const [monthKey, setMonthKey] = useState(today.slice(0, 7));
  const minMonth = weeks[0][0].slice(0, 7);
  const maxMonth = today.slice(0, 7);

  const visibleWeekMiddle = weeks[Math.min(visibleWeek, weeks.length - 1)][3];
  const toggleExpanded = () => {
    if (!expanded) {
      setMonthKey(visibleWeekMiddle.slice(0, 7));
    } else {
      // 收合時回到選取日期所在的週；沒有選取就回到該月第一週（本月則是本週）
      const target = selected ?? (monthKey === maxMonth ? today : `${monthKey}-01`);
      const index = weeks.findIndex((w) => w[0] <= target && target <= w[6]);
      const week = index === -1 ? weeks.length - 1 : index;
      weekRef.current = week;
      setVisibleWeek(week);
    }
    setExpanded(!expanded);
  };

  const monthWeeks = useMemo(() => {
    const first = `${monthKey}-01`;
    const rows: string[][] = [];
    for (let d = addDays(first, -weekdayOf(first)); d.slice(0, 7) <= monthKey; d = addDays(d, 7)) {
      rows.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
    }
    return rows;
  }, [monthKey]);

  const labelDate = keyToUtc(expanded ? `${monthKey}-01` : visibleWeekMiddle);
  const monthLabel = `${labelDate.getUTCFullYear()} 年 ${labelDate.getUTCMonth() + 1} 月`;
  const isCurrentWeek = visibleWeek === weeks.length - 1;
  const atLatest = expanded ? monthKey >= maxMonth : isCurrentWeek;
  const atEarliest = expanded ? monthKey <= minMonth : visibleWeek === 0;

  const goPrev = () => (expanded ? setMonthKey(shiftMonth(monthKey, -1)) : scrollToWeek(visibleWeek - 1));
  const goNext = () => (expanded ? setMonthKey(shiftMonth(monthKey, 1)) : scrollToWeek(visibleWeek + 1));
  const goToday = () => (expanded ? setMonthKey(maxMonth) : scrollToWeek(weeks.length - 1));

  const renderDay = (date: string, options: { showWeekday: boolean; outside?: boolean }) => (
    <Day
      key={date}
      date={date}
      mark={marks[date]}
      isToday={date === today}
      isSelected={date === selected}
      isFuture={date > today}
      showWeekday={options.showWeekday}
      outside={options.outside}
      onClick={() => onSelect(date === selected ? null : date)}
    />
  );

  return (
    <section className="bg-surface pt-2">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <button onClick={goPrev} disabled={atEarliest} className="p-1.5 text-muted disabled:opacity-30" aria-label={expanded ? "上個月" : "上一週"}>
            ‹
          </button>
          <span className="text-sm font-medium">{monthLabel}</span>
          <button onClick={goNext} disabled={atLatest} className="p-1.5 text-muted disabled:opacity-30" aria-label={expanded ? "下個月" : "下一週"}>
            ›
          </button>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <Legend staffView={staffView} />
          {!atLatest && (
            <button onClick={goToday} className="rounded-full bg-canvas px-2.5 py-1 text-brand">
              今天
            </button>
          )}
        </div>
      </div>

      {/* 週曆：展開時隱藏但保留，收合後由 ResizeObserver 對齊回該週 */}
      <div
        ref={scroller}
        onScroll={onScroll}
        className={`no-scrollbar snap-x snap-mandatory overflow-x-auto ${expanded ? "hidden" : "flex"}`}
      >
        {weeks.map((week) => (
          <div key={week[0]} className="grid w-full shrink-0 snap-start grid-cols-7 px-2">
            {week.map((date) => renderDay(date, { showWeekday: true }))}
          </div>
        ))}
      </div>

      {/* 整月 */}
      {expanded && (
        <div className="px-2">
          <div className="grid grid-cols-7 pt-1 pb-0.5 text-center text-[11px] text-muted">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          {monthWeeks.map((week) => (
            <div key={week[0]} className="grid grid-cols-7">
              {week.map((date) => renderDay(date, { showWeekday: false, outside: date.slice(0, 7) !== monthKey }))}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-label={expanded ? "收合成一週" : "展開整個月"}
        className="flex w-full justify-center pt-0.5 pb-1.5 text-muted hover:text-brand"
      >
        <svg viewBox="0 0 24 24" className={`size-5 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </section>
  );
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function Day({
  date,
  mark,
  isToday,
  isSelected,
  isFuture,
  showWeekday,
  outside,
  onClick,
}: {
  date: string;
  mark?: DayMark;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
  showWeekday: boolean;
  outside?: boolean; // 整月檢視中不屬於該月的日期
  onClick: () => void;
}) {
  const day = Number(date.slice(8));
  return (
    <button
      onClick={onClick}
      disabled={isFuture}
      className={`flex flex-col items-center gap-1 py-1 disabled:opacity-35 ${outside ? "opacity-40" : ""}`}
      aria-label={date}
      aria-pressed={isSelected}
    >
      {showWeekday && <span className="text-[11px] text-muted">{WEEKDAYS[weekdayOf(date)]}</span>}
      <span
        className={`flex size-9 items-center justify-center rounded-full text-sm ${
          isSelected
            ? "bg-brand font-semibold text-white"
            : isToday
              ? "font-semibold text-brand ring-1 ring-brand"
              : ""
        }`}
      >
        {day}
      </span>
      <Dot mark={mark} />
    </button>
  );
}

export function Dot({ mark }: { mark?: DayMark }) {
  if (!mark) return <span className="size-2" />;
  const style = mark === "full" ? "bg-alert" : mark === "half" ? "dot-half" : "bg-dot";
  return <span className={`size-2 rounded-full ${style}`} />;
}

function Legend({ staffView }: { staffView: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex items-center gap-1">
        <Dot mark="full" />
        {staffView ? "未讀" : "新回覆"}
      </span>
      {staffView && (
        <span className="flex items-center gap-1">
          <Dot mark="half" />
          未回覆
        </span>
      )}
    </span>
  );
}
