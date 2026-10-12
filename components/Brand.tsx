import Image from "next/image";

/** 頁首用的 Loomia 字標（由 public/logo.png 裁切、去背） */
export function Logo({ className = "h-7 w-auto" }: { className?: string }) {
  return <Image src="/brand/wordmark.png" alt="Loomia" width={979} height={259} priority className={className} />;
}

/** 三色細線：個案（青綠）・照顧者（珊瑚）・治療師（寶藍），對應 logo 的三股編織線 */
export function BrandStripe({ className = "h-1" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        background:
          "linear-gradient(90deg, var(--color-brand) 0 33.33%, var(--color-alert) 33.33% 66.66%, var(--color-indigo) 66.66% 100%)",
      }}
    />
  );
}

/* 三條相位相差 120° 的正弦線交織，呼應 logo 的編織意象 */
const WAVE_WIDTH = 1440;
const WAVE_HEIGHT = 240;
const WAVES = [
  { color: "var(--color-brand)", phase: 0 },
  { color: "var(--color-alert)", phase: (2 * Math.PI) / 3 },
  { color: "var(--color-indigo)", phase: (4 * Math.PI) / 3 },
].map(({ color, phase }) => {
  const points: string[] = [];
  for (let x = 0; x <= WAVE_WIDTH; x += 16) {
    const y = WAVE_HEIGHT / 2 + 70 * Math.sin((x / WAVE_WIDTH) * Math.PI * 4 + phase);
    points.push(`${x},${y.toFixed(1)}`);
  }
  return { color, d: `M${points.join(" L")}` };
});

export function BraidLines({ className = "", strokeWidth = 6 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${WAVE_WIDTH} ${WAVE_HEIGHT}`}
      preserveAspectRatio="none"
      className={className}
      fill="none"
      strokeLinecap="round"
    >
      {WAVES.map((w) => (
        <path key={w.color} d={w.d} stroke={w.color} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
