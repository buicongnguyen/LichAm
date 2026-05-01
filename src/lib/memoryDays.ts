import type { CalendarCell, CalendarKind, CountryCode, LunarDate, MemoryDay } from "../types";
import { addDays, daysBetween, parseISODate, toISODate } from "./date";
import { solarToLunar } from "./vietnameseLunar";

const STORAGE_KEY = "lich-am.memory-days.v1";
const NOTIFIED_KEY = "lich-am.notified-reminders.v1";

function getStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    getStorage()?.setItem(key, value);
  } catch {
    // Some in-app browsers temporarily block storage. The app should keep running.
  }
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const values = new Uint32Array(2);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    values[0] = Math.floor(Math.random() * 0xffffffff);
    values[1] = Math.floor(Math.random() * 0xffffffff);
  }

  return `${Date.now().toString(36)}-${values[0].toString(36)}-${values[1].toString(36)}`;
}

export function loadMemoryDays(): MemoryDay[] {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MemoryDay[]) : [];
  } catch {
    return [];
  }
}

export function saveMemoryDays(days: MemoryDay[]) {
  writeStorage(STORAGE_KEY, JSON.stringify(days));
}

export function createMemoryDay(input: {
  title: string;
  sourceDate: string;
  country: CountryCode;
  remindOnSolarDate: boolean;
  remindOnLunarDate: boolean;
  repeatYearly: boolean;
  remindWeekBefore: boolean;
  remindDayBefore: boolean;
}): MemoryDay {
  const date = parseISODate(input.sourceDate);
  const lunar = solarToLunar(date);
  const calendarKind: CalendarKind = input.remindOnLunarDate && !input.remindOnSolarDate ? "lunar" : "solar";

  return {
    id: createId(),
    title: input.title.trim(),
    sourceDate: input.sourceDate,
    calendarKind,
    country: input.country,
    remindOnSolarDate: input.remindOnSolarDate,
    remindOnLunarDate: input.remindOnLunarDate,
    repeatYearly: input.repeatYearly,
    remindWeekBefore: input.remindWeekBefore,
    remindDayBefore: input.remindDayBefore,
    lunarDate: input.remindOnLunarDate ? lunar : undefined,
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

export function memoryUsesSolarDate(memory: MemoryDay) {
  return memory.remindOnSolarDate ?? memory.calendarKind === "solar";
}

export function memoryUsesLunarDate(memory: MemoryDay) {
  return memory.remindOnLunarDate ?? memory.calendarKind === "lunar";
}

export function memoryCalendarLabel(memory: MemoryDay) {
  const usesSolar = memoryUsesSolarDate(memory);
  const usesLunar = memoryUsesLunarDate(memory);

  if (usesSolar && usesLunar) {
    return "Dương + âm";
  }

  return usesLunar ? "Âm lịch" : "Dương lịch";
}

function solarMatches(memory: MemoryDay, cell: Pick<CalendarCell, "isoDate" | "date">) {
  if (memory.repeatYearly) {
    const source = parseISODate(memory.sourceDate);
    return source.getMonth() === cell.date.getMonth() && source.getDate() === cell.date.getDate();
  }

  return memory.sourceDate === cell.isoDate;
}

function lunarMatches(memory: MemoryDay, cell: Pick<CalendarCell, "lunar">) {
  const lunarDate = memory.lunarDate ?? solarToLunar(parseISODate(memory.sourceDate));
  return lunarEquals(lunarDate, cell.lunar, memory.repeatYearly);
}

export function memoryMatchesCell(memory: MemoryDay, cell: Pick<CalendarCell, "isoDate" | "date" | "lunar">) {
  if (memoryUsesSolarDate(memory) && solarMatches(memory, cell)) {
    return true;
  }

  if (memoryUsesLunarDate(memory) && lunarMatches(memory, cell)) {
    return true;
  }

  return false;
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
  const dueReminders: Array<{
    key: string;
    memory: MemoryDay;
    occurrence: Date;
    offset: number;
  }> = [];

  memories.forEach((memory) => {
    const occurrence = findNextOccurrence(memory, today);
    if (!occurrence) {
      return;
    }

    const gap = daysBetween(today, occurrence);
    getReminderOffsets(memory)
      .filter((offset) => offset === gap)
      .forEach((offset) => {
        dueReminders.push({
          key: `${memory.id}:${toISODate(occurrence)}:${offset}`,
          memory,
          occurrence,
          offset,
        });
      });
  });

  return dueReminders;
}

export function loadNotifiedKeys(): string[] {
  try {
    return JSON.parse(getStorage()?.getItem(NOTIFIED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function saveNotifiedKeys(keys: string[]) {
  writeStorage(NOTIFIED_KEY, JSON.stringify(keys.slice(-200)));
}
