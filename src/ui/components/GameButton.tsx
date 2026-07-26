import type { ButtonHTMLAttributes, ReactNode } from "react";

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "quiet";
  full?: boolean;
}

const variants = {
  primary:
    "bg-gold text-ink shadow-[0_5px_0_#854d0e] hover:bg-[#facc15] active:translate-y-1 active:shadow-none",
  secondary: "bg-parchment/10 text-parchment ring-1 ring-parchment/20 hover:bg-parchment/16",
  danger:
    "bg-coral text-ink shadow-[0_5px_0_#991b1b] hover:bg-[#fca5a5] active:translate-y-1 active:shadow-none",
  quiet: "bg-transparent text-parchment/70 hover:bg-parchment/8 hover:text-parchment",
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
      className={`min-h-11 rounded-xl px-5 py-3 font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
