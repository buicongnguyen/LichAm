import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CalendarPlus,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { LotusFrame } from "./components/LotusFrame";
import { MoonPhaseIcon } from "./components/MoonPhaseIcon";
import type { CalendarCell, CountryCode, MemoryDay } from "./types";
import { buildCalendarMonth } from "./lib/calendar";
import { addDays, parseISODate, toISODate } from "./lib/date";
import { countryNames } from "./lib/holidays";
import { getMoonPhase } from "./lib/moonPhase";
import {
  createMemoryDay,
  findNextOccurrence,
  loadMemoryDays,
  memoryCalendarLabel,
  saveMemoryDays,
} from "./lib/memoryDays";
import { createGoogleCalendarUrl, downloadCalendarFile, shareOrDownloadCalendarFile } from "./lib/ics";
import {
  getDayCanChi,
  getGoodHours,
  getHourCanChi,
  getMonthCanChi,
  getSolarTerm,
  getYearCanChi,
  lunarMonthName,
} from "./lib/lunarTime";
import { solarToLunar } from "./lib/vietnameseLunar";

const today = new Date();
const todayIso = toISODate(today);
const vietnameseWeekdays = ["2", "3", "4", "5", "6", "7", "CN"];
const vietnameseMonthFormatter = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" });
const vietnameseShortMonthFormatter = new Intl.DateTimeFormat("vi-VN", { month: "short" });
const vietnameseWeekdayFormatter = new Intl.DateTimeFormat("vi-VN", { weekday: "long" });

type ViewMode = "day" | "month" | "year";

type MemoryFormState = {
  title: string;
  sourceDate: string;
  country: CountryCode;
  remindOnSolarDate: boolean;
  remindOnLunarDate: boolean;
  repeatYearly: boolean;
  remindWeekBefore: boolean;
  remindDayBefore: boolean;
};

function createInitialForm(selectedDate: string, country: CountryCode): MemoryFormState {
  return {
    title: "",
    sourceDate: selectedDate,
    country,
    remindOnSolarDate: true,
    remindOnLunarDate: true,
    repeatYearly: true,
    remindWeekBefore: true,
    remindDayBefore: true,
  };
}

function lunarText(cell: Pick<CalendarCell, "lunar">) {
  const leap = cell.lunar.isLeap ? "L " : "";
  return `${leap}${cell.lunar.day}/${cell.lunar.month}`;
}

function miniLunarText(cell: Pick<CalendarCell, "lunar">) {
  return cell.lunar.day === 1 ? `1/${cell.lunar.month}` : String(cell.lunar.day);
}

function normalizeMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarExportItems(memoryDays: MemoryDay[]) {
  const startDate = new Date();
  const endDate = new Date(startDate.getFullYear() + 5, startDate.getMonth(), startDate.getDate());
  const exportItems: Array<{ memory: MemoryDay; occurrence: Date }> = [];

  memoryDays.forEach((memory) => {
    let searchFrom = startDate;

    for (let index = 0; index < 12; index += 1) {
      const occurrence = findNextOccurrence(memory, searchFrom, 430);
      if (!occurrence || occurrence > endDate) {
        break;
      }

      exportItems.push({ memory, occurrence });
      if (!memory.repeatYearly) {
        break;
      }

      searchFrom = addDays(occurrence, 1);
    }
  });

  return exportItems.sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime());
}

