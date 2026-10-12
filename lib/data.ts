import "server-only";
import { dbConnect } from "./db";
import { AiSummary, Case, Comment, Goal, Post, Task, User } from "./models";
import { isStaff, type Role } from "./roles";
import type { Viewer } from "./auth";
import type {
  AiSummaryDTO,
  CaseDTO,
  CommentDTO,
  DayMark,
  CaseProfileDTO,
  GoalDTO,
  GoalHistoryDTO,
  MediaDTO,
  PersonDTO,
  PostDTO,
  TaskDTO,
} from "./types";

type PopulatedPerson = { _id: unknown; name: string; role: string } | null | undefined;

function person(p: PopulatedPerson): PersonDTO {
  if (!p) return { id: "", name: "已刪除的使用者", role: "family" };
  return { id: String(p._id), name: p.name, role: p.role as Role };
}

function hasId(list: unknown[] | undefined, id: string) {
  return (list ?? []).some((x) => String(x) === id);
}

export async function listCasesFor(viewer: Viewer): Promise<CaseDTO[]> {
  await dbConnect();
  const filter = viewer.role === "admin" ? {} : { _id: { $in: viewer.caseIds } };
  const cases = await Case.find(filter).sort({ name: 1 }).lean();
  return cases.map((c) => ({ id: String(c._id), name: c.name, note: c.note ?? "", avatarUrl: c.avatarUrl ?? "" }));
}

