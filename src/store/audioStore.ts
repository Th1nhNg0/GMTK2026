import { create } from "zustand";
import { audioManager } from "../audio/AudioManager";

interface AudioStore {
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  toggleMuted: () => void;
  setMasterVolume: (value: number) => void;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  muted: false,
  masterVolume: 0.7,
  musicVolume: 0.35,
  sfxVolume: 0.75,
  toggleMuted: () => {
    const muted = !get().muted;
    audioManager.setMuted(muted);
    set({ muted });
  },
  setMasterVolume: (masterVolume) => {
    audioManager.setMasterVolume(masterVolume);
    set({ masterVolume });
  },
  setMusicVolume: (musicVolume) => {
    audioManager.setMusicVolume(musicVolume);
    set({ musicVolume });
  },
  setSfxVolume: (sfxVolume) => {
    audioManager.setSfxVolume(sfxVolume);
    set({ sfxVolume });
  },
}));
