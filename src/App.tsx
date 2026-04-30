import { FormEvent, useEffect, useMemo, useState } from "react";
import {
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
import type { CalendarCell, CalendarKind, CountryCode, MemoryDay } from "./types";
import { buildCalendarMonth } from "./lib/calendar";
import { parseISODate, toISODate } from "./lib/date";
import { countryNames } from "./lib/holidays";
import { getMoonPhase } from "./lib/moonPhase";
import {
  createMemoryDay,
  findNextOccurrence,
  loadMemoryDays,
  saveMemoryDays,
} from "./lib/memoryDays";
import { downloadCalendarFile } from "./lib/ics";
import { solarToLunar } from "./lib/vietnameseLunar";

const today = new Date();
const todayIso = toISODate(today);
const vietnameseWeekdays = ["2", "3", "4", "5", "6", "7", "CN"];
const vietnameseMonthFormatter = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" });
const vietnameseShortMonthFormatter = new Intl.DateTimeFormat("vi-VN", { month: "short" });
const vietnameseWeekdayFormatter = new Intl.DateTimeFormat("vi-VN", { weekday: "long" });

type ViewMode = "month" | "year";

type MemoryFormState = {
  title: string;
  sourceDate: string;
  calendarKind: CalendarKind;
  country: CountryCode;
  repeatYearly: boolean;
  remindWeekBefore: boolean;
  remindDayBefore: boolean;
};

function createInitialForm(selectedDate: string, country: CountryCode): MemoryFormState {
  return {
    title: "",
    sourceDate: selectedDate,
    calendarKind: "solar",
    country,
    repeatYearly: true,
    remindWeekBefore: true,
    remindDayBefore: true,
  };
}

function lunarText(cell: Pick<CalendarCell, "lunar">) {
  const leap = cell.lunar.isLeap ? "L " : "";
  return `${leap}${cell.lunar.day}/${cell.lunar.month}`;
}

function normalizeMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function calendarKindLabel(kind: CalendarKind) {
  return kind === "lunar" ? "Âm lịch" : "Dương lịch";
}

function App() {
  const [country, setCountry] = useState<CountryCode>("VN");
  const [monthDate, setMonthDate] = useState(() => normalizeMonth(today));
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [memoryDays, setMemoryDays] = useState<MemoryDay[]>(() => loadMemoryDays());
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [form, setForm] = useState<MemoryFormState>(() => createInitialForm(todayIso, "VN"));
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  useEffect(() => {
    saveMemoryDays(memoryDays);
  }, [memoryDays]);

  const cells = useMemo(() => buildCalendarMonth(monthDate, country, memoryDays), [monthDate, country, memoryDays]);
  const selectedCell = cells.find((cell) => cell.isoDate === selectedDate);
  const selectedIndex = cells.findIndex((cell) => cell.isoDate === selectedDate);
  const selectedWeekIndex = selectedIndex >= 0 ? Math.floor(selectedIndex / 7) : -1;
  const selectedDateObject = parseISODate(selectedDate);
  const selectedWeekdayName = vietnameseWeekdayFormatter.format(selectedDateObject);
  const selectedLunar = solarToLunar(selectedDateObject);
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

  const upcomingMemories = useMemo(
    () =>
      memoryDays
        .map((memory) => ({
          memory,
          occurrence: findNextOccurrence(memory, new Date()),
        }))
        .filter((item): item is { memory: MemoryDay; occurrence: Date } => Boolean(item.occurrence))
        .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime())
        .slice(0, 6),
    [memoryDays],
  );

  function changeMonth(offset: number) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function changeYear(offset: number) {
    setMonthDate((current) => new Date(current.getFullYear() + offset, current.getMonth(), 1));
  }

  function jumpToToday() {
    setSelectedDate(todayIso);
    setMonthDate(normalizeMonth(today));
  }

  function openMemoryForm(date = selectedDate) {
    setForm(createInitialForm(date, country));
    setIsAddingMemory(true);
  }

  function submitMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      return;
    }

    setMemoryDays((current) => [createMemoryDay(form), ...current]);
    setIsAddingMemory(false);
  }

  function deleteMemory(id: string) {
    setMemoryDays((current) => current.filter((memory) => memory.id !== id));
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
    setViewMode("month");
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
          <button
            className="view-switch-button"
            type="button"
            aria-label={viewMode === "month" ? "Mở bảng năm" : "Trở về lịch tháng"}
            onClick={() => setViewMode((current) => (current === "month" ? "year" : "month"))}
          >
            <CalendarRange aria-hidden="true" />
            <span>{viewMode === "month" ? "Bảng năm" : "Tháng"}</span>
          </button>
        </div>
      </header>

      <section className={viewMode === "year" ? "workspace year-workspace" : "workspace"}>
        <div className="calendar-surface">
          <LotusFrame />
          {viewMode === "month" ? (
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

                        return (
                          <button
                            key={cell.isoDate}
                            type="button"
                            className={[
                              "mini-day",
                              cell.inCurrentMonth ? "" : "mini-muted",
                              isToday ? "mini-today" : "",
                              isSelected ? "mini-selected" : "",
                              isSunday ? "mini-sunday" : "",
                              isSaturday ? "mini-saturday" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => onSelectYearCell(cell)}
                          >
                            <span>{cell.date.getDate()}</span>
                            <small>{cell.lunar.day}</small>
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
                      {toISODate(occurrence)} · {calendarKindLabel(memory.calendarKind)}
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

            <div className="two-column">
              <label>
                Loại lịch
                <select
                  value={form.calendarKind}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, calendarKind: event.target.value as CalendarKind }))
                  }
                >
                  <option value="solar">Dương lịch</option>
                  <option value="lunar">Âm lịch</option>
                </select>
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
            </div>

            <div className="check-grid">
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
