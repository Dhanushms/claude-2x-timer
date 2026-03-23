"use client";
import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section
      className="relative w-full min-h-[100svh] flex flex-col items-center justify-center overflow-hidden"
      aria-label="Hero"
    >
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-hero-gradient"
        aria-hidden
      />
      {/* Noise texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      {/* Floating orbs */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-15 blur-3xl"
        style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 max-w-5xl mx-auto gap-6">
        {/* 2x glow pill */}
        <div
          className="animate-float inline-flex items-center gap-2 px-5 py-2.5 rounded-full shimmer-bg glow-violet text-white font-display font-extrabold text-5xl sm:text-7xl md:text-8xl shadow-2xl mb-2"
          aria-label="2x boost"
        >
          2×
        </div>

        {/* Headline */}
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.07] tracking-tight text-balance">
          <span className="gradient-text">Get 2x More Claude</span>
          <br />
          <span className="text-white/90">in March 2026</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl md:text-2xl text-white/55 max-w-2xl leading-relaxed text-balance">
          From <strong className="text-white/80">March 13–28</strong>, your five-hour
          usage is doubled during off-peak weekday hours — with no change during
          the standard window of{" "}
          <strong className="text-white/80">8 AM–2 PM ET / 5–11 AM PT / 12–6 PM GMT</strong>.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Button
            size="lg"
            variant="primary"
            onClick={() => {
              document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" });
            }}
            aria-label="See your boost windows"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
            See your boost windows
          </Button>
          <Button
            size="lg"
            variant="secondary"
            href="https://support.claude.com/en/articles/14063676-claude-march-2026-usage-promotion"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Read the full promo details"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Read the full promo details
          </Button>
        </div>

        {/* Mock planner card */}
        <MockPlannerCard />
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 animate-bounce" aria-hidden>
        <span className="text-xs tracking-widest uppercase font-medium">Scroll</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

function MockPlannerCard() {
  return (
    <div
      className="mt-6 glass rounded-3xl p-5 w-full max-w-sm shadow-card animate-float"
      style={{ animationDelay: "1.5s" }}
      aria-label="Example boost schedule card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 glow-green" />
          <span className="text-sm font-semibold text-white/80">Boost active now</span>
        </div>
        <span className="text-xs text-white/40 font-mono">2x UNLOCKED</span>
      </div>

      {/* Fake timeline bars */}
      <div className="space-y-2">
        {[
          { label: "12 AM", boost: true, w: "w-full" },
          { label: "6 AM",  boost: true, w: "w-3/4" },
          { label: "12 PM", boost: false, w: "w-full" },
          { label: "6 PM",  boost: true, w: "w-full" },
        ].map(({ label, boost, w }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-white/30 w-10 shrink-0 font-mono">{label}</span>
            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full ${boost ? "boost-bar" : "bg-white/10"} ${w}`}
              />
            </div>
            {boost && (
              <span className="text-xs text-violet-400 font-bold shrink-0">2×</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-white/40">March 13–28, 2026</span>
        <span className="text-xs font-semibold text-emerald-400">Free · Pro · Max · Team</span>
      </div>
    </div>
  );
}
