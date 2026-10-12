"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ROLE_LABELS, type Role } from "@/lib/roles";

/** 由下往上滑出的面板（手機常見的 bottom sheet） */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  // 掛到 <body>，避免被 sticky 側欄等父層的堆疊層級困住而被內容蓋過
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/35" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[88dvh] w-full animate-sheet-up flex-col rounded-t-3xl bg-surface pb-[env(safe-area-inset-bottom)] md:max-h-[85dvh] md:max-w-lg md:animate-pop md:rounded-3xl md:pb-0 md:shadow-xl"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="關閉" className="-mr-2 p-2 text-muted">
            <Icon name="close" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

const AVATAR_COLORS: Record<Role, string> = {
  // 與 logo 圖例一致：個案＝青綠、照顧者＝珊瑚、治療師＝寶藍
  patient: "bg-brand-soft text-brand",
  caregiver: "bg-alert-soft text-alert",
  therapist: "bg-indigo-soft text-indigo",
  family: "bg-[#eee9f6] text-[#6c58a6]",
  admin: "bg-ink text-white",
};

export function Avatar({ name, role, size = "md" }: { name: string; role: Role; size?: "sm" | "md" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${AVATAR_COLORS[role]} ${
        size === "sm" ? "size-7 text-xs" : "size-10 text-sm"
      }`}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${AVATAR_COLORS[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-surface px-6 py-10 text-center text-sm text-muted">{children}</p>;
}

const ICONS = {
  close: "M6 6l12 12M18 6L6 18",
  journal: "M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h3",
  question: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01",
  task: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM8 12l3 3 5-6",
  reply: "M4 5h16v11H9l-5 4zM8 10h8",
  photo: "M4 6h16v12H4zM4 15l4-4 4 4 3-3 5 5M15 9.5h.01",
  send: "M4 12l16-8-6 16-3-7z",
  trash: "M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  plus: "M12 5v14M5 12h14",
  box: "M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  menu: "M4 7h16M4 12h16M4 17h16",
  check: "M5 12l5 5L20 7",
  play: "M8 5v14l11-7z",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}
