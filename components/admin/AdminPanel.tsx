"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createCase, createUser, deleteCase, deleteUser, updateCase, updateUser } from "@/app/actions/admin";
import { logout } from "@/app/actions/auth";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles";
import { Logo } from "../Brand";
import { Avatar, Icon, RoleBadge, Sheet } from "../ui";
import { Linkify } from "../Linkify";

type AdminCase = { id: string; name: string; note: string; postCount: number };
type AdminUser = { id: string; name: string; email: string; role: Role; caseIds: string[] };
type Result = { ok: boolean; error?: string };

const inputClass = "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-brand";

export function AdminPanel({ adminId, cases, users }: { adminId: string; cases: AdminCase[]; users: AdminUser[] }) {
  const [tab, setTab] = useState<"users" | "cases">("users");
  const [editingUser, setEditingUser] = useState<AdminUser | "new" | null>(null);
  const [editingCase, setEditingCase] = useState<AdminCase | "new" | null>(null);
  const caseName = new Map(cases.map((c) => [c.id, c.name]));

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10 md:px-8 md:pt-8">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <Logo className="h-8 w-auto" />
          <span className="ml-2 text-sm text-muted">管理後台</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/cases" className="text-brand">
            檢視個案
          </Link>
          <form action={logout}>
            <button className="text-muted">登出</button>
          </form>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 rounded-xl bg-surface p-1 text-sm shadow-sm md:max-w-sm">
        {(["users", "cases"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg py-2 ${tab === t ? "bg-brand text-white" : "text-muted"}`}
          >
            {t === "users" ? `使用者 ${users.length}` : `個案 ${cases.length}`}
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <section className="grid gap-2 md:grid-cols-2 md:gap-3">
          <AddButton label="新增使用者" onClick={() => setEditingUser("new")} />
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setEditingUser(u)}
              className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left shadow-sm"
            >
              <Avatar name={u.name} role={u.role} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-medium">{u.name}</span>
                  <RoleBadge role={u.role} />
                  {u.role !== "admin" && u.caseIds.length === 0 && (
                    <span className="rounded-full bg-alert-soft px-2 py-0.5 text-[11px] text-alert">未指派個案</span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted">
                  {u.email}
                  {u.caseIds.length > 0 && `・${u.caseIds.map((id) => caseName.get(id) ?? "?").join("、")}`}
                </span>
              </span>
              <span className="text-muted">›</span>
            </button>
          ))}
        </section>
      ) : (
        <section className="grid gap-2 md:grid-cols-2 md:gap-3">
          <AddButton label="新增個案" onClick={() => setEditingCase("new")} />
          {cases.map((c) => {
            const members = users.filter((u) => u.caseIds.includes(c.id));
            return (
              <div key={c.id} className="rounded-2xl bg-surface p-4 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.name}</p>
                    {c.note && <p className="text-sm text-muted">
                        <Linkify text={c.note} />
                      </p>}
                  </div>
                  <button onClick={() => setEditingCase(c)} className="text-sm text-brand">
                    編輯
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {c.postCount} 則貼文・成員：
                  {members.length ? members.map((m) => `${m.name}（${ROLE_LABELS[m.role]}）`).join("、") : "尚無"}
                </p>
                <Link href={`/cases/${c.id}`} className="mt-3 inline-block text-sm text-brand">
                  進入個案頁面 ›
                </Link>
              </div>
            );
          })}
        </section>
      )}

      <Sheet
        open={editingUser !== null}
        onClose={() => setEditingUser(null)}
        title={editingUser === "new" ? "新增使用者" : "編輯使用者"}
      >
        {editingUser !== null && (
          <UserForm
            key={editingUser === "new" ? "new" : editingUser.id}
            user={editingUser === "new" ? null : editingUser}
            cases={cases}
            isSelf={editingUser !== "new" && editingUser.id === adminId}
            onDone={() => setEditingUser(null)}
          />
        )}
      </Sheet>

      <Sheet
        open={editingCase !== null}
        onClose={() => setEditingCase(null)}
        title={editingCase === "new" ? "新增個案" : "編輯個案"}
      >
        {editingCase !== null && (
          <CaseForm
            key={editingCase === "new" ? "new" : editingCase.id}
            kase={editingCase === "new" ? null : editingCase}
            users={users}
            onDone={() => setEditingCase(null)}
          />
        )}
      </Sheet>
    </main>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand/40 py-3 text-sm font-medium text-brand hover:bg-brand-soft/50 md:col-span-2"
    >
      <Icon name="plus" className="size-4" />
      {label}
    </button>
  );
}

function useSubmit(onDone: () => void) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = (action: () => Promise<Result>) =>
    startTransition(async () => {
      setError("");
      const result = await action();
      if (result.ok) onDone();
      else setError(result.error ?? "發生錯誤");
    });
  return { error, pending, submit };
}

function UserForm({
  user,
  cases,
  isSelf,
  onDone,
}: {
  user: AdminUser | null;
  cases: AdminCase[];
  isSelf: boolean;
  onDone: () => void;
}) {
  const [role, setRole] = useState<Role>(user?.role ?? "patient");
  const { error, pending, submit } = useSubmit(onDone);

  return (
    <form
      action={(formData) => submit(() => (user ? updateUser(user.id, formData) : createUser(formData)))}
      className="space-y-3"
    >
      <Field label="姓名">
        <input name="name" defaultValue={user?.name} required className={inputClass} />
      </Field>
      {user ? (
        <p className="text-sm text-muted">{user.email}</p>
      ) : (
        <Field label="Email（登入帳號）">
          <input name="email" type="email" required className={inputClass} />
        </Field>
      )}
      <Field label={user ? "重設密碼（不改請留空）" : "密碼（至少 8 碼）"}>
        <input name="password" type="password" autoComplete="new-password" required={!user} className={inputClass} />
      </Field>
      <Field label="身分">
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          disabled={isSelf}
          className={inputClass}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        {isSelf && <input type="hidden" name="role" value={role} />}
      </Field>

      {role !== "admin" && (
        <div>
          <span className="mb-1 block text-sm text-muted">{role === "therapist" ? "負責的個案（可複選）" : "所屬個案"}</span>
          {cases.length === 0 ? (
            <p className="text-sm text-muted">請先到「個案」分頁建立個案</p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
              {cases.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                  <input
                    type="checkbox"
                    name="cases"
                    value={c.id}
                    defaultChecked={user?.caseIds.includes(c.id)}
                    className="size-4 accent-brand"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-alert">{error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-xl bg-brand py-3 font-medium text-white active:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "儲存中…" : user ? "儲存" : "建立使用者"}
      </button>
      {user && !isSelf && (
        <button
          type="button"
          disabled={pending}
          onClick={() => confirm(`確定要刪除 ${user.name} 嗎？`) && submit(() => deleteUser(user.id))}
          className="w-full py-2 text-sm text-alert"
        >
          刪除使用者
        </button>
      )}
    </form>
  );
}

function CaseForm({ kase, users, onDone }: { kase: AdminCase | null; users: AdminUser[]; onDone: () => void }) {
  const { error, pending, submit } = useSubmit(onDone);
  const candidates = users.filter((u) => u.role !== "admin");

  return (
    <form
      action={(formData) => submit(() => (kase ? updateCase(kase.id, formData) : createCase(formData)))}
      className="space-y-3"
    >
      <Field label="個案名稱">
        <input name="name" defaultValue={kase?.name} required className={inputClass} />
      </Field>
      <Field label="備註">
        <textarea name="note" defaultValue={kase?.note} rows={3} className={`${inputClass} resize-none`} />
      </Field>
      <div>
        <span className="mb-1 block text-sm text-muted">成員（個案本人、照顧者、親友、治療師）</span>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted">還沒有可指派的使用者</p>
        ) : (
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
            {candidates.map((u) => (
              <label key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                <input
                  type="checkbox"
                  name="members"
                  value={u.id}
                  defaultChecked={!!kase && u.caseIds.includes(kase.id)}
                  className="size-4 accent-brand"
                />
                <span className="min-w-0 flex-1 truncate">
                  {u.name} <span className="text-xs text-muted">{u.email}</span>
                </span>
                <RoleBadge role={u.role} />
              </label>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-alert">{error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-xl bg-brand py-3 font-medium text-white active:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "儲存中…" : kase ? "儲存" : "建立個案"}
      </button>
      {kase && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            confirm(`確定要刪除「${kase.name}」嗎？所有日誌、提問、回覆、任務與上傳檔案都會永久刪除。`) &&
            submit(() => deleteCase(kase.id))
          }
          className="w-full py-2 text-sm text-alert"
        >
          刪除個案
        </button>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}
