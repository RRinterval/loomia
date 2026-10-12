import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import { GOAL_STEPS } from "./goals";
import { ROLES, type Role } from "./roles";

const { ObjectId } = Schema.Types;

// Plain interfaces instead of InferSchemaType: inferred mongoose types blow up the type checker.
type Timestamps = { createdAt: Date; updatedAt: Date };

// Next.js hot reload re-evaluates this module: recompile so schema changes take effect
// instead of reusing a stale model (which would reject newly added fields).
function model<T>(name: string, schema: Schema<T>): Model<T> {
  if (mongoose.models[name]) mongoose.deleteModel(name);
  return mongoose.model<T>(name, schema);
}

/* ---------- 使用者 ---------- */
export interface IUser extends Timestamps {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  // 個案/照顧者/親友通常只屬於一個個案；治療師可負責多個個案
  cases: Types.ObjectId[];
}
const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    cases: [{ type: ObjectId, ref: "Case" }],
  },
  { timestamps: true },
);
export const User = model<IUser>("User", userSchema);

/* ---------- 個案 ---------- */
export interface ICondition {
  name: string;
  date: string; // YYYY-MM
}
export interface ICase extends Timestamps {
  name: string;
  note: string;
  // 個案資料卡
  avatarUrl: string; // Vercel Blob URL
  avatarPathname: string;
  birthDate: string; // YYYY-MM-DD
  healthStatus: string;
  conditions: ICondition[]; // 重要疾病
  primaryCaregiver: string; // 主要照顧者（空白時顯示照顧者帳號）
}
const conditionSchema = new Schema<ICondition>(
  {
    name: { type: String, required: true, trim: true },
    date: { type: String, default: "" },
  },
  { _id: false },
);
const caseSchema = new Schema<ICase>(
  {
    name: { type: String, required: true, trim: true },
    note: { type: String, default: "", trim: true },
    avatarUrl: { type: String, default: "" },
    avatarPathname: { type: String, default: "" },
    birthDate: { type: String, default: "" },
    healthStatus: { type: String, default: "" },
    conditions: { type: [conditionSchema], default: [] },
    primaryCaregiver: { type: String, default: "" },
  },
  { timestamps: true },
);
export const Case = model<ICase>("Case", caseSchema);

/* ---------- 日誌與提問（相同結構，以 kind 區分） ---------- */
export interface IMedia {
  url: string; // Vercel Blob URL
  pathname: string;
  contentType: string;
  type: "image" | "video";
}
export interface IPost extends Timestamps {
  case: Types.ObjectId;
  author: Types.ObjectId;
  kind: "journal" | "question";
  text: string;
  media: IMedia[];
  date: string; // YYYY-MM-DD（台灣時間），日曆依此標記
  readBy: Types.ObjectId[]; // 已讀的治療師
}
const mediaSchema = new Schema<IMedia>(
  {
    url: { type: String, required: true },
    pathname: { type: String, required: true },
    contentType: { type: String, default: "" },
    type: { type: String, enum: ["image", "video"], required: true },
  },
  { _id: false },
);
const postSchema = new Schema<IPost>(
  {
    case: { type: ObjectId, ref: "Case", required: true, index: true },
    author: { type: ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["journal", "question"], required: true },
    text: { type: String, default: "" },
    media: { type: [mediaSchema], default: [] },
    date: { type: String, required: true },
    readBy: [{ type: ObjectId, ref: "User" }],
  },
  { timestamps: true },
);
postSchema.index({ case: 1, date: -1 });
export const Post = model<IPost>("Post", postSchema);

/* ---------- 治療師回覆／留言（post 為空時是獨立留言） ---------- */
export interface IComment extends Timestamps {
  case: Types.ObjectId;
  post: Types.ObjectId | null;
  author: Types.ObjectId;
  text: string;
  readBy: Types.ObjectId[];
}
const commentSchema = new Schema<IComment>(
  {
    case: { type: ObjectId, ref: "Case", required: true, index: true },
    post: { type: ObjectId, ref: "Post", default: null, index: true },
    author: { type: ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    readBy: [{ type: ObjectId, ref: "User" }],
  },
  { timestamps: true },
);
export const Comment = model<IComment>("Comment", commentSchema);

/* ---------- 治療師建議任務 ---------- */
export interface ITask extends Timestamps {
  case: Types.ObjectId;
  therapist: Types.ObjectId;
  title: string;
  content: string;
  completedAt: Date | null;
  completedBy: Types.ObjectId | null;
}
const taskSchema = new Schema<ITask>(
  {
    case: { type: ObjectId, ref: "Case", required: true, index: true },
    therapist: { type: ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    completedAt: { type: Date, default: null },
    completedBy: { type: ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
export const Task = model<ITask>("Task", taskSchema);

/* ---------- 治療目標（治療師設定進度與目前狀況） ---------- */
export interface IGoalUpdate {
  progress: number;
  note: string;
  by: Types.ObjectId;
  at: Date;
}
export interface IGoal extends Timestamps {
  case: Types.ObjectId;
  therapist: Types.ObjectId;
  title: string;
  progress: number; // 0–100，每 20% 一格
  note: string; // 目前狀況
  history: IGoalUpdate[]; // 每次更新的紀錄
}
const goalUpdateSchema = new Schema<IGoalUpdate>(
  {
    progress: { type: Number, required: true },
    note: { type: String, default: "" },
    by: { type: ObjectId, ref: "User", required: true },
    at: { type: Date, required: true },
  },
  { _id: false },
);
const goalSchema = new Schema<IGoal>(
  {
    case: { type: ObjectId, ref: "Case", required: true, index: true },
    therapist: { type: ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    progress: { type: Number, enum: GOAL_STEPS, default: 0 },
    note: { type: String, default: "" },
    history: { type: [goalUpdateSchema], default: [] },
  },
  { timestamps: true },
);
export const Goal = model<IGoal>("Goal", goalSchema);

/* ---------- AI 摘要結果 ---------- */
export interface IAiSummary extends Timestamps {
  case: Types.ObjectId;
  requestedBy: Types.ObjectId;
  rangeStart: string;
  rangeEnd: string;
  model: string;
  instruction: string; // 治療師的自訂指令；快捷摘要為空字串
  content: string;
  sourceMedia: string[]; // 送給 AI 參考的 Vercel Blob 連結
}
const aiSummarySchema = new Schema<IAiSummary>(
  {
    case: { type: ObjectId, ref: "Case", required: true, index: true },
    requestedBy: { type: ObjectId, ref: "User", required: true },
    rangeStart: { type: String, required: true },
    rangeEnd: { type: String, required: true },
    model: { type: String, required: true },
    instruction: { type: String, default: "" },
    content: { type: String, required: true },
    sourceMedia: [{ type: String }],
  },
  { timestamps: true },
);
export const AiSummary = model<IAiSummary>("AiSummary", aiSummarySchema);
