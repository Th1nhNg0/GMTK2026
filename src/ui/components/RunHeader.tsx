import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { RELICS } from "../../content/relics";
import type { RunState } from "../../game/run/types";
import { useAudioStore } from "../../store/audioStore";
import { useUiStore } from "../../store/uiStore";
import { ENEMY_RETALIATION_IMPACT_MS, isEnemyRetaliating } from "../encounter/combatTiming";

interface RunHeaderProps {
  run: RunState;
}

export function RunHeader({ run }: RunHeaderProps) {
  const muted = useAudioStore((state) => state.muted);
  const toggleMuted = useAudioStore((state) => state.toggleMuted);
  const setInstructionsOpen = useUiStore((state) => state.setInstructionsOpen);
  const setAudioOpen = useUiStore((state) => state.setAudioOpen);
  const reducedMotion = useUiStore((state) => state.reducedMotion);
  const retaliationRound = isEnemyRetaliating(run) ? run.encounter?.lastRound : undefined;
  const retaliationKey = retaliationRound ? run.encounter?.puzzle.puzzleId : null;
  const [landedRetaliationKey, setLandedRetaliationKey] = useState<string | null>(null);
  const retaliationPending = Boolean(retaliationKey && retaliationKey !== landedRetaliationKey);
  const displayedHp = retaliationPending
    ? Math.min(run.maxHp, run.hp + (retaliationRound?.playerDamageTaken ?? 0))
    : run.hp;
  const tookDamage = (retaliationRound?.playerDamageTaken ?? 0) > 0;

  useEffect(() => {
    if (!retaliationKey || retaliationKey === landedRetaliationKey) return;
    const timeout = window.setTimeout(
      () => setLandedRetaliationKey(retaliationKey),
      reducedMotion ? 0 : ENEMY_RETALIATION_IMPACT_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [landedRetaliationKey, reducedMotion, retaliationKey]);

  return (
    <header className="sticky top-0 z-30 border-b border-parchment/30 bg-[#10100e] px-2 py-1 sm:px-4">
      <div className="mx-auto flex max-w-6xl items-stretch overflow-hidden text-xs sm:text-sm">
        <motion.div
          key={retaliationKey ?? "player-health"}
          initial={{ x: 0, scale: 1 }}
          animate={
            retaliationPending || !tookDamage
              ? { x: 0, scale: 1 }
              : { x: [0, -5, 5, -3, 0], scale: [1, 1.1, 1] }
          }
          transition={{
            delay: retaliationPending || !tookDamage ? 0 : reducedMotion ? 0 : 0.02,
            duration: reducedMotion ? 0.01 : 0.42,
          }}
          className="border-r border-parchment/20 bg-coral/10 px-2 py-2 font-bold text-coral sm:px-3"
          aria-label={`${displayedHp} of ${run.maxHp} health`}
        >
          ♥ {displayedHp}/{run.maxHp}
        </motion.div>
        {run.armor > 0 && (
          <div className="border-r border-parchment/20 px-2 py-2 font-bold text-zinc-200 sm:px-3">
            ◆ {run.armor}
          </div>
        )}
        {run.weakenedBy > 0 && (
          <div className="border-r border-parchment/20 px-2 py-2 font-bold text-red-300 sm:px-3">
            −{run.weakenedBy} next hit
          </div>
        )}
        {run.doubleNextDamage && (
          <div className="border-r border-parchment/20 px-2 py-2 font-bold text-yellow-400 sm:px-3">
            ×2 next hit
          </div>
        )}
        <div className="border-r border-parchment/20 px-2 py-2 font-bold text-gold sm:px-3">
          ● {run.currency}
        </div>
        {run.focusBonusSeconds > 0 && (
          <div className="border-r border-parchment/20 px-2 py-2 font-bold text-mint sm:px-3">
            +{run.focusBonusSeconds}s
          </div>
        )}
        {run.relicIds.length > 0 && (
          <div
            className="hidden max-w-xs truncate border-r border-parchment/20 px-3 py-2 text-mint md:block"
            title={run.relicIds
              .map((id) => RELICS.find((relic) => relic.id === id)?.name)
              .filter(Boolean)
              .join(", ")}
          >
            ◈ {run.relicIds.length} relic{run.relicIds.length === 1 ? "" : "s"}
          </div>
        )}
        <div className="ml-auto flex border-l border-parchment/20">
          <button
            className="min-h-9 min-w-9 border-r border-parchment/20 text-parchment/60 hover:bg-parchment/10 hover:text-parchment"
            onClick={() => setInstructionsOpen(true)}
            aria-label="How to play"
          >
            ?
          </button>
          <button
            className="min-h-9 min-w-9 border-r border-parchment/20 text-parchment/60 hover:bg-parchment/10 hover:text-parchment"
            onClick={toggleMuted}
            aria-label={muted ? "Unmute audio" : "Mute audio"}
          >
            {muted ? "♩̸" : "♫"}
          </button>
          <button
            className="min-h-9 min-w-9 text-parchment/60 hover:bg-parchment/10 hover:text-parchment"
            onClick={() => setAudioOpen(true)}
            aria-label="Audio and motion settings"
          >
            ⚙
          </button>
        </div>
      </div>
    </header>
  );
}
