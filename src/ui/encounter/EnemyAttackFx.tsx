import { motion } from "motion/react";
import type { RunState } from "../../game/run/types";
import {
  ENEMY_RETALIATION_IMPACT_MS,
  ENEMY_RETALIATION_START_MS,
  isEnemyRetaliating,
} from "./combatTiming";

interface EnemyAttackFxProps {
  run: RunState;
  reducedMotion: boolean;
}

export function EnemyAttackFx({ run, reducedMotion }: EnemyAttackFxProps) {
  const round = run.encounter?.lastRound;
  if (reducedMotion || !round || !isEnemyRetaliating(run)) return null;

  const travelDuration = (ENEMY_RETALIATION_IMPACT_MS - ENEMY_RETALIATION_START_MS) / 1_000;
  const impactDelay = ENEMY_RETALIATION_IMPACT_MS / 1_000;
  const result = round.playerDamageTaken > 0 ? `−${round.playerDamageTaken} HP` : "Blocked";

  return (
    <div
      data-testid="enemy-retaliation"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      <motion.div
        initial={{ left: "89%", top: "48%", opacity: 0, scale: 0.55, rotate: 0 }}
        animate={{
          left: ["89%", "82%", "8%"],
          top: ["48%", "45%", "4%"],
          opacity: [0, 1, 1, 0],
          scale: [0.55, 1.05, 0.35],
          rotate: [0, -12, -28],
        }}
        transition={{
          delay: ENEMY_RETALIATION_START_MS / 1_000,
          duration: travelDuration,
          times: [0, 0.18, 0.88, 1],
          ease: "easeInOut",
        }}
        className="absolute hidden size-12 -translate-x-1/2 -translate-y-1/2 place-items-center border-2 border-white bg-coral font-display text-2xl font-black text-ink lg:grid"
      >
        ⚔
      </motion.div>
      <motion.div
        initial={{ left: "50%", top: "24%", opacity: 0, scale: 0.55, rotate: 0 }}
        animate={{
          left: ["50%", "44%", "8%"],
          top: ["24%", "20%", "4%"],
          opacity: [0, 1, 1, 0],
          scale: [0.55, 1.05, 0.35],
          rotate: [0, -12, -28],
        }}
        transition={{
          delay: ENEMY_RETALIATION_START_MS / 1_000,
          duration: travelDuration,
          times: [0, 0.18, 0.88, 1],
          ease: "easeInOut",
        }}
        className="absolute grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center border-2 border-white bg-coral font-display text-xl font-black text-ink lg:hidden"
      >
        ⚔
      </motion.div>
      <motion.strong
        initial={{ opacity: 0, scale: 0.5, y: 8 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.22, 1, 0.9], y: [8, 0, -8, -14] }}
        transition={{ delay: impactDelay, duration: 0.58 }}
        className="absolute left-[8%] top-[3%] -translate-x-1/2 font-display text-2xl text-coral"
      >
        {result}
      </motion.strong>
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 0.65, 0], scale: [0, 1.5, 0.25] }}
        transition={{ delay: impactDelay, duration: 0.42 }}
        className="absolute left-[8%] top-[4%] size-12 -translate-x-1/2 -translate-y-1/2 border-2 border-coral"
      />
    </div>
  );
}
