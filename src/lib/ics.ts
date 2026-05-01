import type { MemoryDay } from "../types";
import { addDays, yyyymmdd } from "./date";

export type CalendarExportItem = {
  memory: MemoryDay;
  occurrence: Date;
};

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatUtcStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function createAlarms(memory: MemoryDay) {
  return [
    memory.remindWeekBefore ? "BEGIN:VALARM\r\nTRIGGER:-P7D\r\nACTION:DISPLAY\r\nDESCRIPTION:1 week reminder\r\nEND:VALARM" : null,
    memory.remindDayBefore ? "BEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:1 day reminder\r\nEND:VALARM" : null,
  ].filter(Boolean);
}

function createCalendarEvent({ memory, occurrence }: CalendarExportItem) {
  const alarms = [
    ...createAlarms(memory),
  ];
  const endDate = addDays(occurrence, 1);
  const calendarKind = memory.calendarKind === "lunar" ? "Âm lịch" : "Dương lịch";

  return [
    "BEGIN:VEVENT",
    `UID:${memory.id}-${yyyymmdd(occurrence)}@lich-am.local`,
    `DTSTAMP:${formatUtcStamp(new Date())}`,
    `DTSTART;VALUE=DATE:${yyyymmdd(occurrence)}`,
    `DTEND;VALUE=DATE:${yyyymmdd(endDate)}`,
    `SUMMARY:${escapeText(memory.title)}`,
    `DESCRIPTION:${escapeText(`Ngày ghi nhớ từ Lịch Âm (${calendarKind})`)}`,
    ...alarms,
    "END:VEVENT",
  ].join("\r\n");
}

export function createCalendarFeed(items: CalendarExportItem[]) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lich Am//Memory Day//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...items.map(createCalendarEvent),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function createCalendarFile(memory: MemoryDay, occurrence: Date) {
  return createCalendarFeed([{ memory, occurrence }]);
}

function downloadIcsFile(fileContent: string, filename: string) {
  const blob = new Blob([fileContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadCalendarFile(memory: MemoryDay, occurrence: Date) {
  const filename = `${memory.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "memory-day"}.ics`;
  downloadIcsFile(createCalendarFile(memory, occurrence), filename);
}

export async function shareOrDownloadCalendarFile(items: CalendarExportItem[], filename = "lich-am-ngay-ghi-nho.ics") {
  const fileContent = createCalendarFeed(items);
  const file = new File([fileContent], filename, { type: "text/calendar;charset=utf-8" });
  const webShareNavigator = navigator as unknown as {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  const canShareFile = Boolean(webShareNavigator.share && webShareNavigator.canShare?.({ files: [file] }));

  if (canShareFile) {
    try {
      await webShareNavigator.share?.({
        files: [file],
        title: "Lịch Âm",
        text: "Ngày ghi nhớ",
      });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  downloadIcsFile(fileContent, filename);
}

export function createGoogleCalendarUrl(memory: MemoryDay, occurrence: Date) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: memory.title,
    dates: `${yyyymmdd(occurrence)}/${yyyymmdd(addDays(occurrence, 1))}`,
    details: "Ngày ghi nhớ từ Lịch Âm. Kiểm tra hoặc thêm nhắc nhở trong Google Calendar nếu cần.",
    sf: "true",
    output: "xml",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
