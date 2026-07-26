import { RELICS } from "../../content/relics";
import type { RunState } from "../../game/run/types";
import { useAudioStore } from "../../store/audioStore";
import { useUiStore } from "../../store/uiStore";

interface RunHeaderProps {
  run: RunState;
}

export function RunHeader({ run }: RunHeaderProps) {
  const muted = useAudioStore((state) => state.muted);
  const toggleMuted = useAudioStore((state) => state.toggleMuted);
  const setInstructionsOpen = useUiStore((state) => state.setInstructionsOpen);
  const setAudioOpen = useUiStore((state) => state.setAudioOpen);

  return (
    <header className="sticky top-0 z-30 border-b border-parchment/10 bg-ink/92 px-3 py-2 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 text-sm">
        <div
          className="rounded-lg bg-coral/15 px-3 py-2 font-black text-coral"
          aria-label={`${run.hp} of ${run.maxHp} health`}
        >
          ♥ {run.hp}/{run.maxHp}
        </div>
        {run.armor > 0 && (
          <div className="rounded-lg bg-white/10 px-3 py-2 font-black text-zinc-200">
            ◆ {run.armor}
          </div>
        )}
        {run.weakenedBy > 0 && (
          <div className="rounded-lg bg-red-400/12 px-3 py-2 font-black text-red-300">
            −{run.weakenedBy} next hit
          </div>
        )}
        {run.doubleNextDamage && (
          <div className="rounded-lg bg-yellow-500/12 px-3 py-2 font-black text-yellow-400">
            ×2 next hit
          </div>
        )}
        <div className="rounded-lg bg-gold/12 px-3 py-2 font-black text-gold">● {run.currency}</div>
        {run.focusBonusSeconds > 0 && (
          <div className="rounded-lg bg-mint/10 px-3 py-2 font-black text-mint">
            +{run.focusBonusSeconds}s
          </div>
        )}
        {run.relicIds.length > 0 && (
          <div
            className="hidden max-w-xs truncate rounded-lg bg-mint/10 px-3 py-2 text-mint md:block"
            title={run.relicIds
              .map((id) => RELICS.find((relic) => relic.id === id)?.name)
              .filter(Boolean)
              .join(", ")}
          >
            ◈ {run.relicIds.length} relic{run.relicIds.length === 1 ? "" : "s"}
          </div>
        )}
        <div className="ml-auto flex gap-1">
          <button
            className="min-h-11 min-w-11 rounded-lg text-parchment/70 hover:bg-parchment/10 hover:text-parchment"
            onClick={() => setInstructionsOpen(true)}
            aria-label="How to play"
          >
            ?
          </button>
          <button
            className="min-h-11 min-w-11 rounded-lg text-parchment/70 hover:bg-parchment/10 hover:text-parchment"
            onClick={toggleMuted}
            aria-label={muted ? "Unmute audio" : "Mute audio"}
          >
            {muted ? "♩̸" : "♫"}
          </button>
          <button
            className="min-h-11 min-w-11 rounded-lg text-parchment/70 hover:bg-parchment/10 hover:text-parchment"
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
