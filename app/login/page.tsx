import Image from "next/image";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";
import { BraidLines, BrandStripe } from "@/components/Brand";

const ROLES = [
  { color: "bg-brand", title: "個案", text: "用日誌記下每天的狀況與小小進步" },
  { color: "bg-alert", title: "照顧者", text: "分享照顧日常，有疑問隨時提出" },
  { color: "bg-indigo", title: "治療師", text: "即時回覆、給建議任務、追蹤目標進度" },
];

const FEATURES = [
  { title: "日誌", text: "文字、照片、影片，一天一天累積成軌跡" },
  { title: "提問", text: "照顧上的疑惑，直接交給治療師" },
  { title: "建議任務", text: "治療師的建議變成小卡，完成就收進收集盒" },
  { title: "目標進度", text: "每 20% 一格，看得見的改變" },
];

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      {/* 背景：三色編織線 */}
      <BraidLines className="pointer-events-none absolute top-[8%] -left-[10%] h-64 w-[120%] opacity-[0.12]" strokeWidth={10} />
      <BraidLines className="pointer-events-none absolute -right-[10%] bottom-[4%] h-48 w-[120%] -scale-x-100 opacity-[0.08]" strokeWidth={8} />

      <div className="relative mx-auto grid max-w-6xl gap-8 px-5 pt-8 pb-10 md:px-8 lg:min-h-dvh lg:grid-cols-[1.1fr_1fr] lg:content-center lg:gap-x-16 lg:gap-y-10 lg:py-16">
        {/* 主視覺 */}
        <section className="lg:col-start-1 lg:row-start-1">
          <Image
            src="/logo.png"
            alt="Loomia 生活優化軌跡記憶"
            width={2880}
            height={1280}
            priority
            className="-mx-[6%] w-[112%] max-w-none sm:mx-auto sm:w-full sm:max-w-xl lg:-ml-[7%] lg:w-[114%] lg:max-w-none"
          />
          <h1 className="mt-2 text-center text-[1.7rem] leading-snug font-bold tracking-tight text-ink sm:text-4xl lg:text-left">
            讓個案、照顧者、治療師
            <br />
            <span className="text-brand">緊密交織</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-center leading-relaxed text-muted lg:mx-0 lg:text-left">
            每一天的一小步，都被好好記住。日誌、提問、建議任務與目標進度，串成一條看得見的生活優化軌跡。
          </p>
        </section>

        {/* 登入卡 */}
        <section className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <div className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-xl shadow-ink/5 ring-1 ring-line">
            <BrandStripe className="h-1.5" />
            <div className="p-7 sm:p-9">
              <h2 className="text-2xl font-bold text-ink">歡迎回來</h2>
              <p className="mt-1 mb-7 text-sm text-muted">登入後，接續今天的紀錄</p>
              <AuthForm
                action={login}
                submitLabel="登入"
                fields={[
                  { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
                  { name: "password", label: "密碼", type: "password", autoComplete: "current-password" },
                ]}
              />
              <p className="mt-6 text-center text-xs text-muted">帳號由管理員建立，忘記密碼請聯絡管理員。</p>
            </div>
          </div>
        </section>

        {/* 三種角色 */}
        <section className="lg:col-start-1 lg:row-start-2">
          <ul className="mx-auto grid max-w-md gap-3 sm:max-w-none sm:grid-cols-3">
            {ROLES.map((r) => (
              <li key={r.title} className="rounded-2xl bg-surface/70 p-4 ring-1 ring-line backdrop-blur-sm">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  <span className={`size-2.5 rounded-full ${r.color}`} />
                  {r.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{r.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* 功能 */}
        <section className="border-t border-line pt-8 lg:col-span-2">
          <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <li key={f.title} className="flex gap-3">
                <span className="text-sm font-bold text-brand tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block font-semibold text-ink">{f.title}</span>
                  <span className="block text-sm leading-relaxed text-muted">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="relative pb-6 text-center text-xs text-muted">© Loomia・生活優化軌跡記憶</footer>
    </main>
  );
}
