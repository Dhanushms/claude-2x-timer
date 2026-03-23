"use client";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  target?: string;
  rel?: string;
  as?: "button" | "a";
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-violet-600 to-blue-500 text-white hover:from-violet-500 hover:to-blue-400 glow-violet active:scale-[0.98] shadow-lg",
  secondary:
    "glass text-white/90 hover:text-white hover:border-white/20 active:scale-[0.98]",
  ghost:
    "text-white/60 hover:text-white hover:bg-white/5 active:scale-[0.98]",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2 text-sm rounded-xl",
  md: "px-6 py-3 text-base rounded-2xl",
  lg: "px-8 py-4 text-lg rounded-2xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", href, target, rel, as: Tag = "button", className = "", children, ...props }, ref) => {
    const cls = [
      "inline-flex items-center justify-center gap-2 font-semibold",
      "transition-all duration-200 ease-out cursor-pointer select-none",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
      variantClasses[variant],
      sizeClasses[size],
      className,
    ].join(" ");

    if (href) {
      return (
        <a href={href} target={target} rel={rel} className={cls} aria-label={props["aria-label"]}>
          {children}
        </a>
      );
    }

    return (
      <button ref={ref} className={cls} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
