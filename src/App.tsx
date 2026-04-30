import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { MoonPhaseIcon } from "./components/MoonPhaseIcon";
import type { CalendarCell, CalendarKind, CountryCode, MemoryDay } from "./types";
import { buildCalendarMonth } from "./lib/calendar";
import { monthLabel, parseISODate, toISODate, weekdayLabels } from "./lib/date";
import { countryNames } from "./lib/holidays";
import { getMoonPhase } from "./lib/moonPhase";
import {
  createMemoryDay,
  findNextOccurrence,
  getDueReminderKeys,
  loadMemoryDays,
  loadNotifiedKeys,
  saveMemoryDays,
  saveNotifiedKeys,
} from "./lib/memoryDays";
import { downloadCalendarFile } from "./lib/ics";
import { solarToLunar } from "./lib/vietnameseLunar";

const today = new Date();
const todayIso = toISODate(today);
const initialNotificationPermission = (): NotificationPermission =>
  "Notification" in window ? Notification.permission : "default";

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

function App() {
  const [country, setCountry] = useState<CountryCode>("VN");
  const [monthDate, setMonthDate] = useState(() => normalizeMonth(today));
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [memoryDays, setMemoryDays] = useState<MemoryDay[]>(() => loadMemoryDays());
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [form, setForm] = useState<MemoryFormState>(() => createInitialForm(todayIso, "VN"));
  const [notificationState, setNotificationState] = useState<NotificationPermission>(initialNotificationPermission);

  useEffect(() => {
    saveMemoryDays(memoryDays);
  }, [memoryDays]);

  useEffect(() => {
    if (notificationState !== "granted") {
      return;
    }

    const notified = new Set(loadNotifiedKeys());
    const due = getDueReminderKeys(memoryDays, new Date()).filter((item) => !notified.has(item.key));

    if (due.length === 0) {
      return;
    }

    navigator.serviceWorker?.ready
      .then((registration) => {
        due.forEach(({ memory, occurrence, offset, key }) => {
          registration.showNotification(memory.title, {
            body: `${offset} day${offset === 1 ? "" : "s"} before ${toISODate(occurrence)}`,
            tag: key,
          });
          notified.add(key);
        });
        saveNotifiedKeys([...notified]);
      })
      .catch(() => undefined);
  }, [memoryDays, notificationState]);

  const cells = useMemo(() => buildCalendarMonth(monthDate, country, memoryDays), [monthDate, country, memoryDays]);
  const selectedCell = cells.find((cell) => cell.isoDate === selectedDate);
  const selectedIndex = cells.findIndex((cell) => cell.isoDate === selectedDate);
  const selectedWeekIndex = selectedIndex >= 0 ? Math.floor(selectedIndex / 7) : -1;
  const selectedLunar = solarToLunar(parseISODate(selectedDate));
  const weekdayNames = useMemo(() => weekdayLabels(1), []);

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

  async function requestNotifications() {
    if (!("Notification" in window)) {
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationState(permission);
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <CalendarDays aria-hidden="true" />
          <div>
            <h1>Lich Am</h1>
            <p>Solar and lunar calendar</p>
          </div>
        </div>

        <div className="top-actions">
          <button className="primary-action" type="button" onClick={() => openMemoryForm()}>
            <Plus aria-hidden="true" />
            <span>Memory day</span>
          </button>
          <button className="icon-button" type="button" onClick={requestNotifications} aria-label="Enable reminders">
            <Bell aria-hidden="true" />
          </button>
          <details className="settings-menu">
            <summary aria-label="Open settings">
              <Settings aria-hidden="true" />
            </summary>
            <div className="settings-panel">
              <label>
                Country holidays
                <select
                  aria-label="Holiday country"
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
        </div>
      </header>

      <section className="workspace">
        <div className="calendar-surface">
          <div className="calendar-toolbar">
            <button className="icon-button" type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
              <ChevronLeft aria-hidden="true" />
            </button>
            <div className="month-title">
              <strong>{monthLabel(monthDate)}</strong>
              <span>
                {selectedDate} · Lunar {selectedLunar.day}/{selectedLunar.month}
              </span>
            </div>
            <button className="icon-button" type="button" onClick={() => changeMonth(1)} aria-label="Next month">
              <ChevronRight aria-hidden="true" />
            </button>
            <button className="today-button" type="button" onClick={jumpToToday}>
              Today
            </button>
          </div>

          <div className="weekday-row">
            {weekdayNames.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="month-grid">
            {cells.map((cell, index) => {
              const isToday = cell.isoDate === todayIso;
              const isSelected = cell.isoDate === selectedDate;
              const isSelectedWeek = Math.floor(index / 7) === selectedWeekIndex;
              const hasHoliday = cell.holidays.length > 0;
              const moonPhase = getMoonPhase(cell.lunar.day);
              const markers = [...cell.holidays, ...cell.memories.map((memory) => ({ id: memory.id, label: memory.title }))];

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
        </div>

        <aside className="detail-panel">
          <div className="selected-summary">
            <span>{selectedDate}</span>
            <strong>
              Lunar {selectedLunar.day}/{selectedLunar.month}/{selectedLunar.year}
              {selectedLunar.isLeap ? " leap" : ""}
            </strong>
          </div>

          <div className="detail-section">
            <h2>Selected day</h2>
            <div className="event-list">
              {selectedCell && selectedCell.holidays.length === 0 && selectedCell.memories.length === 0 ? (
                <p className="empty-state">No saved day.</p>
              ) : null}
              {selectedCell?.holidays.map((holiday) => (
                <div className="event-row holiday-row" key={holiday.id}>
                  <span>{holiday.label}</span>
                  <small>{countryNames[holiday.country]}</small>
                </div>
              ))}
              {selectedCell?.memories.map((memory) => (
                <div className="event-row" key={memory.id}>
                  <span>{memory.title}</span>
                  <small>{memory.calendarKind}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h2>Memory days</h2>
            <div className="memory-list">
              {upcomingMemories.length === 0 ? <p className="empty-state">No memory days yet.</p> : null}
              {upcomingMemories.map(({ memory, occurrence }) => (
                <div className="memory-row" key={memory.id}>
                  <div>
                    <strong>{memory.title}</strong>
                    <span>
                      {toISODate(occurrence)} · {memory.calendarKind}
                    </span>
                  </div>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => downloadCalendarFile(memory, occurrence)}
                      aria-label={`Save ${memory.title} to calendar`}
                    >
                      <Download aria-hidden="true" />
                    </button>
                    <button
                      className="icon-button danger"
                      type="button"
                      onClick={() => deleteMemory(memory.id)}
                      aria-label={`Delete ${memory.title}`}
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

      {isAddingMemory ? (
        <div className="modal-backdrop" role="presentation">
          <form className="memory-modal" onSubmit={submitMemory}>
            <header>
              <h2>Memory day</h2>
              <button className="icon-button" type="button" onClick={() => setIsAddingMemory(false)} aria-label="Close">
                ×
              </button>
            </header>

            <label>
              Name
              <input
                autoFocus
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Birthday, anniversary..."
              />
            </label>

            <label>
              Date
              <input
                type="date"
                value={form.sourceDate}
                onChange={(event) => setForm((current) => ({ ...current, sourceDate: event.target.value }))}
              />
            </label>

            <div className="two-column">
              <label>
                Calendar
                <select
                  value={form.calendarKind}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, calendarKind: event.target.value as CalendarKind }))
                  }
                >
                  <option value="solar">Solar</option>
                  <option value="lunar">Lunar</option>
                </select>
              </label>

              <label>
                Country
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
                Repeat yearly
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.remindWeekBefore}
                  onChange={(event) => setForm((current) => ({ ...current, remindWeekBefore: event.target.checked }))}
                />
                1 week before
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.remindDayBefore}
                  onChange={(event) => setForm((current) => ({ ...current, remindDayBefore: event.target.checked }))}
                />
                1 day before
              </label>
            </div>

            <footer>
              <button type="button" className="today-button" onClick={() => setIsAddingMemory(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-action">
                <Plus aria-hidden="true" />
                <span>Save</span>
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </main>
  );
}

export default App;
