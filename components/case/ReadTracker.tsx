"use client";

import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";
import { markRead } from "@/app/actions/posts";

type Kind = "post" | "comment";
type Register = (el: Element, kind: Kind, id: string) => () => void;

const ReadContext = createContext<Register | null>(null);

const FLUSH_DELAY_MS = 1200;

/** 未讀項目滑進畫面中段時，批次標記為已讀。 */
export function ReadTracker({ caseId, children }: { caseId: string; children: ReactNode }) {
  const observer = useRef<IntersectionObserver | null>(null);
  const targets = useRef(new Map<Element, { kind: Kind; id: string }>());
  const queue = useRef({ post: new Set<string>(), comment: new Set<string>() });
  const sent = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    timer.current = null;
    const postIds = [...queue.current.post];
    const commentIds = [...queue.current.comment];
    queue.current.post.clear();
    queue.current.comment.clear();
    if (postIds.length || commentIds.length) void markRead({ caseId, postIds, commentIds });
  }, [caseId]);

  const register = useCallback<Register>(
    (el, kind, id) => {
      observer.current ??= new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const target = targets.current.get(entry.target);
            if (!entry.isIntersecting || !target) continue;
            const key = `${target.kind}:${target.id}`;
            if (sent.current.has(key)) continue;
            sent.current.add(key);
            queue.current[target.kind].add(target.id);
            timer.current ??= setTimeout(flush, FLUSH_DELAY_MS);
          }
        },
        { rootMargin: "-30% 0px -30% 0px" },
      );
      targets.current.set(el, { kind, id });
      observer.current.observe(el);
      return () => {
        targets.current.delete(el);
        observer.current?.unobserve(el);
      };
    },
    [flush],
  );

  return <ReadContext value={register}>{children}</ReadContext>;
}

/** 回傳 ref；只有未讀的項目才需要追蹤。 */
export function useReadMark(kind: Kind, id: string, unread: boolean) {
  const register = useContext(ReadContext);
  return useCallback(
    (el: Element | null) => {
      if (!el || !unread || !register) return;
      return register(el, kind, id);
    },
    [register, kind, id, unread],
  );
}
