import { ReactNode } from "react";

interface SectionShellProps {
  id?: string;
  children: ReactNode;
  className?: string;
}

export default function SectionShell({ id, children, className = "" }: SectionShellProps) {
  return (
    <section
      id={id}
      className={[
        "w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}
