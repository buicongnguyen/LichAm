import type { MemoryDay } from "../types";
import { yyyymmdd } from "./date";

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatUtcStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function createCalendarFile(memory: MemoryDay, occurrence: Date) {
  const alarms = [
    memory.remindWeekBefore ? "BEGIN:VALARM\r\nTRIGGER:-P7D\r\nACTION:DISPLAY\r\nDESCRIPTION:1 week reminder\r\nEND:VALARM" : null,
    memory.remindDayBefore ? "BEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:1 day reminder\r\nEND:VALARM" : null,
  ].filter(Boolean);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lich Am//Memory Day//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${memory.id}@lich-am.local`,
    `DTSTAMP:${formatUtcStamp(new Date())}`,
    `DTSTART;VALUE=DATE:${yyyymmdd(occurrence)}`,
    `SUMMARY:${escapeText(memory.title)}`,
    ...alarms,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadCalendarFile(memory: MemoryDay, occurrence: Date) {
  const file = createCalendarFile(memory, occurrence);
  const blob = new Blob([file], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${memory.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "memory-day"}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
