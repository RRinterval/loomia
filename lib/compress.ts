// Client-side compression before uploading to Vercel Blob — saves storage and upload time.
// Any failure falls back to the original file so uploads never break.

const IMAGE_MAX_EDGE = 1600; // ≈ A4 at 150dpi
const IMAGE_QUALITY = 0.75;
const VIDEO_SHORT_EDGE = 480; // 480p
const VIDEO_BITRATE = 1_000_000;
const AUDIO_BITRATE = 96_000;

function renameExt(name: string, ext: string) {
  const base = name.replace(/\.[^.]+$/, "") || "file";
  return `${base}.${ext}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File, maxEdge = IMAGE_MAX_EDGE): Promise<File> {
  // GIF 會失去動畫、SVG 不是點陣圖，維持原檔
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // 瀏覽器無法解碼（例如部分 HEIC）
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#fff"; // 透明背景轉 JPEG 時不會變黑
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // 優先 WebP；不支援編碼 WebP 的瀏覽器（舊版 Safari）改用 JPEG
  let blob = await canvasToBlob(canvas, "image/webp", IMAGE_QUALITY);
  if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", IMAGE_QUALITY);
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], renameExt(file.name, blob.type === "image/webp" ? "webp" : "jpg"), { type: blob.type });
}

export async function compressVideo(file: File, onProgress?: (fraction: number) => void): Promise<File> {
  if (typeof VideoEncoder === "undefined") return file; // 瀏覽器不支援 WebCodecs

  try {
    const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output } = await import(
      "mediabunny"
    );
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });

    const conversion = await Conversion.init({
      input,
      output,
      video: (track) => {
        // 短邊縮到 480，原本就更小則維持尺寸只降低位元率
        const portrait = track.displayWidth <= track.displayHeight;
        const short = Math.min(track.displayWidth, track.displayHeight);
        const size = short > VIDEO_SHORT_EDGE ? (portrait ? { width: VIDEO_SHORT_EDGE } : { height: VIDEO_SHORT_EDGE }) : {};
        return { ...size, codec: "avc", bitrate: VIDEO_BITRATE };
      },
      audio: { bitrate: AUDIO_BITRATE },
      showWarnings: false,
    });
    if (!conversion.isValid) return file;

    conversion.onProgress = (progress) => onProgress?.(progress);
    await conversion.execute();

    const buffer = target.buffer;
    if (!buffer || buffer.byteLength >= file.size) return file;
    return new File([buffer], renameExt(file.name, "mp4"), { type: "video/mp4" });
  } catch (err) {
    console.warn("影片壓縮失敗，改上傳原檔", err);
    return file;
  }
}

/** 依檔案類型壓縮；onProgress 回報 0–1 */
export async function compressMedia(file: File, onProgress?: (fraction: number) => void): Promise<File> {
  if (file.type.startsWith("video/")) return compressVideo(file, onProgress);
  const result = await compressImage(file);
  onProgress?.(1);
  return result;
}

export const compressAvatar = (file: File) => compressImage(file, 512);
