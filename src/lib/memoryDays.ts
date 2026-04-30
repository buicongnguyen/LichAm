import type { CalendarCell, CalendarKind, CountryCode, LunarDate, MemoryDay } from "../types";
import { addDays, daysBetween, parseISODate, toISODate } from "./date";
import { solarToLunar } from "./vietnameseLunar";

const STORAGE_KEY = "lich-am.memory-days.v1";
const NOTIFIED_KEY = "lich-am.notified-reminders.v1";

export function loadMemoryDays(): MemoryDay[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MemoryDay[]) : [];
  } catch {
    return [];
  }
}

export function saveMemoryDays(days: MemoryDay[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
}

export function createMemoryDay(input: {
  title: string;
  sourceDate: string;
  calendarKind: CalendarKind;
  country: CountryCode;
  repeatYearly: boolean;
  remindWeekBefore: boolean;
  remindDayBefore: boolean;
}): MemoryDay {
  const date = parseISODate(input.sourceDate);
  const lunar = solarToLunar(date);

  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    sourceDate: input.sourceDate,
    calendarKind: input.calendarKind,
    country: input.country,
    repeatYearly: input.repeatYearly,
    remindWeekBefore: input.remindWeekBefore,
    remindDayBefore: input.remindDayBefore,
    lunarDate: input.calendarKind === "lunar" ? lunar : undefined,
    createdAt: new Date().toISOString(),
  };
}

function lunarEquals(a: LunarDate, b: LunarDate, repeatYearly: boolean) {
  return (
    a.day === b.day &&
    a.month === b.month &&
    a.isLeap === b.isLeap &&
    (repeatYearly || a.year === b.year)
  );
}

export function memoryMatchesCell(memory: MemoryDay, cell: Pick<CalendarCell, "isoDate" | "date" | "lunar">) {
  if (memory.calendarKind === "solar") {
    if (memory.repeatYearly) {
      const source = parseISODate(memory.sourceDate);
      return source.getMonth() === cell.date.getMonth() && source.getDate() === cell.date.getDate();
    }

    return memory.sourceDate === cell.isoDate;
  }

  if (!memory.lunarDate) {
    return false;
  }

  return lunarEquals(memory.lunarDate, cell.lunar, memory.repeatYearly);
}

export function findNextOccurrence(memory: MemoryDay, fromDate: Date, searchDays = 430) {
  for (let offset = 0; offset <= searchDays; offset += 1) {
    const date = addDays(fromDate, offset);
    const cell = {
      date,
      isoDate: toISODate(date),
      lunar: solarToLunar(date),
    };

    if (memoryMatchesCell(memory, cell)) {
      return date;
    }
  }

  return null;
}

export function getReminderOffsets(memory: MemoryDay) {
  return [memory.remindWeekBefore ? 7 : null, memory.remindDayBefore ? 1 : null].filter(
    (value): value is number => value !== null,
  );
}

export function getDueReminderKeys(memories: MemoryDay[], today: Date) {
  return memories.flatMap((memory) => {
    const occurrence = findNextOccurrence(memory, today);
    if (!occurrence) {
      return [];
    }

    const gap = daysBetween(today, occurrence);
    return getReminderOffsets(memory)
      .filter((offset) => offset === gap)
      .map((offset) => ({
        key: `${memory.id}:${toISODate(occurrence)}:${offset}`,
        memory,
        occurrence,
        offset,
      }));
  });
}

export function loadNotifiedKeys(): string[] {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function saveNotifiedKeys(keys: string[]) {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(keys.slice(-200)));
}
