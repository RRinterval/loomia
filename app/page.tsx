import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { homePathFor } from "@/lib/home";
import { User } from "@/lib/models";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    await dbConnect();
    redirect((await User.exists({})) ? "/login" : "/setup");
  }
  redirect(homePathFor(user));
}
