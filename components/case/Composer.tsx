"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { createPost } from "@/app/actions/posts";
import { compressMedia } from "@/lib/compress";
import { todayKey } from "@/lib/dates";
import type { MediaDTO } from "@/lib/types";
import { Avatar, Icon, Sheet } from "../ui";
import type { ViewerInfo } from "./CaseApp";

const MAX_FILES = 10;
const MULTIPART_THRESHOLD = 20 * 1024 * 1024;

type Picked = { file: File; preview: string; progress: number };

const COPY = {
  journal: { prompt: "分享今天的狀況…", title: "寫日誌", placeholder: "今天發生了什麼？有什麼進步或困難？", submit: "發布日誌" },
  question: { prompt: "想問治療師什麼呢？", title: "提出問題", placeholder: "描述你的問題，可以附上照片或影片幫助說明", submit: "送出問題" },
};

export function Composer({
  caseId,
  kind,
  viewer,
  defaultDate,
}: {
  caseId: string;
  kind: "journal" | "question";
  viewer: ViewerInfo;
  defaultDate: string | null;
}) {
  const copy = COPY[kind];
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [date, setDate] = useState(defaultDate ?? todayKey());
  const [files, setFiles] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("送出中…");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const openComposer = () => {
    setDate(defaultDate ?? todayKey());
    setError("");
    setOpen(true);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = [...list]
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .slice(0, MAX_FILES - files.length)
      .map((file) => ({ file, preview: URL.createObjectURL(file), progress: 0 }));
    setFiles((prev) => [...prev, ...picked]);
    if (fileInput.current) fileInput.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const submit = async () => {
    if (!text.trim() && files.length === 0) {
      setError("請輸入內容或加入照片／影片");
      return;
    }
    setBusy(true);
    setStage("送出中…");
    setError("");
    try {
      const setProgress = (index: number, progress: number) =>
        setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, progress } : f)));

      // 先在瀏覽器壓縮（照片長邊 1600px、影片 480p），再直接上傳到 Vercel Blob，
      // 最後把連結交給伺服器存進 MongoDB。壓縮逐一進行避免同時編碼多支影片，上傳則平行進行。
      // 進度條：前半段是壓縮，後半段是上傳。
      const uploads: Promise<MediaDTO>[] = [];
      for (const [index, { file: original }] of files.entries()) {
        setStage("壓縮中…");
        const file = await compressMedia(original, (fraction) => setProgress(index, fraction * 50));
        setStage("上傳中…");
        const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-80) || "file";
        uploads.push(
          upload(`cases/${caseId}/${kind}/${safeName}`, file, {
            access: "public",
            handleUploadUrl: "/api/upload",
            clientPayload: JSON.stringify({ caseId }),
            multipart: file.size > MULTIPART_THRESHOLD,
            onUploadProgress: ({ percentage }) => setProgress(index, 50 + percentage / 2),
          }).then((blob) => ({
            url: blob.url,
            pathname: blob.pathname,
            contentType: blob.contentType || file.type,
            type: file.type.startsWith("video/") ? "video" : "image",
          })),
        );
      }
      const media = await Promise.all(uploads);

      const result = await createPost({ caseId, kind, text, date, media });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);
      setText("");
      setOpen(false);
    } catch (err) {
      console.error(err);
      setError("上傳失敗，請檢查網路後再試一次");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={openComposer}
        className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left shadow-sm"
      >
        <Avatar name={viewer.name} role={viewer.role} />
        <span className="flex-1 rounded-full bg-canvas px-4 py-2.5 text-sm text-muted">{copy.prompt}</span>
        <Icon name="photo" className="size-6 text-brand" />
      </button>

      <Sheet open={open} onClose={() => !busy && setOpen(false)} title={copy.title}>
        <div className="space-y-3">
          <label className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-sm">
            <span className="text-muted">{kind === "journal" ? "日誌日期" : "提問日期"}</span>
            <input
              type="date"
              value={date}
              max={todayKey()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="bg-transparent text-right font-medium text-brand outline-none"
            />
          </label>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={copy.placeholder}
            rows={6}
            maxLength={5000}
            className="w-full resize-none rounded-xl border border-line p-3 text-base outline-none focus:border-brand"
          />

          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {files.map((f, i) => (
                <div key={f.preview} className="relative aspect-square overflow-hidden rounded-xl bg-canvas">
                  {f.file.type.startsWith("video/") ? (
                    <video src={f.preview} className="size-full object-cover" muted playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.preview} alt="" className="size-full object-cover" />
                  )}
                  {busy ? (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
                      <span className="block h-full bg-brand" style={{ width: `${f.progress}%` }} />
                    </span>
                  ) : (
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 rounded-full bg-black/55 p-1 text-white"
                      aria-label="移除"
                    >
                      <Icon name="close" className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />

          {error && <p className="text-sm text-alert">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => fileInput.current?.click()}
              disabled={busy || files.length >= MAX_FILES}
              className="flex items-center gap-1.5 rounded-xl bg-canvas px-4 py-3 text-sm text-brand disabled:opacity-50"
            >
              <Icon name="photo" />
              照片／影片
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="flex-1 rounded-xl bg-brand py-3 font-medium text-white active:bg-brand-dark disabled:opacity-60"
            >
              {busy ? stage : copy.submit}
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
