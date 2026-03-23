import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export default function Card({ children, className = "", glow = false }: CardProps) {
  return (
    <div
      className={[
        "relative rounded-3xl p-6 md:p-8",
        "bg-surface-2 hairline",
        "transition-all duration-300 ease-out",
        "hover:hairline-hover hover:-translate-y-0.5",
        "shadow-card hover:shadow-card-hover",
        glow ? "hover:glow-violet" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
