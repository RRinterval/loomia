// Serializable shapes passed from server to client components.
import type { Role } from "./roles";

export type PersonDTO = { id: string; name: string; role: Role };

export type MediaDTO = {
  url: string;
  pathname: string;
  contentType: string;
  type: "image" | "video";
};

export type CommentDTO = {
  id: string;
  postId: string | null;
  text: string;
  createdAt: string;
  author: PersonDTO;
  unread: boolean; // 對目前使用者而言未讀
};

export type PostDTO = {
  id: string;
  kind: "journal" | "question";
  text: string;
  media: MediaDTO[];
  date: string;
  createdAt: string;
  author: PersonDTO;
  unread: boolean; // 治療師尚未讀取
  comments: CommentDTO[];
};

export type TaskDTO = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  therapist: PersonDTO;
  completedAt: string | null;
  completedBy: PersonDTO | null;
};

/** dot: 有日誌；full: 未讀（整顆變色）；half: 已讀未回覆（半顆變色） */
export type DayMark = "dot" | "full" | "half";

export type AiSummaryDTO = {
  id: string;
  rangeStart: string;
  rangeEnd: string;
  instruction: string;
  content: string;
  createdAt: string;
  requestedBy: string;
};

export type GoalDTO = {
  id: string;
  title: string;
  progress: number;
  note: string;
  updatedAt: string;
  therapist: PersonDTO;
};

export type CaseDTO = { id: string; name: string; note: string; avatarUrl?: string };

export type CaseProfileDTO = {
  avatarUrl: string;
  birthDate: string;
  healthStatus: string;
  conditions: { name: string; date: string }[];
  primaryCaregiver: string;
  therapists: string[];
  caregivers: string[];
};

/** 目標歷程表的一列 */
export type GoalHistoryDTO = {
  goalTitle: string;
  at: string;
  progress: number;
  prevProgress: number | null; // 同一目標的上一次進度；第一次設定時為 null
  note: string;
  by: string;
};
