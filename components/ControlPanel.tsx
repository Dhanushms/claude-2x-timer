"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Sun,
  Moon,
  Bell,
  BellOff,
  CalendarDays,
  Zap,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import {
  is2xActive,
  isBoostActive,
  isInPromoPeriod,
  getUpcomingBoostWindows,
  getUpcomingBoostDayEntries,
  BoostDayEntry,
  getDaySegmentsLocal,
  formatLocalDate,
  formatLocalTime,
  isSameLocalDay,
  generateICS,
  googleCalURL,
  nextTransition,
  TIMEZONE_OPTIONS,
  TzOption,
  PEAK_UTC_START,
  PEAK_UTC_END,
} from "@/lib/promoSchedule";

// ─── Pure helpers (no side-effects, safe on server) ───────────────────────────

/**
 * Convert a UTC hour boundary into a display string for a given offset.
 * e.g. utcHourToLocal(12, 330) → "5:30 PM"  (IST)
 *      utcHourToLocal(18, -240) → "2:00 PM"  (EDT)
 */
function utcHourToLocal(utcHour: number, offsetMinutes: number): string {
  const totalMin = utcHour * 60 + offsetMinutes;
  const wrapped = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${h12} ${ampm}`
    : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}


/**
 * Return the fractional hour (0–24) in a given offset timezone.
 * e.g. if UTC is 12:30 and offset is +330 (IST), result is 18.0.
 */
function localFractionalHour(now: Date, offsetMinutes: number): number {
  const shifted = new Date(now.getTime() + offsetMinutes * 60_000);
  return shifted.getUTCHours() + shifted.getUTCMinutes() / 60;
}

/**
 * Split "08:32:04 AM" → { digits: "08:32:04", ampm: "AM" }
 * Handles both "08:32:04 AM" and "08:32:04AM" layouts.
 */
function splitTimeParts(str: string): { digits: string; ampm: string } {
  const m = str.trim().match(/^([\d:]+)\s*(AM|PM)$/i);
  if (m) return { digits: m[1], ampm: m[2].toUpperCase() };
  return { digits: str, ampm: "" };
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        bg-white/80 dark:bg-zinc-900/60
        backdrop-blur-xl
        border border-zinc-200 dark:border-white/10
        shadow-[0_8px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
        dark:shadow-[0_20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]
        rounded-2xl overflow-hidden
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-500 mb-3 select-none">
      {children}
    </p>
  );
}

// ─── Success sound (Web Audio API — no external files) ───────────────────────

function playSuccessChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99]; // C5 → E5 → G5 (major chord arpeggio)
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.45);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.5);
    });
  } catch { /* silently ignore if AudioContext unavailable */ }
}

// ─── PostPromoCard ───────────────────────────────────────────────────────────

function PostPromoCard({ inPeriod, mounted }: { inPeriod: boolean; mounted: boolean }) {
  const [email, setEmail]       = useState("");
  const [status, setStatus]     = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const promoEnded = mounted && !inPeriod;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res  = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      playSuccessChime();
      setStatus("success");
      setEmail("");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  // ── During promo: V2 early-access strip ────────────────────────────────────
  if (!promoEnded) {
    return (
      <Panel>
        <div className="px-6 pt-6 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-500">
            What&apos;s next
          </p>
        </div>
        <div className="px-6 pb-6 flex flex-col gap-5">
          <div>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
              Claude 2x Planner V2
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-sm">
              Something bigger is in the works — a full Claude companion beyond the promo.
              Drop your email and be the first through the door.
            </p>
          </div>
          <EmailForm
            email={email} setEmail={setEmail}
            status={status} errorMsg={errorMsg}
            onSubmit={handleSubmit}
          />
        </div>
      </Panel>
    );
  }

  // ── After promo: full ended card ───────────────────────────────────────────
  return (
    <Panel className="overflow-hidden">
      <div className="bg-zinc-100 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700/50 px-6 py-3 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          The March 2026 2× promotion ended on March 28 — Claude is back to normal speed.
        </p>
      </div>

      <div className="px-6 py-10 flex flex-col items-center text-center gap-8">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-600/30 dark:border-emerald-500/20 bg-emerald-600/10 dark:bg-emerald-500/10 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          In development
        </span>

        <div className="max-w-xs">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            V2 is on its way.
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3 leading-relaxed">
            The promo may be over, but the tool isn&apos;t. V2 goes further — usage insights,
            streak tracking, and early alerts when the next Claude promo drops.
          </p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <EmailForm
            email={email} setEmail={setEmail}
            status={status} errorMsg={errorMsg}
            onSubmit={handleSubmit}
          />
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 text-center">
            No spam. One email when it&apos;s ready.
          </p>
        </div>
      </div>
    </Panel>
  );
}

// ─── EmailForm ────────────────────────────────────────────────────────────────

function EmailForm({
  email, setEmail, status, errorMsg, onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  status: "idle" | "loading" | "success" | "error";
  errorMsg: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const [pressed, setPressed] = useState(false);

  if (status === "success") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/10 border border-emerald-600/20 dark:border-emerald-500/20 animate-in fade-in zoom-in-95 duration-300">
        {/* Animated checkmark */}
        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path className="[stroke-dasharray:30] [stroke-dashoffset:30] animate-[dash_0.4s_ease-out_0.1s_forwards]" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        <div>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">
            You&apos;re in — check your inbox!
          </p>
          <p className="text-[10px] text-emerald-600/60 dark:text-emerald-500/60 mt-0.5">
            Confirmation email on its way.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 w-full">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={status === "loading"}
          className="flex-1 min-w-0 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all duration-200 disabled:opacity-50"
          aria-label="Your email address"
        />
        <button
          type="submit"
          disabled={status === "loading" || !email}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          className={`
            relative shrink-0 overflow-hidden px-5 py-2.5 rounded-xl text-white text-sm font-semibold
            bg-emerald-600 dark:bg-emerald-500
            focus:outline-none focus:ring-2 focus:ring-emerald-500/50
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-150
            ${pressed && status !== "loading" ? "scale-95 brightness-110" : "scale-100"}
            ${status !== "loading" && email ? "hover:brightness-110 active:scale-95" : ""}
          `}
          aria-label="Get notified"
        >
          {/* Ripple layer */}
          {pressed && (
            <span className="absolute inset-0 bg-white/20 animate-ping rounded-xl" />
          )}

          {status === "loading" ? (
            /* Three-dot pulse loader */
            <span className="flex items-center gap-1 px-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
          ) : (
            <span className="relative flex items-center gap-1.5">
              Get early access
              <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </span>
          )}
        </button>
      </div>

      {status === "error" && (
        <p className="text-xs text-red-500 dark:text-red-400 px-1 animate-in slide-in-from-top-1 duration-200">
          {errorMsg}
        </p>
      )}
    </form>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────────

function StatusPill({
  boosted,
  inPeriod,
  mounted,
}: {
  boosted: boolean;
  inPeriod: boolean;
  mounted: boolean;
}) {
  // Not mounted — skeleton
  if (!mounted) {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 animate-pulse">
        Checking…
      </span>
    );
  }

  // Outside promo period
  if (!inPeriod) {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-500">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        Promotion starts Mar 13
      </span>
    );
  }

  // Single element — CSS transition-colors animates the emerald↔amber shift smoothly
  return (
    <span
      className={`
        inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold
        transition-all duration-500
        ${boosted
          ? "bg-emerald-600/10 dark:bg-emerald-500/10 border-emerald-600/20 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]"
          : "bg-amber-100/50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-500"
        }
      `}
    >
      {boosted ? (
        /* Pulsing green dot */
        <span className="relative flex w-2 h-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 dark:bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-600 dark:bg-emerald-500" />
        </span>
      ) : (
        /* Static amber dot */
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-500 shrink-0" />
      )}
      <span className="transition-[opacity] duration-300">
        {boosted ? "2x UNLOCKED" : "1x Mode — Normal Usage"}
      </span>
    </span>
  );
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left gap-3"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
          {q}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed pr-5">
          {a}
        </p>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ControlPanel() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [timeStr, setTimeStr] = useState("--:--:-- AM");

  // selectedTz drives EVERYTHING: clock, peak display, timeline, needle
  const [selectedTz, setSelectedTz] = useState<TzOption>(TIMEZONE_OPTIONS[1]); // ET default

  const [isDark, setIsDark] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [upcomingWindows, setUpcomingWindows] = useState<
    { start: Date; end: Date }[]
  >([]);
  const [boostDayEntries, setBoostDayEntries] = useState<BoostDayEntry[]>([]);
  const [lastNotifiedKey, setLastNotifiedKey] = useState("");

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);

    // Theme
    const stored = localStorage.getItem("theme") || "dark";
    setIsDark(stored === "dark");
    document.documentElement.classList.toggle("dark", stored === "dark");

    // Auto-detect closest TZ from browser offset
    const offset = -new Date().getTimezoneOffset(); // minutes east of UTC
    let best = TIMEZONE_OPTIONS[1]; // ET fallback
    let bestDiff = Infinity;
    for (const opt of TIMEZONE_OPTIONS) {
      const diff = Math.abs(opt.offsetMinutes - offset);
      if (diff < bestDiff) { bestDiff = diff; best = opt; }
    }
    setSelectedTz(best);

    if ("Notification" in window) setNotifPermission(Notification.permission);
  }, []);

  // ── Clock: every second, always formatted in selectedTz ───────────────────
  // Depends on selectedTz so it re-runs (and resets interval) on TZ change.
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d);
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: selectedTz.tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(d);
      setTimeStr(formatted);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [selectedTz]); // ← re-formats on TZ switch

  // ── Upcoming windows (for Google Cal link) + per-day display entries ───────
  useEffect(() => {
    const refresh = () => {
      const n = new Date();
      setUpcomingWindows(getUpcomingBoostWindows(n, 3));
      setBoostDayEntries(getUpcomingBoostDayEntries(n, selectedTz.offsetMinutes, 3));
    };
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [selectedTz]); // re-compute whenever TZ changes

  // ── Notification alerts: every 30 s, only fires on 2× starts ─────────────
  useEffect(() => {
    if (
      !notificationsEnabled ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;

    const check = () => {
      const n = new Date();
      const next = nextTransition(n);
      if (!next) return;
      const minsUntil = (next.getTime() - n.getTime()) / 60_000;
      const key = next.toISOString();
      if (minsUntil <= 5 && minsUntil > 4.5 && key !== lastNotifiedKey) {
        const willBe2x = is2xActive(next);
        if (willBe2x) {
          setLastNotifiedKey(key);
          new Notification("🚀 2× Boost starting in 5 min!", {
            body: "Claude usage will be doubled soon. Switch to Claude now!",
            icon: "/favicon.ico",
          });
        }
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [notificationsEnabled, lastNotifiedKey]);

  // ── Derived: everything driven by selectedTz ──────────────────────────────

  // 24-hour bar segments for today — computed in LOCAL fractional time so
  // fractional offsets (e.g. IST +5:30) and day-of-week are accurate.
  const segments = useMemo(
    () => getDaySegmentsLocal(now ?? new Date(), selectedTz.offsetMinutes),
    [now, selectedTz]
  );

  // Needle position: local fractional hour in selectedTz → percentage across bar
  // spec: left = (currentHour / 24) * 100
  const nowPercent = useMemo(() => {
    if (!mounted || !now) return null;
    const frac = localFractionalHour(now, selectedTz.offsetMinutes);
    return (frac / 24) * 100;
  }, [mounted, now, selectedTz]);

  // Peak window times in selectedTz (display only — boost logic stays UTC)
  const peakStart = mounted
    ? utcHourToLocal(PEAK_UTC_START, selectedTz.offsetMinutes)
    : "--";
  const peakEnd = mounted
    ? utcHourToLocal(PEAK_UTC_END, selectedTz.offsetMinutes)
    : "--";

  // Short TZ label from the first word of selectedTz.label: "PT", "ET", "GMT"…
  const tzShort = selectedTz.label.split(" ")[0];

  // Split clock into digits + AM/PM for the two-span layout
  const { digits: clockDigits, ampm: clockAmPm } = splitTimeParts(timeStr);

  // Boost status: uses LOCAL day-of-week via isBoostActive so e.g.
  // 12:30 AM IST Monday is treated as a weekday (not UTC-Sunday).
  const boosted = mounted && now ? isBoostActive(now, selectedTz.offsetMinutes) : false;
  const inPeriod = mounted && now ? isInPromoPeriod(now) : false;
  const firstWindow = upcomingWindows[0];

  // ── Handlers ───────────────────────────────────────────────────────────────
  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function toggleNotifications() {
    if (!("Notification" in window)) return;
    if (!notificationsEnabled) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === "granted") setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(false);
    }
  }

  function downloadICS() {
    const blob = new Blob([generateICS()], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "claude-2x-boost-windows.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  const calBtnBase =
    "h-10 flex items-center justify-center gap-2 rounded-full border border-zinc-300 dark:border-zinc-700 px-4 text-sm font-medium transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Theme toggle — fixed top-right, clear of header content */}
      <button
        onClick={toggleTheme}
        suppressHydrationWarning
        className="fixed top-5 right-5 z-50 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all duration-200"
        aria-label="Toggle light / dark mode"
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-zinc-400" />
        ) : (
          <Moon className="w-4 h-4 text-zinc-600" />
        )}
      </button>

      {/* Page — gradient background gives glass something to blur against */}
      <div className="min-h-dvh bg-gradient-to-br from-zinc-100 via-zinc-200/60 to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center px-4 py-10 pb-16">
        <div className="w-full max-w-xl flex flex-col gap-3">

          {/* ── App header ── */}
          <div className="flex items-start gap-2.5 px-0.5 mb-1">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center shadow-sm shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-tight">
                Claude 2x Planner
              </p>
              {/* Subtitle + badge on the same row, generous gap so they breathe */}
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[10px] text-zinc-500 dark:text-zinc-500">
                  March 2026 Promotion
                </p>
                <span className="text-[10px] font-mono font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-transparent px-2 py-0.5 rounded-full tracking-wide">
                  Mar 13 – 28
                </span>
              </div>
            </div>
          </div>

          {/* ── Status + Clock ── */}
          <Panel>
            <div className="px-6 py-6 flex flex-col items-center text-center gap-4">
              <StatusPill boosted={boosted} inPeriod={inPeriod} mounted={mounted} />

              {/* Clock: flex-row keeps digits and AM/PM on one line, always */}
              <div suppressHydrationWarning>
                <div className="flex flex-row items-baseline justify-center whitespace-nowrap">
                  <span
                    className={`text-5xl md:text-7xl font-bold tracking-tighter leading-none font-mono transition-colors duration-700 ease-in-out ${
                      mounted && inPeriod && !boosted
                        ? "text-zinc-500 dark:text-zinc-400"
                        : "text-zinc-950 dark:text-zinc-50"
                    }`}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {mounted ? clockDigits : "--:--:--"}
                  </span>
                  <span className="text-2xl md:text-3xl font-medium ml-2 text-zinc-500 dark:text-zinc-400 leading-none">
                    {mounted ? clockAmPm : "AM"}
                  </span>
                </div>
                {/* TZ short label — centred, wide tracking */}
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mt-2 text-center w-full">
                  {mounted ? tzShort : "—"}
                </p>
              </div>

              {/* Peak window — structured two-line layout */}
              {mounted && (
                <div
                  className="flex flex-col items-center gap-0.5"
                  suppressHydrationWarning
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-500">
                    Boost Window (2×)
                  </p>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-300">
                    {peakStart} – {peakEnd}
                    <span className="text-zinc-500 dark:text-zinc-400 font-normal"> • Weekdays</span>
                  </p>
                </div>
              )}

              {/* Status hint — text and colour transition with boost state */}
              {mounted && now && inPeriod && (
                <p
                  className={`
                    text-xs max-w-xs leading-relaxed text-center
                    transition-colors duration-500
                    ${boosted
                      ? "text-emerald-600/80 dark:text-emerald-400/70"
                      : "text-amber-800 dark:text-amber-400/70"
                    }
                  `}
                  suppressHydrationWarning
                >
                  {boosted
                    ? "You're in a 2× window — Claude usage is doubled right now."
                    : "You're in the standard window — Claude usage is at normal usage right now."}
                </p>
              )}
            </div>
          </Panel>

          {/* ── Today's Schedule ── */}
          <Panel>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Today's Schedule</SectionLabel>

                {/* TZ selector — switching this updates clock + timeline + peak */}
                <div className="relative flex items-center">
                  <select
                    value={selectedTz.tz}
                    onChange={(e) => {
                      const found = TIMEZONE_OPTIONS.find(
                        (o) => o.tz === e.target.value
                      );
                      if (found) setSelectedTz(found);
                    }}
                    className="appearance-none bg-transparent text-[10px] font-semibold uppercase tracking-widest text-zinc-500 pr-4 cursor-pointer focus:outline-none hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    aria-label="Select display timezone"
                  >
                    {TIMEZONE_OPTIONS.map((o) => (
                      <option
                        key={o.tz}
                        value={o.tz}
                        className="bg-white dark:bg-zinc-900 text-xs normal-case tracking-normal font-normal"
                      >
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-0 pointer-events-none" />
                </div>
              </div>

              {/* 24-hour bar — segments and needle both in selectedTz */}
              <div
                className="relative h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800"
                style={{ overflow: "visible" }}
                suppressHydrationWarning
              >
                {/* Clip inner boost fills to the pill shape */}
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  {segments.map((seg, i) =>
                    seg.isBoosted ? (
                      <div
                        key={i}
                        className="absolute top-0 h-full bg-emerald-600 dark:bg-emerald-500"
                        style={{
                          left:  `${seg.startFrac * 100}%`,
                          width: `${(seg.endFrac - seg.startFrac) * 100}%`,
                        }}
                      />
                    ) : null
                  )}
                </div>

                {/* Needle — overflows the bar height for visibility, clipped horizontally */}
                {mounted && nowPercent !== null && (
                  <div
                    className="absolute z-20"
                    style={{
                      left: `clamp(1.5px, ${nowPercent}%, calc(100% - 1.5px))`,
                      top: "-4px",
                      bottom: "-4px",
                      width: "3px",
                      transform: "translateX(-50%)",
                    }}
                    aria-label="Current time"
                    title="Now"
                  >
                    <div className="w-full h-full rounded-full bg-white dark:bg-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.25),0_0_8px_rgba(255,255,255,0.6)]" />
                  </div>
                )}
              </div>

              {/* Hour labels */}
              <div className="flex justify-between mt-2">
                {["12a", "6a", "12p", "6p", "12a"].map((l, i) => (
                  <span key={i} className="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono">
                    {l}
                  </span>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                    2× Boost
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                    1× Normal
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-[3px] h-3.5 rounded-full bg-zinc-800 dark:bg-white" />
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                    Now
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          {/* ── Next Boost Windows ── */}
          <Panel>
            <div className="px-5 py-4">
              <SectionLabel>Next Boost Windows</SectionLabel>

              <div className="flex flex-col gap-2" suppressHydrationWarning>
                {!mounted ? (
                  [1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"
                    />
                  ))
                ) : boostDayEntries.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 py-2">
                    No upcoming boost windows in the promotion period.
                  </p>
                ) : (
                  boostDayEntries.map((entry, i) => (
                    <div
                      key={entry.dayLabel}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800"
                    >
                      {/* Index badge */}
                      <div className="w-6 h-6 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500">
                          {i + 1}
                        </span>
                      </div>

                      {/* Day label + time */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-none">
                          {entry.dayLabel}
                        </p>
                        {entry.isWeekend ? (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                            All day
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
                            {entry.fromStr}
                            {" → "}
                            {entry.toStr}
                            {entry.wrapsNextDay && (
                              <span className="text-zinc-400 dark:text-zinc-500"> (+1)</span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* 2× badge */}
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-600/10 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-600/20 dark:border-emerald-500/20 shrink-0">
                        {entry.isWeekend ? "All day 2×" : "2×"}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {mounted && upcomingWindows.length > 0 && (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-3">
                  Showing in {selectedTz.label}
                </p>
              )}
            </div>
          </Panel>

          {/* ── Alerts & Calendar ── */}
          <Panel>
            <div className="px-5 py-4">
              <SectionLabel>Alerts & Calendar</SectionLabel>

              {/* Notification toggle */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  {notificationsEnabled ? (
                    <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
                  ) : (
                    <BellOff className="w-4 h-4 text-zinc-400 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-none">
                      Live Boost Alerts
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                      Notify 5 min before a 2× window starts
                    </p>
                  </div>
                </div>

                {/* iOS toggle */}
                <button
                  onClick={toggleNotifications}
                  suppressHydrationWarning
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 shrink-0 ${
                    notificationsEnabled
                      ? "bg-emerald-600 dark:bg-emerald-500"
                      : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                  role="switch"
                  aria-checked={notificationsEnabled}
                  aria-label={
                    notificationsEnabled
                      ? "Disable boost alerts"
                      : "Enable boost alerts"
                  }
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      notificationsEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {mounted && notifPermission === "denied" && (
                <p className="text-[10px] text-amber-500 mb-3">
                  Notifications blocked. Enable them in your browser's Site
                  Settings.
                </p>
              )}

              {/* Calendar buttons — grid gives identical width + height */}
              <div className="grid grid-cols-2 gap-2">
                {mounted && firstWindow ? (
                  <a
                    href={googleCalURL(firstWindow.start, firstWindow.end)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${calBtnBase} text-zinc-700 dark:text-zinc-300`}
                  >
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    <span className="truncate">Google Calendar</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className={`${calBtnBase} text-zinc-400 cursor-not-allowed opacity-50`}
                  >
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    <span className="truncate">Google Calendar</span>
                  </button>
                )}

                <button
                  onClick={downloadICS}
                  className={`${calBtnBase} text-zinc-700 dark:text-zinc-300`}
                  aria-label="Download .ics for Apple Calendar"
                >
                  <CalendarDays className="w-4 h-4 shrink-0" />
                  <span className="truncate">Apple Calendar</span>
                </button>
              </div>

              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-3">
                Google Calendar opens your next boost window. Apple Calendar
                downloads all windows as an .ics file.
              </p>
            </div>
          </Panel>

          {/* ── FAQ ── */}
          <Panel>
            <div className="px-5 py-4">
              <SectionLabel>Quick FAQ</SectionLabel>

              <div className="divide-y divide-zinc-800/50 dark:divide-zinc-800/50">
                {[
                  {
                    q: "Who gets this promotion?",
                    a: "Free, Pro, Max, and Team plan users automatically receive the boost. Enterprise accounts are excluded.",
                  },
                  {
                    q: "Do I need to opt in?",
                    a: "No — completely automatic. Just use Claude during off-peak hours and your usage limit is doubled.",
                  },
                  {
                    q: "Does this change my billing?",
                    a: "No. It's a free capacity increase during off-peak windows. Your subscription cost stays the same.",
                  },
                  {
                    q: "Which apps does it apply to?",
                    a: "Claude.ai (web, desktop, mobile), Cowork, Claude Code, and the Excel & PowerPoint add-ins.",
                  },
                  {
                    q: "What counts as off-peak?",
                    a: "All times except 8 AM–2 PM ET on weekdays. Weekends are fully boosted — all day Saturday and Sunday.",
                  },
                  {
                    q: "What happens after March 28?",
                    a: "Usage returns to the standard rate. The promotion runs March 13–28, 2026 only.",
                  },
                ].map(({ q, a }) => (
                  <FaqItem key={q} q={q} a={a} />
                ))}
              </div>

              <a
                href="https://support.claude.com/en/articles/14063676-claude-march-2026-usage-promotion"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 uppercase tracking-widest mt-4 transition-colors"
              >
                Read full details on Claude Support
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </Panel>

          {/* ── Post-promo / V2 waitlist card ── */}
          <PostPromoCard inPeriod={inPeriod} mounted={mounted} />

          {/* ── Footer ── */}
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-500 py-10">
            Made by{" "}
            <a
              href="https://dhanushms.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-zinc-700 dark:text-zinc-300 no-underline hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
            >
              Dhanush M S
            </a>
            {" "}•{" "}
            <span className="text-zinc-400 dark:text-zinc-600 font-normal">
              Unofficial companion for Claude users
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
