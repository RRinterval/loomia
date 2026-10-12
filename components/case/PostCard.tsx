"use client";

import { useState, useTransition } from "react";
import { createComment, deleteComment } from "@/app/actions/comments";
import { deletePost } from "@/app/actions/posts";
import { formatDateTime, formatKey } from "@/lib/dates";
import { can, isStaff } from "@/lib/roles";
import type { CommentDTO, MediaDTO, PostDTO } from "@/lib/types";
import { Avatar, Icon, RoleBadge } from "../ui";
import type { ViewerInfo } from "./CaseApp";
import { useReadMark } from "./ReadTracker";
import { Linkify } from "../Linkify";

export function PostCard({ post, viewer, caseId }: { post: PostDTO; viewer: ViewerInfo; caseId: string }) {
  const readRef = useReadMark("post", post.id, post.unread);
  const [pending, startTransition] = useTransition();
  const canDelete = post.author.id === viewer.id || can.moderate(viewer.role);
  const answered = post.comments.some((c) => isStaff(c.author.role));

  const remove = () => {
    if (!confirm("確定要刪除這則貼文嗎？照片與影片也會一併刪除。")) return;
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (!result.ok) alert(result.error);
    });
  };

  return (
    <article
      id={`post-${post.id}`}
      ref={readRef}
      className={`scroll-mt-40 rounded-2xl bg-surface shadow-sm ${pending ? "opacity-50" : ""} ${
        post.unread ? "ring-2 ring-alert/40" : ""
      }`}
    >
      <header className="flex items-center gap-3 px-4 pt-4">
        <Avatar name={post.author.name} role={post.author.role} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{post.author.name}</span>
            <RoleBadge role={post.author.role} />
          </div>
          <div className="text-xs text-muted">
            {formatKey(post.date)}・發布於 {formatDateTime(post.createdAt)}
          </div>
        </div>
        {post.unread && <span className="rounded-full bg-alert px-2 py-0.5 text-[11px] text-white">未讀</span>}
        {post.kind === "question" && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              answered ? "bg-brand-soft text-brand" : "bg-alert-soft text-alert"
            }`}
          >
            {answered ? "已回覆" : "等待回覆"}
          </span>
        )}
        {canDelete && (
          <button onClick={remove} disabled={pending} className="-mr-1 p-1 text-muted" aria-label="刪除">
            <Icon name="trash" className="size-4.5" />
          </button>
        )}
      </header>

      {post.text && <p className="px-4 pt-3 text-[15px] leading-relaxed whitespace-pre-wrap">
          <Linkify text={post.text} />
        </p>}
      {post.media.length > 0 && <MediaGrid media={post.media} />}

      <CommentThread comments={post.comments} viewer={viewer} />

      {can.reply(viewer.role) && <ReplyBox caseId={caseId} postId={post.id} />}
      {!can.reply(viewer.role) && post.comments.length === 0 && <div className="h-4" />}
    </article>
  );
}

/* ---------- 照片／影片 ---------- */

export function MediaGrid({ media }: { media: MediaDTO[] }) {
  const [viewing, setViewing] = useState<MediaDTO | null>(null);
  const single = media.length === 1;

  return (
    <>
      <div className={`mt-3 grid gap-0.5 ${single ? "grid-cols-1" : "grid-cols-2"}`}>
        {media.map((m, i) => (
          <button
            key={m.url}
            onClick={() => setViewing(m)}
            className={`relative overflow-hidden bg-canvas ${single ? "max-h-[28rem]" : "aspect-square"} ${
              media.length === 3 && i === 0 ? "col-span-2 aspect-[2/1]" : ""
            }`}
          >
            {m.type === "video" ? (
              <>
                <video
                  src={`${m.url}#t=0.1`}
                  preload="metadata"
                  muted
                  playsInline
                  className={`size-full ${single ? "max-h-[28rem] object-contain" : "object-cover"}`}
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/50 p-3 text-white">
                    <Icon name="play" className="size-6" />
                  </span>
                </span>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.url}
                alt=""
                loading="lazy"
                className={`size-full ${single ? "max-h-[28rem] object-contain" : "object-cover"}`}
              />
            )}
          </button>
        ))}
      </div>

      {viewing && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black" onClick={() => setViewing(null)}>
          <button
            className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-10 rounded-full bg-white/15 p-2 text-white"
            aria-label="關閉"
          >
            <Icon name="close" />
          </button>
          {viewing.type === "video" ? (
            <video
              src={viewing.url}
              controls
              autoPlay
              playsInline
              className="max-h-full w-full md:max-h-[90dvh] md:w-auto md:max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewing.url} alt="" className="max-h-full w-full object-contain md:max-h-[90dvh] md:w-auto md:max-w-[90vw]" />
          )}
        </div>
      )}
    </>
  );
}

/* ---------- 治療師回覆 ---------- */

function CommentThread({ comments, viewer }: { comments: CommentDTO[]; viewer: ViewerInfo }) {
  if (comments.length === 0) return null;
  return (
    <div className="mt-3 space-y-3 border-t border-line px-4 pt-3 pb-4">
      {comments.map((c) => (
        <CommentItem key={c.id} comment={c} viewer={viewer} />
      ))}
    </div>
  );
}

function CommentItem({ comment, viewer }: { comment: CommentDTO; viewer: ViewerInfo }) {
  const readRef = useReadMark("comment", comment.id, comment.unread);
  const [pending, startTransition] = useTransition();
  const canDelete = comment.author.id === viewer.id || can.moderate(viewer.role);

  const remove = () => {
    if (!confirm("確定要刪除這則回覆嗎？")) return;
    startTransition(async () => {
      const result = await deleteComment(comment.id);
      if (!result.ok) alert(result.error);
    });
  };

  return (
    <div ref={readRef} className={`flex gap-2.5 ${pending ? "opacity-50" : ""}`}>
      <Avatar name={comment.author.name} role={comment.author.role} size="sm" />
      <div className="min-w-0 flex-1">
        <div
          className={`rounded-2xl rounded-tl-sm px-3 py-2 ${comment.unread ? "bg-alert-soft" : "bg-brand-soft/60"}`}
        >
          <div className="mb-0.5 flex items-center gap-1.5 text-xs">
            <span className="font-medium">{comment.author.name}</span>
            <RoleBadge role={comment.author.role} />
            {comment.unread && <span className="ml-auto text-[11px] text-alert">新回覆</span>}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            <Linkify text={comment.text} />
          </p>
        </div>
        <div className="mt-1 flex items-center gap-3 pl-2 text-[11px] text-muted">
          {formatDateTime(comment.createdAt)}
          {canDelete && (
            <button onClick={remove} disabled={pending}>
              刪除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplyBox({ caseId, postId }: { caseId: string; postId: string }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  const send = () => {
    if (!text.trim()) return;
    startTransition(async () => {
      const result = await createComment({ caseId, postId, text });
      if (result.ok) setText("");
      else alert(result.error);
    });
  };

  return (
    <div className="flex items-end gap-2 border-t border-line px-3 py-2.5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="回覆…"
        rows={1}
        maxLength={3000}
        className="field-sizing-content max-h-40 min-h-10 flex-1 resize-none rounded-2xl bg-canvas px-3.5 py-2 text-[15px] outline-none"
      />
      <button
        onClick={send}
        disabled={pending || !text.trim()}
        className="mb-0.5 rounded-full bg-brand p-2.5 text-white disabled:opacity-40"
        aria-label="送出"
      >
        <Icon name="send" className="size-4.5" />
      </button>
    </div>
  );
}
