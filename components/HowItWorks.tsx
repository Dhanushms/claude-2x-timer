import Card from "@/components/ui/Card";
import SectionShell from "@/components/ui/SectionShell";

const cards = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    iconBg: "bg-violet-500/15 text-violet-400",
    title: "What's the promotion?",
    body: (
      <>
        From <strong className="text-white/90">March 13–28, 2026</strong>, your usage is doubled during off-peak weekday hours — specifically any time{" "}
        <em>outside</em> the 8 AM–2 PM ET / 5–11 AM PT / 12–6 PM GMT window. Weekends are also fully boosted.{" "}
        No opt-in needed; it applies automatically.
      </>
    ),
    tag: "March 13–28",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    iconBg: "bg-blue-500/15 text-blue-400",
    title: "Who's eligible?",
    body: (
      <>
        The boost applies to{" "}
        <strong className="text-white/90">Free, Pro, Max, and Team</strong> plans. Enterprise accounts are excluded. The extra usage granted during off-peak hours{" "}
        <strong className="text-white/90">doesn't count against your weekly limits</strong>, and there's no billing impact whatsoever.
      </>
    ),
    tag: "Free · Pro · Max · Team",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    iconBg: "bg-emerald-500/15 text-emerald-400",
    title: "Where it applies?",
    body: (
      <>
        The doubled usage covers every major Claude surface:{" "}
        <strong className="text-white/90">Claude web, desktop & mobile apps</strong>, Cowork, Claude Code, Claude for Excel, and Claude for PowerPoint. One promo, everywhere you work.
      </>
    ),
    tag: "All surfaces",
  },
];

export default function HowItWorks() {
  return (
    <SectionShell id="how-it-works">
      {/* Label */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 max-w-8 bg-white/10" />
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-white/40">
          The offer
        </span>
        <div className="h-px flex-1 max-w-8 bg-white/10" />
      </div>

      <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-center mb-4 gradient-text">
        How it works
      </h2>
      <p className="text-center text-white/50 text-lg max-w-xl mx-auto mb-14">
        Everything you need to know about the March 2026 promotion — in plain English.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Card key={card.title} className="flex flex-col gap-5">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.iconBg}`}>
              {card.icon}
            </div>

            {/* Title */}
            <h3 className="font-display font-bold text-xl text-white">{card.title}</h3>

            {/* Body */}
            <p className="text-white/60 leading-relaxed text-sm sm:text-base flex-1">{card.body}</p>

            {/* Tag */}
            <div className="pt-4 border-t border-white/5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 bg-white/5 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                {card.tag}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}
