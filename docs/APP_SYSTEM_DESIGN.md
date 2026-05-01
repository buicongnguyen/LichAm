# Lich Am App System Design Architecture

## Purpose

Lich Am is a calendar app that shows the solar calendar and Vietnamese-style lunar calendar together. The current version is a web app that can also be installed as a Progressive Web App on supported mobile browsers.

The app focuses on:

- Monthly solar and lunar calendar display
- Compact 12-month year board
- Vietnamese default language and Vietnamese holiday/special-day support
- Country holiday selection
- User memory days
- Phone-calendar export by `.ics` file
- PWA install and offline-friendly loading

## Current Runtime

The current app is built as:

```text
React UI
  -> Calendar month/year builder
    -> Solar date utilities
    -> Vietnamese lunar conversion
    -> Holiday and special-day rules
    -> Memory-day matching
  -> Browser/PWA local storage
  -> ICS calendar export
  -> Service worker cache
```

It runs in:

- Normal browser tab
- Android browser
- Android installed PWA
- iOS browser/PWA with platform limitations
- In-app browsers such as Zalo, with extra caching and storage limitations

## Main Files

| Area | File | Responsibility |
| --- | --- | --- |
| Main UI | `src/App.tsx` | Month view, year board, settings, memory-day form, selected-day panel |
| Calendar build | `src/lib/calendar.ts` | Builds 42 calendar cells for each month |
| Date helpers | `src/lib/date.ts` | ISO dates, add days, formatting helpers |
| Lunar conversion | `src/lib/vietnameseLunar.ts` | Converts solar dates to lunar dates and lunar dates to solar dates |
| Holidays | `src/lib/holidays.ts` | Country holidays, Vietnamese lunar observances, solar season markers |
| Memory days | `src/lib/memoryDays.ts` | Save/load memory days, match them to calendar cells, compute next occurrence |
| Calendar export | `src/lib/ics.ts` | Creates `.ics` calendar files with alarm reminders |
| Moon icon | `src/components/MoonPhaseIcon.tsx` | Draws lunar moon phase icons |
| Lotus frame | `src/components/LotusFrame.tsx` | Decorative Vietnamese-style calendar frame |
| Styles | `src/styles.css` | Responsive layout and visual styling |
| PWA manifest | `public/manifest.webmanifest` | App name, icon, install metadata |
| Service worker | `public/sw.js` | App cache, offline fallback, cache version updates |
| Deployment | `.github/workflows/deploy.yml` | Builds and deploys GitHub Pages on push to `main` |

## Data Flow

### Calendar display

```text
User opens app
  -> App chooses current month and selected country
  -> buildCalendarMonth()
    -> Creates each solar date cell
    -> Converts solar date to lunar date
    -> Finds holidays/special days
    -> Finds matching memory days
  -> React renders month or year board
```

### Selected day display

```text
User taps a day
  -> selectedDate changes
  -> App finds selected calendar cell
  -> Detail panel shows:
       weekday name
       solar date
       lunar date
       full moon / first lunar day labels
       holiday labels
       memory-day names
```

### Memory day save

```text
User creates memory day
  -> App stores title, date type, selected date, country, repeat settings
  -> If lunar memory day, app stores lunar day/month/year/isLeap
  -> Data is saved to browser local storage
  -> Calendar cells recalculate and show the memory day
```

### Phone calendar export

```text
User taps save/export icon
  -> App creates .ics file
  -> File includes event date and optional reminders:
       7 days before
       1 day before
  -> User imports the file into Android Calendar, Google Calendar, or iPhone Calendar
```

## Current Features

The current app can:

- Show solar and lunar date numbers in each calendar cell
- Show the selected week with a different background
- Bold the current day
- Show lunar date with a boundary and moon icon
- Show one full moon per lunar month
- Highlight Saturday and Sunday
- Highlight holiday dates
- Show Vietnamese lunar observances such as Vu Lan and Trung thu
- Show season markers such as Lập xuân, Xuân phân, Hạ chí, and Đông chí
- Save user memory days locally
- Repeat memory days yearly by solar or lunar date
- Export memory days as `.ics` events with reminders
- Install as a PWA on supported Android browsers
- Deploy automatically to GitHub Pages

## Current Limitations

The current web/PWA app cannot directly:

- Write to the native Android Calendar database
- Write to the native iPhone Calendar database
- Read the user's native phone calendar database
- Schedule fully reliable native local notifications while the app is closed
- Guarantee background alarm behavior in all browsers
- Keep memory days if the browser clears site storage
- Sync memory days between phones

The installed PWA looks like an app, but it still runs inside the browser engine. It is not the same as a native Android or iOS app.

## Current Persistence

Memory days are currently stored in browser local storage.

Benefits:

- Simple
- Works offline
- No server needed
- Good enough for early testing

Weaknesses:

- Can be cleared by the browser
- Can behave differently in in-app browsers
- Not ideal for larger structured data
- Not shared across devices
- Not a native phone database

Recommended web improvement:

- Move from `localStorage` to IndexedDB
- Add export/import backup
- Keep `.ics` export for reliable native calendar reminders

## Current Reminder Behavior

The app currently supports reminder intent in two ways:

1. It stores reminder preferences on each memory day.
2. It exports `.ics` files with 7-day and 1-day alarm entries.

The phone's native calendar app can handle the alarm only after the user imports the `.ics` file.

The PWA itself does not yet schedule native notifications in the background.

## Compatibility Notes

Recent app changes improved in-app browser behavior:

- The service worker now uses a network-first strategy for the app shell.
- The service worker only caches successful responses.
- The app asks the service worker to update after registration.
- Storage writes are guarded so restricted WebViews do not crash the app.
- The build target is friendlier to older WebView engines.

## Future Architecture Direction

To support real mobile apps, the app should introduce two platform interfaces:

```text
MemoryRepository
  -> Web implementation: IndexedDB
  -> Native implementation: SQLite

ReminderScheduler
  -> Web implementation: ICS export or optional Web Push
  -> Native implementation: Android/iOS local notifications
```

The current calendar and lunar logic should stay shared. The platform-specific work should live behind storage and notification adapters.

## Reference Links

- Capacitor: https://capacitorjs.com/docs
- Capacitor Local Notifications: https://capacitorjs.com/docs/apis/local-notifications
- Android notification permission: https://developer.android.com/develop/ui/views/notifications/notification-permission
- Apple local notifications: https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app
- PWA install guide: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
