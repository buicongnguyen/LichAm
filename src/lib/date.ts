export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function toISODate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysBetween(start: Date, end: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return Math.round((b - a) / dayMs);
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function weekdayLabels(weekStartsOn = 1) {
  const base = new Date(2024, 0, 7 + weekStartsOn);
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(addDays(base, index)),
  );
}

export function yyyymmdd(date: Date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}
