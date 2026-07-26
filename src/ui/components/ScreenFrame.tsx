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
      className={`mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden ${narrow ? "max-w-3xl" : "max-w-6xl"} px-4 py-3 sm:px-6 sm:py-6`}
    >
      <header className="mb-4 shrink-0 text-center sm:mb-6">
        {eyebrow && (
          <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
        {description && (
          <p className="mx-auto mt-2 max-w-2xl text-sm text-parchment/65 sm:mt-3 sm:text-base">
            {description}
          </p>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}
