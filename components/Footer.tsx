export default function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.06] py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl shimmer-bg flex items-center justify-center shadow-glow-sm">
            <span className="text-xs font-extrabold text-white">2×</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/70">
              Made by{" "}
              <span className="text-white/90">Dhanush M S</span>
              {" · "}
              <span className="text-white/70">Bysomeone Design Studio</span>
            </p>
            <p className="text-xs text-white/30 mt-0.5">
              Unofficial companion for Claude Pro users
            </p>
          </div>
        </div>

        {/* Right: disclaimer + link */}
        <div className="flex flex-col items-center sm:items-end gap-1">
          <a
            href="https://support.claude.com/en/articles/14063676-claude-march-2026-usage-promotion"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/30 hover:text-white/60 transition-colors duration-200 flex items-center gap-1"
          >
            Official Claude Support article
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <p className="text-xs text-white/20 text-center sm:text-right">
            Not affiliated with Anthropic · Facts sourced from official support docs
          </p>
        </div>
      </div>
    </footer>
  );
}
