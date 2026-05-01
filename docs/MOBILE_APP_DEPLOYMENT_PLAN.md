# Android and iOS App Deployment Plan

## Goal

Convert the current Lich Am web/PWA app into a real Android and iOS app that can:

- Store memory days in a reliable app database
- Schedule native local notifications
- Remind users before memory days at a given time
- Keep the current React calendar UI
- Keep the GitHub Pages PWA version working

## Recommended Strategy

Use Capacitor to wrap the existing React/Vite app in native Android and iOS projects.

Why Capacitor:

- The current app is already a modern web app.
- Most UI and calendar logic can stay unchanged.
- Native APIs can be added where needed.
- Android and iOS builds can share one React codebase.
- The PWA can continue to exist as the web version.

Target architecture:

```text
Shared React/Vite app
  -> Shared calendar/lunar/holiday logic
  -> MemoryRepository interface
       -> Web: IndexedDB
       -> Native: SQLite
  -> ReminderScheduler interface
       -> Web: ICS export
       -> Native: Capacitor Local Notifications
  -> Platform shell
       -> Web/PWA: browser
       -> Android: Capacitor Android project
       -> iOS: Capacitor iOS project
```

## Phase 1: Prepare The Shared App

Tasks:

- Move memory storage behind a `MemoryRepository` interface.
- Move reminder scheduling behind a `ReminderScheduler` interface.
- Keep current `localStorage` behavior as the first web implementation.
- Add unit tests for memory-day recurrence:
  - Solar yearly repeat
  - Lunar yearly repeat
  - Leap lunar month behavior
  - 7-day reminder date
  - 1-day reminder date
- Keep `.ics` export available for the web app.

Result:

- Calendar logic remains shared.
- Platform-specific storage and notification code can be swapped cleanly.

## Phase 2: Upgrade Web Storage

Tasks:

- Replace web `localStorage` memory-day storage with IndexedDB.
- Add migration from old `localStorage` data to IndexedDB.
- Add export/import backup as JSON.
- Keep a simple version number for stored data.

Recommended web data store:

```text
IndexedDB database: lich-am

Object stores:
  memory_days
  notification_jobs
  settings
```

Result:

- Better local persistence for PWA users.
- Safer path before adding native SQLite.

## Phase 3: Add Capacitor

Tasks:

- Install Capacitor packages.
- Initialize Capacitor app ID, for example `com.buicongnguyen.licham`.
- Add Android platform.
- Add iOS platform.
- Configure build output to use Vite `dist`.
- Add app icons and splash assets.
- Confirm the app opens locally in Android Studio and Xcode.

