import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { requireUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Case, Post, User } from "@/lib/models";
import type { Role } from "@/lib/roles";

export default async function AdminPage() {
  const admin = await requireUser();
  if (admin.role !== "admin") redirect("/");

  await dbConnect();
  const [cases, users, postCounts] = await Promise.all([
    Case.find().sort({ createdAt: -1 }).lean(),
    User.find().sort({ role: 1, name: 1 }).lean(),
    Post.aggregate<{ _id: unknown; count: number }>([{ $group: { _id: "$case", count: { $sum: 1 } } }]),
  ]);
  const countByCase = new Map(postCounts.map((c) => [String(c._id), c.count]));

  return (
    <AdminPanel
      adminId={admin.id}
      cases={cases.map((c) => ({
        id: String(c._id),
        name: c.name,
        note: c.note ?? "",
        postCount: countByCase.get(String(c._id)) ?? 0,
      }))}
      users={users.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        role: u.role as Role,
        caseIds: (u.cases ?? []).map(String),
      }))}
    />
  );
}
