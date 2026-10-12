import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    await dbConnect();
    redirect((await User.exists({})) ? "/login" : "/setup");
  }
  if (user.role === "admin") redirect("/admin");
  if (user.caseIds.length === 1) redirect(`/cases/${user.caseIds[0]}`);
  redirect("/cases");
}
