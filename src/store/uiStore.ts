import { create } from "zustand";

interface UiStore {
  consumableDialogSlot: number | null;
  instructionsOpen: boolean;
  audioOpen: boolean;
  reducedMotion: boolean;
  debugTimerScale: number;
  setConsumableDialogSlot: (slot: number | null) => void;
  setInstructionsOpen: (open: boolean) => void;
  setAudioOpen: (open: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setDebugTimerScale: (scale: number) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  consumableDialogSlot: null,
  instructionsOpen: false,
  audioOpen: false,
  reducedMotion: false,
  debugTimerScale: 1,
  setConsumableDialogSlot: (consumableDialogSlot) => set({ consumableDialogSlot }),
  setInstructionsOpen: (instructionsOpen) => set({ instructionsOpen }),
  setAudioOpen: (audioOpen) => set({ audioOpen }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setDebugTimerScale: (debugTimerScale) => set({ debugTimerScale }),
}));
