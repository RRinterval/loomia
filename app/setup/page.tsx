import { redirect } from "next/navigation";
import { connection } from "next/server";
import { setupAdmin } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";
import { BraidLines, BrandStripe, Logo } from "@/components/Brand";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models";

export default async function SetupPage() {
  await connection(); // 每次請求都要查資料庫，不能在建置時預先產生
  await dbConnect();
  if (await User.exists({})) redirect("/login");

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <BraidLines className="pointer-events-none absolute top-[10%] -left-[10%] h-64 w-[120%] opacity-[0.1]" strokeWidth={10} />
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-xl shadow-ink/5 ring-1 ring-line">
        <BrandStripe className="h-1.5" />
        <div className="p-7 sm:p-9">
          <Logo className="h-9 w-auto" />
          <h1 className="mt-6 text-2xl font-bold text-ink">初始設定</h1>
          <p className="mt-1 mb-7 text-sm text-muted">建立第一個管理員帳號，之後由管理員建立其他使用者。</p>
          <AuthForm
            action={setupAdmin}
            submitLabel="建立管理員"
            fields={[
              { name: "name", label: "姓名", autoComplete: "name" },
              { name: "email", label: "Email", type: "email", autoComplete: "email" },
              { name: "password", label: "密碼（至少 8 碼）", type: "password", autoComplete: "new-password" },
            ]}
          />
        </div>
      </div>
    </main>
  );
}
