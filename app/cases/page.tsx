import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { BraidLines, BrandStripe, Logo } from "@/components/Brand";
import { requireUser } from "@/lib/auth";
import { listCasesFor } from "@/lib/data";
import { ROLE_LABELS } from "@/lib/roles";

export default async function CasesPage() {
  const user = await requireUser();
  const cases = await listCasesFor(user);

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <BraidLines
        className="pointer-events-none absolute -top-10 -left-[10%] h-56 w-[120%] opacity-[0.1]"
        strokeWidth={10}
      />
      <div className="relative mx-auto w-full max-w-4xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10 md:px-8 md:pt-8">
        <header className="mb-8 flex items-center justify-between">
          <Logo className="h-8 w-auto" />
          <div className="flex items-center gap-3 text-sm">
            {user.role === "admin" && (
              <Link href="/admin" className="text-brand">
                後台
              </Link>
            )}
            <form action={logout}>
              <button className="text-muted">登出</button>
            </form>
          </div>
        </header>

        <h1 className="text-2xl font-bold text-ink md:text-3xl">嗨，{user.name}</h1>
        <p className="mt-1 mb-6 text-muted">{ROLE_LABELS[user.role]}・今天想看看誰的軌跡？</p>

        {cases.length === 0 ? (
          <p className="rounded-2xl bg-surface p-6 text-center text-muted">尚未被加入任何個案，請聯絡管理員。</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/cases/${c.id}`}
                  className="group block overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-line transition hover:shadow-md hover:ring-brand/40 active:bg-brand-soft"
                >
                  <BrandStripe className="h-1 opacity-70 transition group-hover:opacity-100" />
                  <span className="flex items-center gap-3 p-4">
                    {c.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.avatarUrl}
                        alt=""
                        className="size-12 rounded-full object-cover ring-2 ring-brand-soft"
                      />
                    ) : (
                      <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-lg font-semibold text-brand">
                        {c.name.slice(0, 1)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{c.name}</span>
                      {c.note && <span className="block truncate text-sm text-muted">{c.note}</span>}
                    </span>
                    <span className="text-muted transition group-hover:translate-x-0.5 group-hover:text-brand">›</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
