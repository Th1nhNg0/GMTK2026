import type { ReactNode } from "react";

interface ScreenFrameProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  narrow?: boolean;
}

export function ScreenFrame({ eyebrow, title, description, children, narrow }: ScreenFrameProps) {
  return (
    <section
      className={`mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden ${narrow ? "max-w-3xl" : "max-w-6xl"} px-3 py-3 sm:px-5 sm:py-4`}
    >
      <header className="mb-3 shrink-0 border-b border-parchment/25 pb-3 text-left">
        {eyebrow && (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gold">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-bold uppercase leading-none sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-parchment/60 sm:text-sm">
            {description}
          </p>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}
