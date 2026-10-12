// Date keys are "YYYY-MM-DD" in Taiwan time so server and client agree on what "today" is.
export const TIME_ZONE = "Asia/Taipei";

const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toDateKey(date: Date | string | number) {
  return keyFormatter.format(new Date(date));
}

export function todayKey() {
  return toDateKey(Date.now());
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Calendar arithmetic on date keys, done in UTC so DST never shifts a day. */
export function keyToUtc(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function utcToKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: string, days: number) {
  const d = keyToUtc(key);
  d.setUTCDate(d.getUTCDate() + days);
  return utcToKey(d);
}

export function weekdayOf(key: string) {
  return keyToUtc(key).getUTCDay();
}

export function formatKey(key: string) {
  const [, m, d] = key.split("-").map(Number);
  return `${m}月${d}日`;
}

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "10/12 16:34" — assembled from parts so server (Node ICU) and browser render identical text. */
export function formatDateTime(iso: string) {
  const parts = Object.fromEntries(
    timeFormatter.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}
