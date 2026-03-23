"use client";

import { useEffect, useState } from "react";
import SectionShell from "@/components/ui/SectionShell";
import {
  TIMEZONE_OPTIONS,
  TzOption,
  is2xActive,
  isInPromoPeriod,
  getDaySegments,
  formatLocalDate,
  formatLocalTime,
} from "@/lib/promoSchedule";

const HOURS_LABEL = ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p", "12a+1"];

export default function BoostTimeline() {
  // null on server — only set after mount to avoid hydration mismatch
  const [now, setNow] = useState<Date | null>(null);
  const [tz, setTz] = useState<TzOption>(TIMEZONE_OPTIONS[1]); // ET default

  // Initialise on mount, then tick every 30 s
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Detect user's closest tz option
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

  // Build 5-day window from today (or a fixed anchor before mount)
  const anchorUtc = now ?? new Date("2026-03-13T00:00:00Z");
  const days = (() => {
    const result: Date[] = [];
    const d = new Date(anchorUtc);
    d.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i < 5; i++) {
      result.push(new Date(d));
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return result;
  })();

  const nowPercent = now
    ? (now.getUTCHours() * 60 + now.getUTCMinutes()) / (24 * 60) * 100
    : null;

  const todayIso = now ? now.toISOString().slice(0, 10) : null;

  return (
    <SectionShell id="timeline">
      {/* Label */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 max-w-8 bg-white/10" />
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-white/40">
          Your schedule
        </span>
        <div className="h-px flex-1 max-w-8 bg-white/10" />
      </div>

      <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-center mb-4 gradient-text">
        Your boost timeline
      </h2>
      <p className="text-center text-white/50 text-base max-w-xl mx-auto mb-10">
        Hover over any bar to see if that hour is boosted. The{" "}
        <span className="text-violet-400 font-semibold">purple/blue bars</span> are your 2× windows.
      </p>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        {/* Status pill — only meaningful after mount */}
        {now ? (
          <BoostPill boosted={is2xActive(now)} inPeriod={isInPromoPeriod(now)} />
        ) : (
          <div className="flex items-center gap-3 glass rounded-2xl px-5 py-3">
            <span className="w-2.5 h-2.5 rounded-full bg-white/20 animate-pulse" />
            <span className="text-sm font-semibold text-white/40">Checking boost status…</span>
          </div>
        )}

        {/* TZ selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/40 font-medium">Timezone</span>
          <select
            value={tz.tz}
            onChange={(e) => {
              const found = TIMEZONE_OPTIONS.find((o) => o.tz === e.target.value);
              if (found) setTz(found);
            }}
            className="bg-surface-3 hairline text-white text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none cursor-pointer"
            aria-label="Select timezone"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='rgba(255,255,255,0.4)'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
            }}
          >
            {TIMEZONE_OPTIONS.map((o) => (
              <option key={o.tz} value={o.tz}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline grid */}
      <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
        <div className="min-w-[640px]">
          {/* Hour labels */}
          <div className="flex mb-2 pl-28">
            {HOURS_LABEL.map((l, i) => (
              <div key={i} className="flex-1 text-xs text-white/25 font-mono text-center">
                {l}
              </div>
            ))}
          </div>

          {/* Day rows */}
          <div className="space-y-2">
            {days.map((dayUtc) => {
              const segments = getDaySegments(dayUtc);
              const dayIso = dayUtc.toISOString().slice(0, 10);
              const isToday = dayIso === todayIso;
              const dateLabel = formatLocalDate(dayUtc, tz.offsetMinutes);

              return (
                <div key={dayUtc.toISOString()} className="flex items-center gap-3">
                  {/* Day label */}
                  <div className="w-24 shrink-0 text-right">
                    <span className={`text-xs font-semibold ${isToday ? "text-white" : "text-white/35"}`}>
                      {dateLabel}
                    </span>
                  </div>

                  {/* Bar */}
                  <div className="relative flex-1 h-8 rounded-xl overflow-hidden bg-white/[0.03] hairline">
                    {segments.map((seg, si) => {
                      const left = (seg.startHour / 24) * 100;
                      const width = ((seg.endHour - seg.startHour) / 24) * 100;
                      return (
                        <div
                          key={si}
                          className={`absolute top-0 h-full group ${seg.isBoosted ? "boost-bar" : "bg-white/[0.04]"}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${formatLocalTime(new Date(dayUtc.getTime() + seg.startHour * 3_600_000), tz.offsetMinutes)}–${formatLocalTime(new Date(dayUtc.getTime() + seg.endHour * 3_600_000), tz.offsetMinutes)}: ${seg.isBoosted ? "2× Boost" : "1× Normal"}`}
                          aria-label={`${seg.isBoosted ? "Boosted" : "Normal"} from hour ${seg.startHour} to ${seg.endHour}`}
                        >
                          {seg.isBoosted && (
                            <span className="hidden group-hover:flex absolute inset-0 items-center justify-center text-white/90 text-xs font-bold pointer-events-none">
                              2×
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* "Now" marker — only rendered client-side after mount */}
                    {isToday && nowPercent !== null && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10"
                        style={{ left: `${nowPercent}%` }}
                        aria-label="Current time"
                      />
                    )}
                  </div>

                  {/* Out-of-promo marker */}
                  <div className="w-6 shrink-0">
                    {!isInPromoPeriod(dayUtc) && (
                      <span className="text-xs text-white/20">–</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pl-28">
            <LegendItem color="boost-bar" label="2× off-peak (boosted)" />
            <LegendItem color="bg-white/[0.04]" label="1× peak (normal)" />
            <LegendItem color="bg-white/70" label="Now" />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function BoostPill({ boosted, inPeriod }: { boosted: boolean; inPeriod: boolean }) {
  if (!inPeriod) {
    return (
      <div className="flex items-center gap-3 glass rounded-2xl px-5 py-3">
        <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
        <span className="text-sm font-semibold text-white/50">
          Promotion hasn't started yet — begins March 13
        </span>
      </div>
    );
  }

  if (boosted) {
    return (
      <div className="flex items-center gap-3 rounded-2xl px-5 py-3 shimmer-bg glow-violet animate-glow-pulse">
        <span className="relative flex w-3 h-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
        </span>
        <span className="text-sm font-extrabold text-white tracking-wide">
          2× UNLOCKED — Boost active now!
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 glass rounded-2xl px-5 py-3">
      <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
      <span className="text-sm font-semibold text-white/60">
        1× mode — Normal speed right now
      </span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-2.5 rounded-sm ${color}`} />
      <span className="text-xs text-white/35">{label}</span>
    </div>
  );
}
