// lib/promoSchedule.ts
// Single source of truth for promotion rules.
// Promotion: March 13–28, 2026
//
// 2x boost (weekdays): 8 AM–2 PM ET / 5–11 AM PT / 12–6 PM GMT / 5:30–11:30 PM IST
//   In UTC this is 12:00–18:00 on weekdays.
// 2x boost (weekends): all day Saturday and Sunday.
// 1x normal: everything else on weekdays.

export const PROMO_START = new Date("2026-03-13T00:00:00Z");
export const PROMO_END   = new Date("2026-03-28T23:59:59Z");

/** Boost UTC hours on weekdays [inclusive start, exclusive end) */
export const PEAK_UTC_START = 12; // noon UTC = 8 AM ET = 5:30 PM IST
export const PEAK_UTC_END   = 18; // 6 PM UTC  = 2 PM ET = 11:30 PM IST

export type TzOption = {
  label: string;
  tz: string;
  offsetMinutes: number; // fixed offset for March (DST already resolved)
};

export const TIMEZONE_OPTIONS: TzOption[] = [
  { label: "PT (PDT, UTC−7)",    tz: "America/Los_Angeles", offsetMinutes: -7 * 60       },
  { label: "ET (EDT, UTC−4)",    tz: "America/New_York",    offsetMinutes: -4 * 60       },
  { label: "GMT (UTC+0)",        tz: "Europe/London",       offsetMinutes:  0             },
  { label: "IST (UTC+5:30)",     tz: "Asia/Kolkata",        offsetMinutes:  5 * 60 + 30  },
  { label: "AET (AEDT, UTC+11)", tz: "Australia/Sydney",   offsetMinutes: 11 * 60        },
];

/** Returns true if `date` falls within the overall promo period. */
export function isInPromoPeriod(date: Date): boolean {
  return date >= PROMO_START && date <= PROMO_END;
}

/** Returns true if `date` is Mon–Fri in UTC. */
function isWeekday(date: Date): boolean {
  const d = date.getUTCDay();
  return d >= 1 && d <= 5;
}

/** Returns true if `date` is in the 2x boost UTC window on a weekday (12:00–18:00). */
export function isInPeakWindow(date: Date): boolean {
  if (!isWeekday(date)) return false;
  const h = date.getUTCHours();
  return h >= PEAK_UTC_START && h < PEAK_UTC_END;
}

/**
 * Returns true if the 2x boost is active at `date`.
 * Weekdays: 2x during 8 AM–2 PM ET (12:00–18:00 UTC = 5:30–11:30 PM IST).
 * Weekends: 2x all day.
 * Uses UTC day-of-week — used internally for ICS/calendar generation.
 */
export function is2xActive(date: Date): boolean {
  if (!isInPromoPeriod(date)) return false;
  if (!isWeekday(date)) return true;   // weekends always 2x
  return isInPeakWindow(date);         // weekdays: only during boost window
}

/**
 * Like is2xActive but uses the user's LOCAL day-of-week so that e.g.
 * 12:30 AM IST on Monday is correctly treated as a weekday (not Sunday UTC).
 * Use this for all live status display; use is2xActive for calendar generation.
 */
export function isBoostActive(date: Date, offsetMinutes: number): boolean {
  if (!isInPromoPeriod(date)) return false;
  // Shift the date into local time and read the local day-of-week
  const local = new Date(date.getTime() + offsetMinutes * 60_000);
  const dow   = local.getUTCDay();
  const isLocalWeekend = dow === 0 || dow === 6;
  if (isLocalWeekend) return true;   // local weekend: all day 2x
  return isInPeakWindow(date);       // local weekday: boost during peak UTC window
}

/**
 * Returns the Date of the next boost↔normal transition
 * starting just after `from`, scanning up to 7 days ahead.
 */
export function nextTransition(from: Date): Date | null {
  const limit = new Date(from.getTime() + 7 * 24 * 60 * 60_000);
  const currentlyBoosted = is2xActive(from);
  const d = new Date(from.getTime() + 60_000); // 1 min ahead

  while (d <= limit && d <= PROMO_END) {
    if (is2xActive(d) !== currentlyBoosted) return d;
    d.setTime(d.getTime() + 60_000);
  }
  return null;
}

