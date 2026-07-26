import * as Dialog from "@radix-ui/react-dialog";
import { GameButton } from "./GameButton";
import { useAudioStore } from "../../store/audioStore";
import { useUiStore } from "../../store/uiStore";

function DialogShell({ children }: { children: React.ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-parchment/15 bg-panel p-6 shadow-2xl focus:outline-none sm:p-8">
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export function GlobalDialogs() {
  const instructionsOpen = useUiStore((state) => state.instructionsOpen);
  const setInstructionsOpen = useUiStore((state) => state.setInstructionsOpen);
  const audioOpen = useUiStore((state) => state.audioOpen);
  const setAudioOpen = useUiStore((state) => state.setAudioOpen);
  const reducedMotion = useUiStore((state) => state.reducedMotion);
  const setReducedMotion = useUiStore((state) => state.setReducedMotion);
  const audio = useAudioStore();

  return (
    <>
      <Dialog.Root open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogShell>
          <Dialog.Title className="font-display text-3xl font-black">Rules of play</Dialog.Title>
          <Dialog.Description className="mt-2 text-parchment/65">
            Build a result as close to the target as possible before the 45-second timer expires.
          </Dialog.Description>
          <ol className="mt-6 space-y-3 text-sm leading-relaxed text-parchment/85">
            <li>
              <strong className="text-gold">1.</strong> Select two available number tiles. Selection
              order matters for − and ÷.
            </li>
            <li>
              <strong className="text-gold">2.</strong> Choose +, −, ×, or ÷. The equation resolves
              as soon as all three choices are ready.
            </li>
            <li>
              <strong className="text-gold">3.</strong> The inputs are consumed and their result
              becomes a new tile.
            </li>
            <li>
              <strong className="text-gold">4.</strong> Reuse result tiles from their equation rows,
              then submit your closest answer—or hit the target exactly to finish instantly.
            </li>
          </ol>
          <div className="mt-5 rounded-xl bg-ink/45 p-4 text-sm text-parchment/70">
            Exact = 10 damage · within 5 = 7 · within 10 = 5. Only positive whole-number results are
            legal.
          </div>
          <Dialog.Close asChild>
            <GameButton className="mt-6" full>
              Got it
            </GameButton>
          </Dialog.Close>
        </DialogShell>
      </Dialog.Root>

      <Dialog.Root open={audioOpen} onOpenChange={setAudioOpen}>
        <DialogShell>
          <Dialog.Title className="font-display text-3xl font-black">Session settings</Dialog.Title>
          <Dialog.Description className="mt-2 text-parchment/65">
            These preferences reset when the page closes or refreshes.
          </Dialog.Description>
          <div className="mt-6 space-y-5">
            {[
              ["Master", audio.masterVolume, audio.setMasterVolume],
              ["Music", audio.musicVolume, audio.setMusicVolume],
              ["Effects", audio.sfxVolume, audio.setSfxVolume],
            ].map(([label, value, setter]) => (
              <label className="grid gap-2" key={label as string}>
                <span className="flex justify-between font-bold">
                  <span>{label as string}</span>
                  <span>{Math.round((value as number) * 100)}%</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={value as number}
                  onChange={(event) =>
                    (setter as (value: number) => void)(Number(event.target.value))
                  }
                  className="accent-gold"
                />
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-3 rounded-xl bg-ink/45 px-4 py-3 font-bold">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(event) => setReducedMotion(event.target.checked)}
                className="h-5 w-5 accent-gold"
              />
              Reduce motion for this session
            </label>
          </div>
          <Dialog.Close asChild>
            <GameButton className="mt-6" full>
              Done
            </GameButton>
          </Dialog.Close>
        </DialogShell>
      </Dialog.Root>
    </>
  );
}