function App() {
  const [country, setCountry] = useState<CountryCode>("VN");
  const [monthDate, setMonthDate] = useState(() => normalizeMonth(today));
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [memoryDays, setMemoryDays] = useState<MemoryDay[]>(() => loadMemoryDays());
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [form, setForm] = useState<MemoryFormState>(() => createInitialForm(todayIso, "VN"));
  const [viewMode, setViewMode] = useState<ViewMode>("day");

  useEffect(() => {
    saveMemoryDays(memoryDays);
  }, [memoryDays]);

  const cells = useMemo(() => buildCalendarMonth(monthDate, country, memoryDays), [monthDate, country, memoryDays]);
  const selectedCell = cells.find((cell) => cell.isoDate === selectedDate);
  const selectedIndex = cells.findIndex((cell) => cell.isoDate === selectedDate);
  const selectedWeekIndex = selectedIndex >= 0 ? Math.floor(selectedIndex / 7) : -1;
  const selectedDateObject = parseISODate(selectedDate);
  const selectedDayOfWeek = selectedDateObject.getDay();
  const isSelectedWeekend = selectedDayOfWeek === 0 || selectedDayOfWeek === 6;
  const selectedWeekdayName = vietnameseWeekdayFormatter.format(selectedDateObject);
  const selectedLunar = solarToLunar(selectedDateObject);
  const selectedDayCanChi = getDayCanChi(selectedDateObject);
  const selectedHourForCanChi = selectedDate === todayIso ? new Date().getHours() : 0;
  const selectedHourCanChi = getHourCanChi(selectedDayCanChi.stemIndex, selectedHourForCanChi);
  const selectedGoodHours = getGoodHours(selectedDayCanChi.branchIndex);
  const selectedSolarTerm = getSolarTerm(selectedDateObject);
  const selectedYearCanChi = getYearCanChi(selectedLunar.year);
  const selectedMonthCanChi = getMonthCanChi(selectedLunar);
  const selectedDayNames = [
    selectedLunar.day === 1 ? "Mùng 1 âm lịch" : null,
    selectedLunar.day === 15 ? "Rằm" : null,
    ...(selectedCell?.holidays.map((holiday) => holiday.label) ?? []),
    ...(selectedCell?.memories.map((memory) => memory.title) ?? []),
  ].filter((name): name is string => Boolean(name));
  const yearMonths = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => {
        const date = new Date(monthDate.getFullYear(), month, 1);
        return {
          date,
          cells: buildCalendarMonth(date, country, memoryDays),
        };
      }),
    [country, memoryDays, monthDate],
  );

  const allUpcomingMemories = useMemo(
    () =>
      memoryDays
        .map((memory) => ({
          memory,
          occurrence: findNextOccurrence(memory, new Date()),
        }))
        .filter((item): item is { memory: MemoryDay; occurrence: Date } => Boolean(item.occurrence))
        .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime()),
    [memoryDays],
  );
  const upcomingMemories = allUpcomingMemories.slice(0, 6);
  const calendarExportItems = useMemo(() => buildCalendarExportItems(memoryDays), [memoryDays]);

  function changeMonth(offset: number) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function changeYear(offset: number) {
    setMonthDate((current) => new Date(current.getFullYear() + offset, current.getMonth(), 1));
  }

  function selectDate(date: Date) {
    setSelectedDate(toISODate(date));
    setMonthDate(normalizeMonth(date));
  }

  function changeDay(offset: number) {
    selectDate(addDays(selectedDateObject, offset));
  }

  function jumpToToday() {
    selectDate(today);
  }

  function openMemoryForm(date = selectedDate) {
    setForm(createInitialForm(date, country));
    setIsAddingMemory(true);
  }

  function submitMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || (!form.remindOnSolarDate && !form.remindOnLunarDate)) {
      return;
    }

    setMemoryDays((current) => [createMemoryDay(form), ...current]);
    setIsAddingMemory(false);
  }

  function deleteMemory(id: string) {
    setMemoryDays((current) => current.filter((memory) => memory.id !== id));
  }

  function setMemoryDateMode(mode: "solar" | "lunar", checked: boolean) {
    setForm((current) => {
      if (mode === "solar") {
        return {
          ...current,
          remindOnSolarDate: checked || !current.remindOnLunarDate,
        };
      }

      return {
        ...current,
        remindOnLunarDate: checked || !current.remindOnSolarDate,
      };
    });
  }

  function onSelectCell(cell: CalendarCell) {
    setSelectedDate(cell.isoDate);
    if (!cell.inCurrentMonth) {
      setMonthDate(normalizeMonth(cell.date));
    }
  }

  function onSelectYearCell(cell: CalendarCell) {
    setSelectedDate(cell.isoDate);
    setMonthDate(normalizeMonth(cell.date));
    setViewMode("day");
  }

  function saveMemoryDaysToPhoneCalendar() {
    if (calendarExportItems.length === 0) {
      return;
    }

    void shareOrDownloadCalendarFile(calendarExportItems);
  }

  function openNextMemoryInGoogleCalendar() {
    const nextMemory = allUpcomingMemories[0];
    if (!nextMemory) {
      return;
    }

    window.open(createGoogleCalendarUrl(nextMemory.memory, nextMemory.occurrence), "_blank", "noopener,noreferrer");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <CalendarDays aria-hidden="true" />
          <div>
            <h1>Lịch Âm</h1>
            <p>Lịch dương và lịch âm</p>
          </div>
        </div>

        <div className="top-actions">
          <button className="primary-action" type="button" onClick={() => openMemoryForm()} aria-label="Thêm ngày ghi nhớ">
            <Plus aria-hidden="true" />
            <span>Ngày ghi nhớ</span>
          </button>
          <div className="view-tabs" role="tablist" aria-label="Chế độ lịch">
            <button
              className={viewMode === "day" ? "view-tab-button active" : "view-tab-button"}
              type="button"
              onClick={() => setViewMode("day")}
            >
              <CalendarCheck aria-hidden="true" />
              <span>Ngày</span>
            </button>
            <button
              className={viewMode === "month" ? "view-tab-button active" : "view-tab-button"}
              type="button"
              onClick={() => setViewMode("month")}
            >
              <CalendarDays aria-hidden="true" />
              <span>Tháng</span>
            </button>
            <button
              className={viewMode === "year" ? "view-tab-button active" : "view-tab-button"}
              type="button"
              onClick={() => setViewMode("year")}
            >
              <CalendarRange aria-hidden="true" />
              <span>Năm</span>
            </button>
          </div>
        </div>
      </header>

      <section className={viewMode === "year" ? "workspace year-workspace" : "workspace"}>
        <div className="calendar-surface">
          <LotusFrame />
          {viewMode === "day" ? (
            <div className="daily-page">
              <div className="daily-hero">
                <div className="daily-toolbar">
                  <button className="icon-button" type="button" onClick={() => changeDay(-1)} aria-label="Ngày trước">
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <div className="daily-month-title">
                    <strong>{vietnameseMonthFormatter.format(selectedDateObject)}</strong>
                    <span>{selectedDate}</span>
                  </div>
                  <button className="icon-button" type="button" onClick={() => changeDay(1)} aria-label="Ngày sau">
                    <ChevronRight aria-hidden="true" />
                  </button>
                  <button className="today-button" type="button" onClick={jumpToToday}>
                    Hôm nay
                  </button>
                </div>

                <div className="daily-hero-content">
                  <strong className={isSelectedWeekend ? "daily-solar-number weekend" : "daily-solar-number"}>
                    {selectedDateObject.getDate()}
                  </strong>
                  <span className="daily-weekday">{selectedWeekdayName}</span>
                  <p>
                    {selectedDayNames.length > 0
                      ? selectedDayNames.join(" · ")
                      : `Âm lịch ${selectedLunar.day}/${selectedLunar.month}`}
                  </p>
                </div>
              </div>

              <div className="daily-good-hours">
                <strong>Giờ tốt:</strong>
                <span>{selectedGoodHours.map((hour) => hour.label).join(", ")}</span>
              </div>

              <div className="daily-lunar-board">
                <div className="daily-lunar-date">
                  <span>
                    Tháng {lunarMonthName(selectedLunar.month)}
                    {selectedLunar.isLeap ? " nhuận" : ""}
                  </span>
                  <strong>{selectedLunar.day}</strong>
                  <small>Năm {selectedYearCanChi}</small>
                </div>
                <div className="daily-lunar-meta">
                  <h2>Tháng {selectedMonthCanChi}</h2>
                  <p>Ngày {selectedDayCanChi.label}</p>
                  <p>Giờ {selectedHourCanChi}</p>
                  <p>Tiết {selectedSolarTerm.label}</p>
                </div>
              </div>
            </div>
          ) : viewMode === "month" ? (
            <>
              <div className="calendar-toolbar">
                <button className="icon-button" type="button" onClick={() => changeMonth(-1)} aria-label="Tháng trước">
                  <ChevronLeft aria-hidden="true" />
                </button>
                <div className="month-title">
                  <strong>{vietnameseMonthFormatter.format(monthDate)}</strong>
                  <span>
                    {selectedDate} · Âm lịch {selectedLunar.day}/{selectedLunar.month}
                  </span>
                </div>
                <button className="icon-button" type="button" onClick={() => changeMonth(1)} aria-label="Tháng sau">
                  <ChevronRight aria-hidden="true" />
                </button>
                <button className="today-button" type="button" onClick={jumpToToday}>
                  Hôm nay
                </button>
              </div>

              <div className="weekday-row">
                {vietnameseWeekdays.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="month-grid">
                {cells.map((cell, index) => {
                  const isToday = cell.isoDate === todayIso;
                  const isSelected = cell.isoDate === selectedDate;
                  const isSelectedWeek = Math.floor(index / 7) === selectedWeekIndex;
                  const hasHoliday = cell.holidays.length > 0;
                  const isSunday = cell.date.getDay() === 0;
                  const isSaturday = cell.date.getDay() === 6;
                  const moonPhase = getMoonPhase(cell.lunar.day);
                  const markers = [
                    ...cell.holidays,
                    ...cell.memories.map((memory) => ({ id: memory.id, label: memory.title })),
                  ];

                  return (
                    <button
                      key={cell.isoDate}
                      type="button"
                      className={[
                        "day-cell",
                        cell.inCurrentMonth ? "" : "muted-month",
                        isToday ? "today" : "",
                        isSelected ? "selected-day" : "",
                        isSelectedWeek ? "selected-week" : "",
                        hasHoliday ? "holiday-day" : "",
                        isSunday ? "sunday-day" : "",
                        isSaturday ? "saturday-day" : "",
                        moonPhase.isFull ? "full-moon-day" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => onSelectCell(cell)}
                    >
                      <span className="day-numbers">
                        <span className="solar-number">{cell.date.getDate()}</span>
                        <span className="lunar-number">
                          <MoonPhaseIcon country={country} phase={moonPhase} />
                          <span>{lunarText(cell)}</span>
                        </span>
                      </span>
                      <span className="lunar-boundary" aria-hidden="true" />
                      <span className="markers">
                        {markers.slice(0, 3).map((marker) => (
                          <span key={marker.id}>{marker.label}</span>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="year-board">
              <div className="calendar-toolbar year-toolbar">
                <button className="icon-button" type="button" onClick={() => changeYear(-1)} aria-label="Năm trước">
                  <ChevronLeft aria-hidden="true" />
                </button>
                <div className="month-title">
                  <strong>Năm {monthDate.getFullYear()}</strong>
                  <span>Bảng 12 tháng · dương/âm</span>
                </div>
                <button className="icon-button" type="button" onClick={() => changeYear(1)} aria-label="Năm sau">
                  <ChevronRight aria-hidden="true" />
                </button>
                <button className="today-button" type="button" onClick={jumpToToday}>
                  Hôm nay
                </button>
              </div>

              <div className="year-grid">
                {yearMonths.map((month) => (
                  <section className="mini-month" key={month.date.toISOString()}>
                    <h2>{vietnameseShortMonthFormatter.format(month.date)}</h2>
                    <div className="mini-weekdays">
                      {vietnameseWeekdays.map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    <div className="mini-month-grid">
                      {month.cells.map((cell) => {
                        const isToday = cell.isoDate === todayIso;
                        const isSelected = cell.isoDate === selectedDate;
                        const isSunday = cell.date.getDay() === 0;
                        const isSaturday = cell.date.getDay() === 6;
                        const hasHoliday = cell.holidays.length > 0;

                        return (
                          <button
                            key={cell.isoDate}
                            type="button"
                            className={[
                              "mini-day",
                              cell.inCurrentMonth ? "" : "mini-muted",
                              isToday ? "mini-today" : "",
                              isSelected ? "mini-selected" : "",
                              hasHoliday ? "mini-holiday" : "",
                              isSunday ? "mini-sunday" : "",
                              isSaturday ? "mini-saturday" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => onSelectYearCell(cell)}
                          >
                            <span>{cell.date.getDate()}</span>
                            <small>{miniLunarText(cell)}</small>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="detail-panel">
          <div className="selected-summary">
            <div className="selected-date-line">
              <span>{selectedWeekdayName}</span>
              <small>{selectedDate}</small>
            </div>
            <strong>
              Âm lịch {selectedLunar.day}/{selectedLunar.month}/{selectedLunar.year}
              {selectedLunar.isLeap ? " nhuận" : ""}
            </strong>
            <div className="selected-day-names">
              {selectedDayNames.length > 0 ? (
                selectedDayNames.map((name, index) => (
                  <span className="selected-day-chip" key={`${name}-${index}`}>
                    {name}
                  </span>
                ))
              ) : (
                <span className="selected-day-empty">Không có ghi chú</span>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h2>Ngày ghi nhớ</h2>
            <div className="memory-list">
              {upcomingMemories.length === 0 ? <p className="empty-state">Chưa có ngày ghi nhớ.</p> : null}
              {upcomingMemories.map(({ memory, occurrence }) => (
                <div className="memory-row" key={memory.id}>
                  <div>
                    <strong>{memory.title}</strong>
                    <span>
                      {toISODate(occurrence)} · {memoryCalendarLabel(memory)}
                    </span>
                  </div>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => downloadCalendarFile(memory, occurrence)}
                      aria-label={`Lưu ${memory.title} vào lịch`}
                    >
                      <Download aria-hidden="true" />
                    </button>
                    <button
                      className="icon-button danger"
                      type="button"
                      onClick={() => deleteMemory(memory.id)}
                      aria-label={`Xóa ${memory.title}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <details className="settings-menu">
        <summary aria-label="Mở cài đặt">
          <Settings aria-hidden="true" />
        </summary>
        <div className="settings-panel">
          <label>
            Quốc gia / ngày lễ
            <select
              aria-label="Quốc gia ngày lễ"
              value={country}
              onChange={(event) => setCountry(event.target.value as CountryCode)}
            >
              {Object.entries(countryNames).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="settings-actions">
            <button
              className="settings-action-button"
              type="button"
              disabled={calendarExportItems.length === 0}
              onClick={saveMemoryDaysToPhoneCalendar}
            >
              <Download aria-hidden="true" />
              <span>Lưu lịch điện thoại</span>
            </button>
            <button
              className="settings-action-button"
              type="button"
              disabled={allUpcomingMemories.length === 0}
              onClick={openNextMemoryInGoogleCalendar}
            >
              <CalendarPlus aria-hidden="true" />
              <span>Google Calendar</span>
            </button>
          </div>
        </div>
      </details>

      {isAddingMemory ? (
        <div className="modal-backdrop" role="presentation">
          <form className="memory-modal" onSubmit={submitMemory}>
            <header>
              <h2>Ngày ghi nhớ</h2>
              <button className="icon-button" type="button" onClick={() => setIsAddingMemory(false)} aria-label="Đóng">
                ×
              </button>
            </header>

            <label>
              Tên ngày
              <input
                autoFocus
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Sinh nhật, giỗ, kỷ niệm..."
              />
            </label>

            <label>
              Ngày
              <input
                type="date"
                value={form.sourceDate}
                onChange={(event) => setForm((current) => ({ ...current, sourceDate: event.target.value }))}
              />
            </label>

            <label>
              Quốc gia
              <select
                value={form.country}
                onChange={(event) => setForm((current) => ({ ...current, country: event.target.value as CountryCode }))}
              >
                {Object.entries(countryNames).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="check-grid">
              <label>
                <input
                  type="checkbox"
                  checked={form.remindOnSolarDate}
                  onChange={(event) => setMemoryDateMode("solar", event.target.checked)}
                />
                Nhắc ngày dương
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.remindOnLunarDate}
                  onChange={(event) => setMemoryDateMode("lunar", event.target.checked)}
                />
                Nhắc ngày âm
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.repeatYearly}
                  onChange={(event) => setForm((current) => ({ ...current, repeatYearly: event.target.checked }))}
                />
                Lặp lại hằng năm
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.remindWeekBefore}
                  onChange={(event) => setForm((current) => ({ ...current, remindWeekBefore: event.target.checked }))}
                />
                Trước 1 tuần
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.remindDayBefore}
                  onChange={(event) => setForm((current) => ({ ...current, remindDayBefore: event.target.checked }))}
                />
                Trước 1 ngày
              </label>
            </div>

            <footer>
              <button type="button" className="today-button" onClick={() => setIsAddingMemory(false)}>
                Hủy
              </button>
              <button type="submit" className="primary-action">
                <Plus aria-hidden="true" />
                <span>Lưu</span>
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </main>
  );
}

export default App;
