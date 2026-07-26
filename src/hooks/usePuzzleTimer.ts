import { useEffect, useEffectEvent, useRef, useState } from "react";
import { BALANCE } from "../content/balance";

interface PuzzleTimerOptions {
  bonusSeconds: number;
  active: boolean;
  paused: boolean;
  timeScale?: number;
  onTimeout: () => void;
  onWarning: (seconds: number) => void;
}

export function usePuzzleTimer({
  bonusSeconds,
  active,
  paused,
  timeScale = 1,
  onTimeout,
  onWarning,
}: PuzzleTimerOptions): number {
  const [remaining, setRemaining] = useState(BALANCE.puzzleSeconds + bonusSeconds);
  const startedAt = useRef<number | null>(null);
  const pausedAt = useRef<number | null>(null);
  const pausedDuration = useRef(0);
  const timedOut = useRef(false);
  const warnedAt = useRef(new Set<number>());
  const handleTimeout = useEffectEvent(onTimeout);
  const handleWarning = useEffectEvent(onWarning);

  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

  useEffect(() => {
    if (!active) return;
    if (paused && pausedAt.current === null) pausedAt.current = performance.now();
    if (!paused && pausedAt.current !== null) {
      pausedDuration.current += performance.now() - pausedAt.current;
      pausedAt.current = null;
    }
  }, [active, paused]);

  useEffect(() => {
    if (!active) return;
    const update = () => {
      const now = pausedAt.current ?? performance.now();
      const elapsed =
        ((now - (startedAt.current ?? now) - pausedDuration.current) / 1000) * timeScale;
      const next = Math.max(0, BALANCE.puzzleSeconds + bonusSeconds - elapsed);
      setRemaining(next);
      const rounded = Math.ceil(next);
      if ((rounded === 10 || rounded === 5) && !warnedAt.current.has(rounded)) {
        warnedAt.current.add(rounded);
        handleWarning(rounded);
      }
      if (next <= 0 && !timedOut.current) {
        timedOut.current = true;
        handleTimeout();
      }
    };
    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [active, bonusSeconds, timeScale]);

  return remaining;
}
