"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { updateAvatar, updateProfile } from "@/app/actions/profile";
import { compressAvatar } from "@/lib/compress";
import { formatDateTime, todayKey, toDateKey } from "@/lib/dates";
import { can, ROLE_LABELS } from "@/lib/roles";
import type { CaseDTO, CaseProfileDTO, GoalHistoryDTO } from "@/lib/types";
import { Avatar, Icon } from "../ui";
import type { ViewerInfo } from "./CaseApp";
import { Linkify } from "../Linkify";

function ageFrom(birthDate: string) {
  if (!birthDate) return null;
  const today = todayKey();
  const years = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return today.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

function formatMonth(ym: string) {
  return ym ? `${ym.slice(0, 4)}年${Number(ym.slice(5, 7))}月` : "";
}

/** 個案大頭照；沒有照片時顯示姓名首字 */
function CaseAvatar({ name, url, className }: { name: string; url: string; className: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className={`object-cover ${className}`} />
  ) : (
    <span className={`flex items-center justify-center bg-brand-soft font-semibold text-brand ${className}`}>
      {name.slice(0, 1)}
    </span>
  );
}

/* ---------- 個案區塊（目標卡上方） ---------- */

export function CaseProfile({
  kase,
  profile,
  goalHistory,
  viewer,
  canSwitchCase,
}: {
  kase: CaseDTO;
  profile: CaseProfileDTO;
  goalHistory: GoalHistoryDTO[];
  viewer: ViewerInfo;
  canSwitchCase: boolean;
}) {
  const [open, setOpen] = useState(false);
  const age = ageFrom(profile.birthDate);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-3xl bg-surface p-3 text-left shadow-sm hover:shadow-md"
      >
        <CaseAvatar name={kase.name} url={profile.avatarUrl} className="size-14 shrink-0 rounded-full text-xl" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-semibold">{kase.name}</span>
          <span className="block truncate text-sm text-muted">
            {[age !== null && `${age} 歲`, profile.therapists.length > 0 && `治療師 ${profile.therapists.join("、")}`]
              .filter(Boolean)
              .join("・") || "查看個案資料卡"}
          </span>
        </span>
        <span className="rounded-full bg-canvas px-3 py-1 text-xs text-brand">資料卡 ›</span>
      </button>

      {open && (
        <PlayerCard
          kase={kase}
          profile={profile}
          goalHistory={goalHistory}
          canEdit={can.editProfile(viewer.role)}
          viewer={viewer}
          canSwitchCase={canSwitchCase}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ---------- 球員卡式彈出視窗：左右切換三頁 ---------- */

const PAGES = ["基本資料", "醫療狀況", "目標歷程"];

function PlayerCard({
  kase,
  profile,
  goalHistory,
  canEdit,
  viewer,
  canSwitchCase,
  onClose,
}: {
  kase: CaseDTO;
  profile: CaseProfileDTO;
  goalHistory: GoalHistoryDTO[];
  canEdit: boolean;
  viewer: ViewerInfo;
  canSwitchCase: boolean;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const goTo = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const next = Math.max(0, Math.min(PAGES.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goTo(page + 1);
      if (e.key === "ArrowLeft") goTo(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={onClose} />

      <div className={`relative flex w-full animate-pop flex-col items-center ${editing ? "max-w-lg" : "max-w-sm sm:max-w-md"}`}>
        {/* 卡片外框：仿球員卡的金屬漸層邊 */}
        <div className="w-full rounded-[28px] bg-gradient-to-br from-brand via-alert to-indigo p-1.5 shadow-2xl">
          <div className="flex h-[min(78dvh,600px)] flex-col overflow-hidden rounded-[22px] bg-surface">
            <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-white">
                LOOMIA
              </span>
              <span className="flex-1 text-sm font-medium">{editing ? "編輯資料" : PAGES[page]}</span>
              {!editing && <span className="text-xs text-muted">{page + 1} / {PAGES.length}</span>}
              {canEdit && !editing && (
                <button onClick={() => setEditing(true)} className="rounded-full bg-canvas px-3 py-1 text-xs text-brand">
                  編輯
                </button>
              )}
            </div>

            {editing ? (
              <ProfileEditor kase={kase} profile={profile} onDone={() => setEditing(false)} />
            ) : (
              <div
                ref={scroller}
                onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
                className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto"
              >
                <CardPage>
                  <BasicPage kase={kase} profile={profile} canEdit={canEdit} />
                  <AccountPanel viewer={viewer} caseName={kase.name} canSwitchCase={canSwitchCase} />
                </CardPage>
                <CardPage>
                  <MedicalPage profile={profile} />
                </CardPage>
                <CardPage>
                  <HistoryPage history={goalHistory} />
                </CardPage>
              </div>
            )}
          </div>
        </div>

        {!editing && (
          <div className="mt-4 flex items-center gap-4">
            <button onClick={() => goTo(page - 1)} disabled={page === 0} className="rounded-full bg-white/20 p-2 text-white disabled:opacity-30" aria-label="上一頁">
              ‹
            </button>
            <div className="flex gap-2">
              {PAGES.map((p, i) => (
                <button
                  key={p}
                  onClick={() => goTo(i)}
                  aria-label={p}
                  className={`h-2 rounded-full transition-all ${i === page ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                />
              ))}
            </div>
            <button
              onClick={() => goTo(page + 1)}
              disabled={page === PAGES.length - 1}
              className="rounded-full bg-white/20 p-2 text-white disabled:opacity-30"
              aria-label="下一頁"
            >
              ›
            </button>
          </div>
        )}

        <button onClick={onClose} className="absolute -top-3 -right-1 rounded-full bg-white p-1.5 text-ink shadow-lg" aria-label="關閉">
          <Icon name="close" className="size-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

/* 第一頁底部：目前登入的帳號與切換個案、管理後台、登出（原本在頁首頭像選單） */
function AccountPanel({
  viewer,
  caseName,
  canSwitchCase,
}: {
  viewer: ViewerInfo;
  caseName: string;
  canSwitchCase: boolean;
}) {
  return (
    <div className="px-4 pb-4">
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="flex items-center gap-3 bg-canvas px-4 py-3">
          <Avatar name={viewer.name} role={viewer.role} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{viewer.name}</p>
            <p className="truncate text-xs text-muted">
              {ROLE_LABELS[viewer.role]}・目前登入
              {viewer.role !== "patient" && `・${caseName}`}
            </p>
          </div>
        </div>
        <div className="divide-y divide-line text-sm">
          {canSwitchCase && (
            <Link href="/cases" className="block px-4 py-3 hover:bg-canvas">
              切換個案
            </Link>
          )}
          {viewer.role === "admin" && (
            <Link href="/admin" className="block px-4 py-3 hover:bg-canvas">
              管理後台
            </Link>
          )}
          <form action={logout}>
            <button className="w-full px-4 py-3 text-left text-alert hover:bg-canvas">登出</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function CardPage({ children }: { children: ReactNode }) {
  return <div className="w-full shrink-0 snap-center overflow-x-hidden overflow-y-auto">{children}</div>;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-canvas px-4 py-3">
      <p className="text-[11px] tracking-wide text-muted">{label}</p>
      <div className="mt-0.5 font-medium">{children}</div>
    </div>
  );
}

const Empty = () => <span className="font-normal text-muted">未填寫</span>;

/* 第一頁：照片、姓名、年紀、連結治療師 */
function BasicPage({ kase, profile, canEdit }: { kase: CaseDTO; profile: CaseProfileDTO; canEdit: boolean }) {
  const age = ageFrom(profile.birthDate);
  return (
    <div>
      <div className="relative aspect-[4/3] bg-gradient-to-br from-brand to-indigo">
        <CaseAvatar name={kase.name} url={profile.avatarUrl} className="size-full text-7xl" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-3 text-white">
          <p className="text-[11px] tracking-[0.2em] text-white/80">CASE PROFILE</p>
          <p className="text-2xl font-bold break-words">{kase.name}</p>
        </div>
        {canEdit && <AvatarUploader caseId={kase.id} hasAvatar={!!profile.avatarUrl} />}
      </div>
      <div className="grid grid-cols-2 gap-2 p-4">
        <InfoRow label="年齡">{age !== null ? `${age} 歲` : <Empty />}</InfoRow>
        <InfoRow label="生日">{profile.birthDate || <Empty />}</InfoRow>
        <div className="col-span-2">
          <InfoRow label="連結治療師">
            {profile.therapists.length ? profile.therapists.join("、") : <span className="font-normal text-muted">尚未指派</span>}
          </InfoRow>
        </div>
      </div>
    </div>
  );
}

/* 第二頁：健康狀態、重要疾病、主要照顧者 */
function MedicalPage({ profile }: { profile: CaseProfileDTO }) {
  const caregiver = profile.primaryCaregiver || profile.caregivers.join("、");
  return (
    <div className="space-y-3 p-4">
      <InfoRow label="健康狀態">
        {profile.healthStatus ? <p className="whitespace-pre-wrap">
            <Linkify text={profile.healthStatus} />
          </p> : <Empty />}
      </InfoRow>

      <div className="rounded-2xl bg-canvas px-4 py-3">
        <p className="text-[11px] tracking-wide text-muted">重要疾病</p>
        {profile.conditions.length === 0 ? (
          <p className="mt-0.5">
            <Empty />
          </p>
        ) : (
          <ol className="mt-2 space-y-2 border-l-2 border-brand/30 pl-3">
            {profile.conditions.map((c, i) => (
              <li key={i} className="relative">
                <span className="absolute top-1.5 -left-[17px] size-2 rounded-full bg-brand" />
                {c.date && <span className="block text-xs text-brand">{formatMonth(c.date)}</span>}
                <span className="font-medium">{c.name}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <InfoRow label="主要照顧者">{caregiver || <Empty />}</InfoRow>
    </div>
  );
}

/* 第三頁：目標歷程表 */
function HistoryPage({ history }: { history: GoalHistoryDTO[] }) {
  if (history.length === 0) {
    return <p className="p-8 text-center text-sm text-muted">治療師更新目標或進度後，會記錄在這裡</p>;
  }
  return (
    <table className="w-full table-fixed text-left text-xs">
      <thead className="sticky top-0 bg-canvas text-muted">
        <tr>
          <th className="w-24 py-2 pr-1 pl-3 font-medium">日期</th>
          <th className="px-1 py-2 font-medium">目標</th>
          <th className="w-20 px-1 py-2 font-medium">進度</th>
          <th className="py-2 pr-3 pl-1 font-medium">說明</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {history.map((h, i) => (
          <tr key={i} className="align-top">
            <td className="py-2.5 pr-1 pl-3 whitespace-nowrap text-muted" title={formatDateTime(h.at)}>
              {toDateKey(h.at)}
            </td>
            <td className="px-1 py-2.5 font-medium break-words">{h.goalTitle}</td>
            <td className="px-1 py-2.5 whitespace-nowrap">
              {h.prevProgress === null || h.prevProgress === h.progress ? (
                <span className="text-brand">{h.progress}%</span>
              ) : (
                <>
                  <span className="text-muted">{h.prevProgress}%</span>
                  <span className="mx-0.5 text-muted">→</span>
                  <span className={h.progress > h.prevProgress ? "font-semibold text-brand" : "font-semibold text-alert"}>
                    {h.progress}%
                  </span>
                </>
              )}
            </td>
            <td className="py-2.5 pr-3 pl-1 break-words whitespace-pre-wrap">
              {h.note ? <Linkify text={h.note} /> : <span className="text-muted">—</span>}
              <span className="block text-[10px] text-muted">{h.by}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- 大頭照上傳 ---------- */

function AvatarUploader({ caseId, hasAvatar }: { caseId: string; hasAvatar: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (picked: File | undefined) => {
    if (!picked) return;
    if (!picked.type.startsWith("image/")) return alert("請選擇圖片檔");
    setBusy(true);
    try {
      const file = await compressAvatar(picked); // 大頭照縮到 512px
      const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-60) || "avatar";
      const blob = await upload(`cases/${caseId}/avatar/${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ caseId, purpose: "avatar" }),
      });
      const result = await updateAvatar(caseId, { url: blob.url, pathname: blob.pathname });
      if (!result.ok) alert(result.error);
    } catch (err) {
      console.error(err);
      alert("上傳失敗，請稍後再試");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async () => {
    if (!confirm("確定要移除大頭照嗎？")) return;
    setBusy(true);
    const result = await updateAvatar(caseId, null);
    if (!result.ok) alert(result.error);
    setBusy(false);
  };

  return (
    <div className="absolute top-3 right-3 flex gap-2">
      {hasAvatar && !busy && (
        <button onClick={remove} className="rounded-full bg-black/45 px-3 py-1.5 text-xs text-white backdrop-blur">
          移除
        </button>
      )}
      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        className="flex items-center gap-1 rounded-full bg-black/45 px-3 py-1.5 text-xs text-white backdrop-blur"
      >
        <Icon name="photo" className="size-4" />
        {busy ? "上傳中…" : hasAvatar ? "更換照片" : "上傳大頭照"}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files?.[0])} />
    </div>
  );
}

/* ---------- 編輯基本資料與醫療狀況 ---------- */

const inputClass = "w-full min-w-0 rounded-xl border border-line px-3 py-2.5 text-base outline-none focus:border-brand";

function ProfileEditor({ kase, profile, onDone }: { kase: CaseDTO; profile: CaseProfileDTO; onDone: () => void }) {
  const [name, setName] = useState(kase.name);
  const [birthDate, setBirthDate] = useState(profile.birthDate);
  const [healthStatus, setHealthStatus] = useState(profile.healthStatus);
  const [conditions, setConditions] = useState(profile.conditions.length ? profile.conditions : [{ name: "", date: "" }]);
  const [primaryCaregiver, setPrimaryCaregiver] = useState(profile.primaryCaregiver);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const setCondition = (i: number, patch: Partial<{ name: string; date: string }>) =>
    setConditions((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const save = () =>
    startTransition(async () => {
      setError("");
      const result = await updateProfile(kase.id, { name, birthDate, healthStatus, conditions, primaryCaregiver });
      if (result.ok) onDone();
      else setError(result.error);
    });

  return (
    <div className="flex-1 space-y-3 overflow-x-hidden overflow-y-auto p-4">
      <Field label="姓名">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
      </Field>
      <Field label="生日">
        <input type="date" value={birthDate} max={todayKey()} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
      </Field>
      <Field label="健康狀態">
        <textarea
          value={healthStatus}
          onChange={(e) => setHealthStatus(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="例如：整體穩定，需注意吞嚥"
          className={`${inputClass} resize-none`}
        />
      </Field>

      <div>
        <span className="mb-1 block text-sm text-muted">重要疾病（年月）</span>
        <div className="space-y-2">
          {conditions.map((c, i) => (
            // 疾病名稱獨佔一行、年月與移除在下一行，窄螢幕也不會擠壓或需要左右捲動
            <div key={i} className="min-w-0 space-y-2 rounded-2xl border border-line p-2.5">
              <input
                value={c.name}
                onChange={(e) => setCondition(i, { name: e.target.value })}
                placeholder="疾病名稱，例如：腦性麻痺"
                maxLength={100}
                className={inputClass}
              />
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-muted">診斷年月</span>
                <input
                  type="month"
                  value={c.date}
                  onChange={(e) => setCondition(i, { date: e.target.value })}
                  className={`${inputClass} min-w-0 flex-1`}
                />
                <button
                  onClick={() => setConditions((prev) => prev.filter((_, j) => j !== i))}
                  className="shrink-0 rounded-lg px-2 py-2 text-sm text-alert"
                >
                  移除
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => setConditions((prev) => [...prev, { name: "", date: "" }])}
            className="text-sm text-brand"
          >
            ＋ 新增一筆
          </button>
        </div>
      </div>

      <Field label="主要照顧者">
        <input
          value={primaryCaregiver}
          onChange={(e) => setPrimaryCaregiver(e.target.value)}
          maxLength={100}
          placeholder={profile.caregivers.join("、") || "例如：母親 王小美"}
          className={inputClass}
        />
      </Field>

      {error && <p className="text-sm text-alert">{error}</p>}
      <div className="flex gap-2 pt-1 pb-2">
        <button onClick={onDone} disabled={pending} className="flex-1 rounded-xl bg-canvas py-3 text-sm">
          取消
        </button>
        <button
          onClick={save}
          disabled={pending}
          className="flex-[2] rounded-xl bg-brand py-3 font-medium text-white active:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "儲存中…" : "儲存"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}