/**
 * Returns the next N upcoming boost windows from `from`.
 * Used for Google Calendar link generation.
 */
export function getUpcomingBoostWindows(
  from: Date,
  count = 3
): { start: Date; end: Date }[] {
  const windows: { start: Date; end: Date }[] = [];
  let cursor = new Date(from);

  while (windows.length < count && cursor <= PROMO_END) {
    if (!is2xActive(cursor)) {
      const t = nextTransition(cursor);
      if (!t || t > PROMO_END) break;
      cursor = t;
    }
    const start  = new Date(cursor);
    const endT   = nextTransition(cursor);
    const boostEnd = endT && endT <= PROMO_END ? endT : new Date(PROMO_END);
    windows.push({ start, end: boostEnd });
    cursor = new Date(boostEnd.getTime() + 61_000);
  }

  return windows;
}

// ─── Per-day display entries ───────────────────────────────────────────────

export type BoostDayEntry = {
  dayLabel: string;      // "Mon, Mar 23"
  isWeekend: boolean;
  fromStr: string;       // "5:30 PM"  — empty for weekends
  toStr: string;         // "11:30 PM" — empty for weekends
  wrapsNextDay: boolean; // true only when window crosses local midnight (e.g. AET)
};

function minsToTimeStr(mins: number): string {
  const n  = ((mins % 1440) + 1440) % 1440;
  const h  = Math.floor(n / 60);
  const m  = n % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

/**
 * Returns one BoostDayEntry per upcoming LOCAL calendar day, starting from today.
 * Weekdays show the 2x window in local time; weekends show "All Day".
 */
export function getUpcomingBoostDayEntries(
  now: Date,
  offsetMinutes: number,
  count = 3
): BoostDayEntry[] {
  const entries: BoostDayEntry[] = [];

  // Shift into "local UTC" space so getUTC* calls return local values
  const localNow   = new Date(now.getTime() + offsetMinutes * 60_000);
  const localToday = new Date(localNow);
  localToday.setUTCHours(0, 0, 0, 0); // local midnight

  const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Boost window in local minutes from midnight
  const rawStart       = PEAK_UTC_START * 60 + offsetMinutes;
  const rawEnd         = PEAK_UTC_END   * 60 + offsetMinutes;
  const localBoostFrom = ((rawStart % 1440) + 1440) % 1440;
  const localBoostTo   = ((rawEnd   % 1440) + 1440) % 1440;
  // Wraps midnight when end < start (e.g. AET: 23:00 → 05:00 next day)
  const wrapsNextDay   = localBoostTo < localBoostFrom;

  for (let i = 0; entries.length < count && i < 30; i++) {
    const localDay = new Date(localToday);
    localDay.setUTCDate(localDay.getUTCDate() + i);

    const dow       = localDay.getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    const dayLabel  = `${DAYS[dow]}, ${MONTHS[localDay.getUTCMonth()]} ${localDay.getUTCDate()}`;

    // Confirm this local day overlaps the promo period
    const utcDayStart = new Date(localDay.getTime() - offsetMinutes * 60_000);
    const utcDayEnd   = new Date(utcDayStart.getTime() + 24 * 60 * 60_000);
    if (utcDayStart >= PROMO_END || utcDayEnd <= PROMO_START) continue;

    entries.push({
      dayLabel,
      isWeekend,
      fromStr:     isWeekend ? "" : minsToTimeStr(localBoostFrom),
      toStr:       isWeekend ? "" : minsToTimeStr(localBoostTo),
      wrapsNextDay: !isWeekend && wrapsNextDay,
    });
  }

  return entries;
}

// ─── Timeline helpers ──────────────────────────────────────────────────────

/**
 * Returns timeline segments for TODAY in local fractional time.
 * startFrac / endFrac are in [0, 1] where 0 = local midnight, 1 = next midnight.
 * Using fractions (not UTC hour buckets) means fractional offsets like IST +5:30
 * are represented exactly — no half-hour shift, no day-of-week flip mid-bar.
 */
export function getDaySegmentsLocal(
  now: Date,
  offsetMinutes: number
): { startFrac: number; endFrac: number; isBoosted: boolean }[] {
  // Determine local day-of-week
  const localNow = new Date(now.getTime() + offsetMinutes * 60_000);
  const dow       = localNow.getUTCDay(); // local day via shifted UTC
  const isWeekend = dow === 0 || dow === 6;

  if (!isInPromoPeriod(now)) {
    return [{ startFrac: 0, endFrac: 1, isBoosted: false }];
  }

  if (isWeekend) {
    return [{ startFrac: 0, endFrac: 1, isBoosted: true }];
  }

  // Weekday: map boost UTC window → local fractional minutes from midnight
  const rawFrom   = PEAK_UTC_START * 60 + offsetMinutes;
  const rawTo     = PEAK_UTC_END   * 60 + offsetMinutes;
  const localFrom = ((rawFrom % 1440) + 1440) % 1440; // minutes from local midnight
  const localTo   = ((rawTo   % 1440) + 1440) % 1440;

  const fromFrac  = localFrom / 1440;
  const toFrac    = localTo   / 1440;

  if (localTo > localFrom) {
    // No midnight wrap — grey → green → grey
    const segs: { startFrac: number; endFrac: number; isBoosted: boolean }[] = [];
    if (fromFrac > 0) segs.push({ startFrac: 0,        endFrac: fromFrac, isBoosted: false });
    segs.push(                   { startFrac: fromFrac, endFrac: toFrac,   isBoosted: true  });
    if (toFrac < 1)   segs.push({ startFrac: toFrac,   endFrac: 1,        isBoosted: false });
    return segs;
  } else {
    // Wraps midnight (e.g. AET 11 PM → 5 AM) — green → grey → green
    return [
      { startFrac: 0,        endFrac: toFrac,   isBoosted: true  },
      { startFrac: toFrac,   endFrac: fromFrac,  isBoosted: false },
      { startFrac: fromFrac, endFrac: 1,         isBoosted: true  },
    ];
  }
}

// ─── Formatting helpers ────────────────────────────────────────────────────

/** Format time only (h:MM AM/PM) with a fixed offset. */
export function formatLocalTime(date: Date, offsetMinutes: number): string {
  const local = new Date(date.getTime() + offsetMinutes * 60_000);
  const h  = local.getUTCHours();
  const m  = local.getUTCMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

/** Format date (e.g. "Mon, Mar 23") with a fixed offset. */
export function formatLocalDate(date: Date, offsetMinutes: number): string {
  const local  = new Date(date.getTime() + offsetMinutes * 60_000);
  const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${DAYS[local.getUTCDay()]}, ${MONTHS[local.getUTCMonth()]} ${local.getUTCDate()}`;
}

/** Returns whether two UTC Dates fall on the same LOCAL calendar day. */
export function isSameLocalDay(a: Date, b: Date, offsetMinutes: number): boolean {
  const la = new Date(a.getTime() + offsetMinutes * 60_000);
  const lb = new Date(b.getTime() + offsetMinutes * 60_000);
  return (
    la.getUTCFullYear() === lb.getUTCFullYear() &&
    la.getUTCMonth()    === lb.getUTCMonth()    &&
    la.getUTCDate()     === lb.getUTCDate()
  );
}

// ─── Calendar helpers ──────────────────────────────────────────────────────

/** Generate ICS content for all 2x boost windows during the promo period. */
export function generateICS(): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Claude 2x Promo//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Claude 2x Boost Windows",
    "X-WR-TIMEZONE:UTC",
  ];

  const windows = getUpcomingBoostWindows(PROMO_START, 200);
  let uid = 1;

  for (const w of windows) {
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    lines.push(
      "BEGIN:VEVENT",
      `UID:claude-2x-boost-${uid++}@claude-promo-march2026`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(w.start)}`,
      `DTEND:${fmt(w.end)}`,
      "SUMMARY:🚀 Claude 2x Boost Window",
      "DESCRIPTION:Your Claude usage is doubled during this window (March 2026 promotion).",
      "CATEGORIES:Claude,Productivity",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Generate a Google Calendar quick-add URL for a given window. */
export function googleCalURL(start: Date, end: Date): string {
  const fmt  = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z");
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const params = new URLSearchParams({
    text:    "🚀 Claude 2x Boost Window",
    dates:   `${fmt(start)}/${fmt(end)}`,
    details: "Claude usage is doubled during this window (March 2026 promotion). " +
             "Visit https://support.claude.com/en/articles/14063676",
  });
  return `${base}&${params.toString()}`;
}
