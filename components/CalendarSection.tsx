"use client";

import { useEffect, useState } from "react";
import SectionShell from "@/components/ui/SectionShell";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  TIMEZONE_OPTIONS,
  TzOption,
  getUpcomingBoostWindows,
  generateICS,
  googleCalURL,
  formatLocalDate,
  formatLocalTime,
} from "@/lib/promoSchedule";

export default function CalendarSection() {
  const [tz, setTz] = useState<TzOption>(TIMEZONE_OPTIONS[1]);
  const [windows, setWindows] = useState<{ start: Date; end: Date }[]>([]);

  useEffect(() => {
    const offsetMins = -new Date().getTimezoneOffset();
    let best = TIMEZONE_OPTIONS[1];
    let bestDiff = Infinity;
    for (const opt of TIMEZONE_OPTIONS) {
      const diff = Math.abs(opt.offsetMinutes - offsetMins);
      if (diff < bestDiff) { bestDiff = diff; best = opt; }
    }
    setTz(best);
  }, []);

  useEffect(() => {
    setWindows(getUpcomingBoostWindows(new Date(), 3));
  }, []);

  function downloadICS() {
    const ics = generateICS();
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "claude-2x-boost-windows.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  const firstWindow = windows[0];

  return (
    <SectionShell id="calendar">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 max-w-8 bg-white/10" />
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-white/40">
          Stay on schedule
        </span>
        <div className="h-px flex-1 max-w-8 bg-white/10" />
      </div>

      <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-center mb-4 gradient-text">
        Calendar & reminders
      </h2>
      <p className="text-center text-white/50 text-base max-w-xl mx-auto mb-12">
        Add all 2× windows to your calendar so you never miss a boost.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: add buttons */}
        <Card className="flex flex-col gap-4">
          <h3 className="font-display font-bold text-xl text-white mb-1">
            Add to your calendar
          </h3>
          <p className="text-white/50 text-sm leading-relaxed">
            Download an <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-md text-xs">.ics</code> file with every boost window, or jump straight into Google Calendar.
          </p>

          <div className="flex flex-col gap-3 mt-2">
            {/* Apple / iCal */}
            <button
              onClick={downloadICS}
              className="group flex items-center gap-4 glass rounded-2xl p-4 hairline hover:border-white/20 transition-all duration-200 text-left cursor-pointer"
              aria-label="Add boosts to Apple Calendar"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h5.25c1.036 0 1.875.84 1.875 1.875V4.5h1.875C19.66 4.5 21 5.84 21 7.125v11.25C21 19.66 19.66 21 18.375 21H5.625C4.34 21 3 19.66 3 18.375V7.125C3 5.84 4.34 4.5 5.625 4.5H7.5V3.375zm1.875-.375a.375.375 0 00-.375.375V4.5h6.75V3.375A.375.375 0 0015.375 3H9.375z"/>
                </svg>
              </div>
              <div>
                <div className="font-semibold text-white text-sm group-hover:text-white/90">
                  Apple Calendar / iCal
                </div>
                <div className="text-xs text-white/40 mt-0.5">Downloads .ics file with all boost windows</div>
              </div>
              <svg className="w-4 h-4 text-white/30 ml-auto group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* Google Calendar */}
            {firstWindow && (
              <a
                href={googleCalURL(firstWindow.start, firstWindow.end)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 glass rounded-2xl p-4 hairline hover:border-white/20 transition-all duration-200 text-left"
                aria-label="Add first boost window to Google Calendar"
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-lg">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-white text-sm group-hover:text-white/90">
                    Google Calendar
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">Opens next boost window in Google Calendar</div>
                </div>
                <svg className="w-4 h-4 text-white/30 ml-auto group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </Card>

        {/* Right: upcoming windows */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-xl text-white">
              Next 3 boost windows
            </h3>
            <select
              value={tz.tz}
              onChange={(e) => {
                const found = TIMEZONE_OPTIONS.find((o) => o.tz === e.target.value);
                if (found) setTz(found);
              }}
              className="bg-surface-3 hairline text-white/60 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 appearance-none cursor-pointer"
              aria-label="Select timezone for upcoming windows"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='rgba(255,255,255,0.4)'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: "1.75rem" }}
            >
              {TIMEZONE_OPTIONS.map((o) => (
                <option key={o.tz} value={o.tz}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {windows.length === 0 && (
              <p className="text-white/30 text-sm">No upcoming windows found.</p>
            )}
            {windows.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] hairline"
              >
                <div className="w-8 h-8 rounded-xl boost-bar flex items-center justify-center shrink-0 shadow-glow-sm">
                  <span className="text-xs font-extrabold text-white">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">
                    {formatLocalDate(w.start, tz.offsetMinutes)}
                  </div>
                  <div className="text-xs text-white/50 mt-0.5">
                    {formatLocalTime(w.start, tz.offsetMinutes)} →{" "}
                    {formatLocalTime(w.end, tz.offsetMinutes)}
                  </div>
                </div>
                <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2 py-1 rounded-lg shrink-0">
                  2×
                </span>
              </div>
            ))}
          </div>

          {windows.length > 0 && (
            <p className="text-xs text-white/25 mt-4">
              Showing in {tz.label}
            </p>
          )}
        </Card>
      </div>
    </SectionShell>
  );
}
