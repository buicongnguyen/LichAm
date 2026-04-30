import type { CalendarCell, CountryCode, MemoryDay } from "../types";
import { addDays, toISODate } from "./date";
import { getHolidays } from "./holidays";
import { memoryMatchesCell } from "./memoryDays";
import { solarToLunar } from "./vietnameseLunar";

export function buildCalendarMonth(
  monthDate: Date,
  selectedCountry: CountryCode,
  memories: MemoryDay[],
  weekStartsOn = 1,
): CalendarCell[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const offset = (firstOfMonth.getDay() - weekStartsOn + 7) % 7;
  const gridStart = addDays(firstOfMonth, -offset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const isoDate = toISODate(date);
    const lunar = solarToLunar(date);
    const cellBase = {
      date,
      isoDate,
      lunar,
    };

    return {
      ...cellBase,
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
      holidays: getHolidays(date, lunar, selectedCountry),
      memories: memories.filter((memory) => memoryMatchesCell(memory, cellBase)),
    };
  });
}