export async function loadCaseData(viewer: Viewer, caseId: string) {
  await dbConnect();
  const kase = await Case.findById(caseId).lean();
  if (!kase) return null;

  const staffView = isStaff(viewer.role);

  const [postDocs, commentDocs, taskDocs, summaryDocs, goalDocs, memberDocs] = await Promise.all([
    Post.find({ case: caseId }).sort({ date: -1, createdAt: -1 }).populate("author", "name role").lean(),
    Comment.find({ case: caseId }).sort({ createdAt: 1 }).populate("author", "name role").lean(),
    Task.find({ case: caseId })
      .sort({ createdAt: -1 })
      .populate("therapist", "name role")
      .populate("completedBy", "name role")
      .lean(),
    staffView
      ? AiSummary.find({ case: caseId }).sort({ createdAt: -1 }).limit(20).populate("requestedBy", "name role").lean()
      : Promise.resolve([]),
    Goal.find({ case: caseId })
      .sort({ createdAt: -1 })
      .populate("therapist", "name role")
      .populate("history.by", "name role")
      .lean(),
    User.find({ cases: caseId, role: { $in: ["therapist", "caregiver"] } }, { name: 1, role: 1 })
      .sort({ name: 1 })
      .lean(),
  ]);

  const comments: CommentDTO[] = commentDocs.map((c) => {
    const author = person(c.author as unknown as PopulatedPerson);
    return {
      id: String(c._id),
      postId: c.post ? String(c.post) : null,
      text: c.text,
      createdAt: new Date(c.createdAt).toISOString(),
      author,
      // 第一類與親友才需要追蹤「治療師回覆是否已讀」
      unread: !staffView && author.id !== viewer.id && !hasId(c.readBy, viewer.id),
    };
  });

  const commentsByPost = new Map<string, CommentDTO[]>();
  for (const c of comments) {
    if (!c.postId) continue;
    const list = commentsByPost.get(c.postId) ?? [];
    list.push(c);
    commentsByPost.set(c.postId, list);
  }

  const posts: PostDTO[] = postDocs.map((p) => {
    const id = String(p._id);
    return {
      id,
      kind: p.kind as PostDTO["kind"],
      text: p.text ?? "",
      media: (p.media ?? []).map((m) => ({
        url: m.url,
        pathname: m.pathname,
        contentType: m.contentType ?? "",
        type: m.type as MediaDTO["type"],
      })),
      date: p.date,
      createdAt: new Date(p.createdAt).toISOString(),
      author: person(p.author as unknown as PopulatedPerson),
      unread: staffView && !hasId(p.readBy, viewer.id),
      comments: commentsByPost.get(id) ?? [],
    };
  });

  const tasks: TaskDTO[] = taskDocs.map((t) => ({
    id: String(t._id),
    title: t.title,
    content: t.content ?? "",
    createdAt: new Date(t.createdAt).toISOString(),
    therapist: person(t.therapist as unknown as PopulatedPerson),
    completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : null,
    completedBy: t.completedBy ? person(t.completedBy as unknown as PopulatedPerson) : null,
  }));

  const summaries: AiSummaryDTO[] = summaryDocs.map((s) => ({
    id: String(s._id),
    rangeStart: s.rangeStart,
    rangeEnd: s.rangeEnd,
    instruction: s.instruction ?? "",
    content: s.content,
    createdAt: new Date(s.createdAt).toISOString(),
    requestedBy: person(s.requestedBy as unknown as PopulatedPerson).name,
  }));

  const goals: GoalDTO[] = goalDocs.map((g) => ({
    id: String(g._id),
    title: g.title,
    progress: g.progress,
    note: g.note ?? "",
    updatedAt: new Date(g.updatedAt).toISOString(),
    therapist: person(g.therapist as unknown as PopulatedPerson),
  }));

  // 目標歷程：攤平每個目標的更新紀錄，最新的在前
  const goalHistory: GoalHistoryDTO[] = goalDocs
    .flatMap((g) =>
      (g.history ?? []).map((h, i, list) => ({
        goalTitle: g.title,
        at: new Date(h.at).toISOString(),
        progress: h.progress,
        prevProgress: i > 0 ? list[i - 1].progress : null,
        note: h.note ?? "",
        by: person(h.by as unknown as PopulatedPerson).name,
      })),
    )
    .sort((a, b) => b.at.localeCompare(a.at));

  const profile: CaseProfileDTO = {
    avatarUrl: kase.avatarUrl ?? "",
    birthDate: kase.birthDate ?? "",
    healthStatus: kase.healthStatus ?? "",
    conditions: (kase.conditions ?? []).map((c) => ({ name: c.name, date: c.date ?? "" })),
    primaryCaregiver: kase.primaryCaregiver ?? "",
    therapists: memberDocs.filter((u) => u.role === "therapist").map((u) => u.name),
    caregivers: memberDocs.filter((u) => u.role === "caregiver").map((u) => u.name),
  };

  return {
    case: { id: String(kase._id), name: kase.name, note: kase.note ?? "" } satisfies CaseDTO,
    profile,
    goalHistory,
    posts,
    comments,
    tasks,
    summaries,
    goals,
    marks: computeMarks(posts, comments, staffView),
  };
}

export type CaseData = NonNullable<Awaited<ReturnType<typeof loadCaseData>>>;

function computeMarks(posts: PostDTO[], comments: CommentDTO[], staffView: boolean) {
  const marks: Record<string, DayMark> = {};
  const rank: Record<DayMark, number> = { dot: 0, half: 1, full: 2 };
  const raise = (date: string, mark: DayMark) => {
    if (!marks[date] || rank[mark] > rank[marks[date]]) marks[date] = mark;
  };

  for (const p of posts) {
    if (staffView) {
      // 治療師：未讀 → 整顆變色；已讀但尚無治療師回覆 → 半顆變色
      const replied = p.comments.some((c) => isStaff(c.author.role));
      raise(p.date, p.unread ? "full" : replied ? "dot" : "half");
    } else {
      raise(p.date, "dot");
    }
  }

  if (!staffView) {
    // 個案端：有未讀的治療師回覆 → 原日誌／提問的日期變色
    const postDate = new Map(posts.map((p) => [p.id, p.date]));
    for (const c of comments) {
      const date = c.unread && c.postId ? postDate.get(c.postId) : undefined;
      if (date) raise(date, "full");
    }
  }

  return marks;
}
