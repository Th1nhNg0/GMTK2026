import type { ButtonHTMLAttributes, ReactNode } from "react";

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "quiet";
  full?: boolean;
}

const variants = {
  primary: "border border-[#dfc77f] bg-gold text-ink hover:bg-[#d8bb6d] active:bg-[#ad8d43]",
  secondary:
    "border border-parchment/30 bg-panel text-parchment hover:border-parchment/60 hover:bg-[#24231f]",
  danger: "border border-coral bg-[#6f3e38] text-parchment hover:bg-coral hover:text-ink",
  quiet:
    "border border-transparent bg-transparent text-parchment/65 hover:border-parchment/25 hover:text-parchment",
};

export function GameButton({
  children,
  className = "",
  variant = "primary",
  full = false,
  ...props
}: GameButtonProps) {
  return (
    <button
      className={`min-h-10 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
