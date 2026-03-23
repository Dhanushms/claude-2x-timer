"use client";

import { useState } from "react";
import SectionShell from "@/components/ui/SectionShell";

const faqs = [
  {
    q: "Who gets the 2× boost?",
    a: "All Free, Pro, Max, and Team plan users automatically receive the doubled usage during off-peak hours. Enterprise accounts are excluded from this promotion.",
  },
  {
    q: "Do I need to opt in or change any settings?",
    a: "No. The promotion applies automatically to your account — nothing to toggle, no codes to enter, no settings to change. Just use Claude as you normally would during off-peak hours.",
  },
  {
    q: "Does this change my billing or subscription?",
    a: "Not at all. There is no billing impact, and the additional usage granted during off-peak hours doesn't count toward your weekly usage limits. Your plan price stays the same.",
  },
  {
    q: "What exactly happens after March 28?",
    a: "Standard usage limits resume on March 29. No credits carry over, the promo cannot be combined with other offers, and there is no cash value. Everything simply returns to normal.",
  },
  {
    q: "Which apps and surfaces are covered?",
    a: "The 2× boost applies to Claude on web, desktop, and mobile; Cowork; Claude Code; Claude for Excel; and Claude for PowerPoint. All first-party Claude surfaces are included.",
  },
  {
    q: "Does the boost apply on weekends?",
    a: "Yes. The peak (normal-speed) window of 8 AM–2 PM ET applies only on weekdays. Weekends during March 13–28 are fully boosted all day.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <SectionShell id="faq">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 max-w-8 bg-white/10" />
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-white/40">
          Questions
        </span>
        <div className="h-px flex-1 max-w-8 bg-white/10" />
      </div>

      <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-center mb-4 gradient-text">
        Frequently asked
      </h2>
      <p className="text-center text-white/50 text-base max-w-xl mx-auto mb-12">
        Everything else you might be wondering about the March 2026 promotion.
      </p>

      <div className="max-w-2xl mx-auto space-y-3">
        {faqs.map((faq, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className={[
                "rounded-2xl hairline transition-all duration-200 overflow-hidden",
                isOpen ? "bg-surface-3" : "bg-surface-2 hover:bg-surface-3/50",
              ].join(" ")}
            >
              <button
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 cursor-pointer"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${i}`}
              >
                <span className="font-semibold text-white/90 text-base leading-snug pr-2">
                  {faq.q}
                </span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                    isOpen
                      ? "bg-violet-500/20 text-violet-400 rotate-180"
                      : "bg-white/5 text-white/40"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <div
                id={`faq-answer-${i}`}
                className={`transition-all duration-300 ease-out overflow-hidden ${
                  isOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                }`}
                aria-hidden={!isOpen}
              >
                <p className="px-6 pb-5 text-white/55 leading-relaxed text-sm sm:text-base">
                  {faq.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Source link */}
      <div className="flex justify-center mt-10">
        <a
          href="https://support.claude.com/en/articles/14063676-claude-march-2026-usage-promotion"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors duration-200 group"
          aria-label="Read the full details on Claude Support"
        >
          Read the full details on Claude Support
          <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </SectionShell>
  );
}