Expected commands:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
npm run build
npx cap sync
```

Result:

- Native Android and iOS projects exist.
- The current app UI runs inside native shells.

## Phase 4: Native Database

Recommended approach:

- Use SQLite for the native app database.
- Keep IndexedDB for the web version.
- Keep a single repository API in the React app.

Suggested schema:

```sql
CREATE TABLE memory_days (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  calendar_kind TEXT NOT NULL,
  source_date TEXT NOT NULL,
  lunar_day INTEGER,
  lunar_month INTEGER,
  lunar_year INTEGER,
  lunar_is_leap INTEGER,
  country TEXT NOT NULL,
  repeat_yearly INTEGER NOT NULL,
  remind_week_before INTEGER NOT NULL,
  remind_day_before INTEGER NOT NULL,
  remind_time TEXT NOT NULL DEFAULT '08:00',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE notification_jobs (
  id TEXT PRIMARY KEY,
  memory_day_id TEXT NOT NULL,
  occurrence_date TEXT NOT NULL,
  trigger_at TEXT NOT NULL,
  offset_days INTEGER NOT NULL,
  native_notification_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (memory_day_id) REFERENCES memory_days(id)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Result:

- Memory days are saved in a real app database on Android and iOS.
- The app can rebuild notification schedules from the database.

## Phase 5: Native Local Notifications

Use `@capacitor/local-notifications`.

Tasks:

- Add notification permission request flow.
- Add user setting for reminder time, for example `08:00`.
- Create native notification channel on Android.
- Schedule notification jobs after memory-day save/edit/delete.
- Cancel stale notifications when memory days change.
- Resync pending notifications on app start.

Scheduling algorithm:

```text
For each memory day:
  1. Find next occurrence date.
  2. For each enabled offset:
       offset 7 days
       offset 1 day
  3. Combine occurrence date minus offset with reminder time.
  4. If trigger time is in the future:
       schedule native notification
       save notification_jobs row
```

For lunar memory days:

```text
Use stored lunar day/month/isLeap
  -> Find next solar occurrence
  -> Schedule notification using the solar trigger date
```

Result:

- Notifications are delivered by Android/iOS, even when the app is not open.

## Phase 6: Android-Specific Work

Android requirements:

- Android 13+ requires `POST_NOTIFICATIONS` runtime permission.
- Android 12+ exact alarms may need exact-alarm permission or fallback behavior.
- Notification channel must be created for Android 8+.
- Battery optimization and Doze mode can delay notifications unless handled carefully.

Tasks:

- Add `POST_NOTIFICATIONS` permission.
- Add notification channel:
  - ID: `memory-reminders`
  - Name: `Memory day reminders`
- Decide whether exact alarms are required.
- If exact time is required, add exact-alarm permission handling.
- Test on:
  - Android 12
  - Android 13
  - Android 14 or newer

Result:

- Android APK/AAB can remind users from native scheduled notifications.

## Phase 7: iOS-Specific Work

iOS requirements:

- User must grant notification permission.
- Local notifications are scheduled through Apple's UserNotifications framework.
- iOS limits and system behavior can affect many far-future notifications.

Tasks:

- Add notification permission request flow.
- Schedule only the nearest upcoming notification jobs.
- Refill the schedule when the app opens.
- Test notification delivery after:
  - App is closed
  - Phone is locked
  - Timezone changes
  - User denies permission
  - User later enables permission in Settings

Result:

- iPhone app can remind users with native local notifications.

## Phase 8: App Release

Android release tasks:

- Create production app icon.
- Configure package name.
- Build signed Android App Bundle.
- Test on internal track in Google Play Console.
- Add privacy policy.
- Publish to closed testing first.

iOS release tasks:

- Create Apple Developer app record.
- Configure bundle ID.
- Configure app icon and launch screen.
- Archive in Xcode.
- Test through TestFlight.
- Add privacy labels and review notes.
- Submit to App Store review.

## Phase 9: Backup And Sync

Start local-only first. Add sync later.

Possible backup path:

- JSON export/import
- Google Drive/iCloud file backup
- Later optional backend sync

Possible future backend:

```text
User account
  -> Memory days sync
  -> Push notification fallback
  -> Multi-device support
```

This should come after native local notifications are stable.

## Testing Checklist

Core tests:

- App opens on web, Android, iOS
- Month view works
- Year board works
- Vietnamese holidays display
- Lunar dates match expected dates
- Add/edit/delete memory day works
- Memory day repeats by solar year
- Memory day repeats by lunar year
- `.ics` export still works on web

Notification tests:

- Permission allowed
- Permission denied
- 1-day reminder fires
- 7-day reminder fires
- Reminder at selected time fires
- Editing memory day cancels old notifications
- Deleting memory day cancels notifications
- App restart resyncs notification jobs
- Android reboot behavior is checked
- iOS pending notification behavior is checked

## Recommended Order

1. Add repository and scheduler interfaces.
2. Move web storage to IndexedDB.
3. Add Capacitor Android first.
4. Add native local notifications on Android.
5. Add SQLite native storage.
6. Add iOS project.
7. Make iOS notification behavior stable.
8. Add backup/export/import.
9. Prepare app store release.

## Important Product Decisions

Decide before implementation:

- Default reminder time, for example `08:00`.
- Whether user can set different reminder time per memory day.
- Whether reminders should be exact or acceptable within system delay.
- Whether lunar repeated reminders should skip leap lunar months or support them.
- Whether memory-day data should stay local-only or sync later.
- Whether phone-calendar import remains a main feature or becomes secondary.

## Reference Links

- Capacitor: https://capacitorjs.com/docs
- Capacitor Local Notifications: https://capacitorjs.com/docs/apis/local-notifications
- Android notification permission: https://developer.android.com/develop/ui/views/notifications/notification-permission
- Apple local notifications: https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app
- PWA install guide: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
