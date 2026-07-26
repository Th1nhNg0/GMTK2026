import { useEffect, useRef } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { audioManager } from "../audio/AudioManager";
import type { SoundEvent } from "../audio/soundEvents";
import type { GameEffect } from "../game/effects";
import { useGameStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import { GlobalDialogs } from "../ui/components/GlobalDialogs";
import { DebugPanel } from "../ui/components/DebugPanel";
import { RunHeader } from "../ui/components/RunHeader";
import { EnemyAttackFx } from "../ui/encounter/EnemyAttackFx";
import { ENEMY_RETALIATION_IMPACT_MS, PLAYER_ATTACK_IMPACT_MS } from "../ui/encounter/combatTiming";
import { ScreenRouter } from "./ScreenRouter";

function soundForEffect(effect: GameEffect): SoundEvent | undefined {
  if (effect.type === "INVALID_ACTION") return "invalid-operation";
  if (effect.type === "OPERATION_CREATED") return "valid-operation";
  if (effect.type === "OPERATION_UNDONE") return "undo";
  if (effect.type === "PUZZLE_RESOLVED")
    return effect.resolution.reason === "exact" ? "exact-hit" : "submit";
  if (effect.type === "ENEMY_DAMAGED") return "enemy-damaged";
  if (effect.type === "PLAYER_DAMAGED") return "player-damaged";
  if (effect.type === "REWARD_GAINED") return "reward-selected";
  if (effect.type === "SHOP_PURCHASED") return "shop-purchase";
  return undefined;
}

export function App() {
  const game = useGameStore((state) => state.game);
  const effects = useGameStore((state) => state.effects);
  const effectSequence = useGameStore((state) => state.effectSequence);
  const announcement = useGameStore((state) => state.announcement);
  const reducedMotion = useUiStore((state) => state.reducedMotion);
  const previousScreen = useRef(game.screen);

  useEffect(() => {
    const timers: number[] = [];
    for (const effect of effects) {
      const sound = soundForEffect(effect);
      if (!sound) continue;
      if (effect.type === "ENEMY_DAMAGED" && !reducedMotion) {
        timers.push(window.setTimeout(() => audioManager.play(sound), PLAYER_ATTACK_IMPACT_MS));
      } else if (effect.type === "PLAYER_DAMAGED" && !reducedMotion) {
        timers.push(window.setTimeout(() => audioManager.play(sound), ENEMY_RETALIATION_IMPACT_MS));
      } else {
        audioManager.play(sound);
      }
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [effectSequence, effects, reducedMotion]);

  useEffect(() => {
    if (previousScreen.current !== game.screen) {
      window.scrollTo(0, 0);
      if (game.screen === "victory") audioManager.play("victory");
      if (game.screen === "defeat") audioManager.play("defeat");
      previousScreen.current = game.screen;
    }
  }, [game.screen]);

  const showRunHeader = Boolean(game.run && !["title", "victory", "defeat"].includes(game.screen));

  useEffect(() => {
    audioManager.setMusicActive(showRunHeader);
  }, [showRunHeader]);

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
      <div
        className="flex h-dvh flex-col overflow-hidden bg-ink text-parchment"
        onPointerDownCapture={() => void audioManager.unlock()}
      >
        {showRunHeader && game.run && <RunHeader run={game.run} />}
        {game.screen === "encounter" && game.run && (
          <EnemyAttackFx run={game.run} reducedMotion={reducedMotion} />
        )}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={game.screen}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.18 }}
            className="min-h-0 flex-1 overflow-hidden"
          >
            <ScreenRouter game={game} />
          </motion.div>
        </AnimatePresence>
        <GlobalDialogs />
        {import.meta.env.DEV && game.run && <DebugPanel />}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
      </div>
    </MotionConfig>
  );
}
