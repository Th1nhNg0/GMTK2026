import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { BALANCE } from "../../content/balance";
import { CONSUMABLES } from "../../content/consumables";
import { ENEMIES } from "../../content/enemies";
import { getBaseDamage } from "../../game/puzzle/scoring";
import type { NumberTile, Operator } from "../../game/puzzle/types";
import type { RunState } from "../../game/run/types";
import { usePuzzleTimer } from "../../hooks/usePuzzleTimer";
import { audioManager } from "../../audio/AudioManager";
import { useGameStore } from "../../store/gameStore";
import { useUiStore } from "../../store/uiStore";
import { GameButton } from "../components/GameButton";
import {
  ENEMY_RETALIATION_RESOLUTION_MS,
  ENEMY_RETALIATION_START_MS,
  REDUCED_MOTION_RESOLUTION_MS,
  STANDARD_RESOLUTION_MS,
  isEnemyRetaliating,
} from "./combatTiming";

const OPERATORS: Array<{ value: Operator; symbol: string; key: string; name: string }> = [
  { value: "add", symbol: "+", key: "+", name: "add" },
  { value: "subtract", symbol: "−", key: "-", name: "subtract" },
  { value: "multiply", symbol: "×", key: "*", name: "multiply" },
  { value: "divide", symbol: "÷", key: "/", name: "divide" },
];

const ENEMY_PORTRAITS: Record<string, string> = {
  sumslinger: "sumslinger.png",
  "ledger-wisp": "ledger-wisp.png",
  "divide-hydra": "divide-hydra.png",
  "clockwork-adder": "clockwork-adder.png",
  "prime-warden": "prime-warden.png",
  "compound-golem": "compound-golem.png",
  "final-examiner": "final-examiner.png",
};

function enemyPortraitUrl(enemyId: string): string {
  const filename = ENEMY_PORTRAITS[enemyId] ?? ENEMY_PORTRAITS.sumslinger;
  return `${import.meta.env.BASE_URL}assets/enemies/${filename}`;
}

function intentGlyph(type: string): string {
  if (type === "attack") return "⚔";
  if (type === "defend") return "◆";
  if (type === "heal") return "+";
  return "↓";
}

function operatorSymbol(operator: Operator): string {
  return OPERATORS.find((candidate) => candidate.value === operator)?.symbol ?? "?";
}

function accuracyTier(distance?: number): string {
  if (distance === undefined) return "No answer";
  if (distance === 0) return "Exact";
  return `Off by ${distance}`;
}

function DamageGuide() {
  const tiers = [
    ["Exact", "10"],
    ["1–5 off", "7"],
    ["6–10 off", "5"],
    ["11+ off", "0"],
  ];

  return (
    <section
      aria-label="Damage guide"
      className="mt-2 border border-gold/25 bg-[#171611] p-2 lg:mt-3 lg:p-3"
    >
      <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-gold lg:text-[10px]">
        Accuracy → base power
      </p>
      <div className="space-y-1">
        {tiers.map(([label, damage]) => (
          <div
            key={label}
            className="flex items-center justify-between border border-parchment/10 bg-ink/40 px-2 py-1.5"
          >
            <span className="text-[8px] font-bold text-parchment/55 lg:text-[9px]">
              {label}
            </span>
            <strong className="text-xs text-gold lg:text-sm">{damage}</strong>
          </div>
        ))}
      </div>
      <p className="mt-2 hidden text-[9px] leading-snug text-parchment/50 lg:block">
        Base ± bonuses = attack power. Enemy armor then reduces actual HP lost.
      </p>
    </section>
  );
}

function HealthBar({
  value,
  max,
  color = "bg-coral",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const percentage = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className="h-2.5 overflow-hidden border border-parchment/15 bg-ink/70"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
    >
      <motion.div className={`h-full ${color}`} animate={{ width: `${percentage}%` }} />
    </div>
  );
}

function PuzzleTimer({ run, paused }: { run: RunState; paused: boolean }) {
  const encounter = run.encounter!;
  const dispatch = useGameStore((state) => state.dispatch);
  const [warning, setWarning] = useState("");
  const timeScale = useUiStore((state) => state.debugTimerScale);
  const timerActive = encounter.status === "puzzle" && encounter.puzzle.status === "active";
  const remaining = usePuzzleTimer({
    bonusSeconds: encounter.puzzle.timeBonusSeconds,
    active: timerActive,
    paused,
    timeScale,
    onTimeout: () =>
      dispatch({ type: "PUZZLE_ACTION", action: { type: "RESULT_SUBMITTED", reason: "timeout" } }),
    onWarning: (seconds) => {
      setWarning(`${seconds} seconds remaining`);
      audioManager.play("timer-warning");
    },
  });
  const total = BALANCE.puzzleSeconds + encounter.puzzle.timeBonusSeconds;
  const urgent = remaining <= 10;

  if (!timerActive) {
    return (
      <div className="font-display text-xl font-black text-mint" aria-label="Puzzle resolved">
        Done
      </div>
    );
  }

  return (
    <div className="min-w-24" aria-label={`${Math.ceil(remaining)} seconds remaining`}>
      <div
        className={`font-display text-3xl font-black tabular-nums ${urgent ? "text-coral" : "text-parchment"}`}
      >
        {paused ? "Ⅱ" : Math.ceil(remaining)}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden border border-parchment/15 bg-ink/70">
        <div
          className={`h-full transition-[width] duration-100 ${urgent ? "bg-coral" : "bg-gold"}`}
          style={{ width: `${(remaining / total) * 100}%` }}
        />
      </div>
      <span className="sr-only" aria-live="assertive">
        {warning}
      </span>
    </div>
  );
}

function ConsumableTray({ run }: { run: RunState }) {
  const dialogSlot = useUiStore((state) => state.consumableDialogSlot);
  const setDialogSlot = useUiStore((state) => state.setConsumableDialogSlot);
  const dispatch = useGameStore((state) => state.dispatch);
  const selectedId = dialogSlot === null ? null : run.consumableSlots[dialogSlot];
  const selected = CONSUMABLES.find((item) => item.id === selectedId);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1" aria-label="Consumables">
        {run.consumableSlots.map((consumableId, index) => {
          const consumable = CONSUMABLES.find((item) => item.id === consumableId);
          return (
            <button
              key={index}
              disabled={!consumable || run.encounter?.status !== "puzzle"}
              onClick={() => setDialogSlot(index)}
              className="flex min-h-16 min-w-0 flex-col items-center justify-center border border-parchment/15 bg-ink/40 px-1.5 py-2 text-[10px] font-bold leading-tight text-parchment/70 transition-colors hover:border-mint hover:text-mint disabled:opacity-30 sm:text-xs lg:min-h-11 lg:flex-row lg:justify-start lg:gap-2 lg:px-3 lg:text-left"
              aria-label={
                consumable ? `Use ${consumable.name}` : `Empty consumable slot ${index + 1}`
              }
            >
              <span className="shrink-0 text-lg" aria-hidden="true">
                {consumable ? "▣" : "—"}
              </span>
              <span className="min-w-0 whitespace-normal break-words">
                {consumable?.name ?? "Empty"}
              </span>
            </button>
          );
        })}
      </div>
      <Dialog.Root open={dialogSlot !== null} onOpenChange={(open) => !open && setDialogSlot(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 border border-mint/40 bg-panel p-5 focus:outline-none">
            <Dialog.Title className="font-display text-3xl font-black">
              {selected?.name ?? "Empty slot"}
            </Dialog.Title>
            <Dialog.Description className="mt-3 text-parchment/65">
              {selected?.description ?? "There is nothing to use here."}
            </Dialog.Description>
            <p className="mt-4 border border-mint/20 bg-mint/10 px-3 py-2 text-sm font-bold text-mint">
              Timer paused while this dialog is open.
            </p>
            <div className="mt-6 flex gap-3">
              <Dialog.Close asChild>
                <GameButton variant="quiet" className="flex-1">
                  Cancel
                </GameButton>
              </Dialog.Close>
              <GameButton
                className="flex-1"
                disabled={!selected || dialogSlot === null}
                onClick={() => {
                  if (dialogSlot !== null)
                    dispatch({ type: "CONSUMABLE_USED", slotIndex: dialogSlot });
                  setDialogSlot(null);
                }}
              >
                Use now
              </GameButton>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function RoundResolution({ run }: { run: RunState }) {
  const encounter = run.encounter!;
  const round = encounter.lastRound;
  const dispatch = useGameStore((state) => state.dispatch);
  if (!round) return null;
  const won = encounter.status === "won";
  const submitted = round.resolution.submittedValue;
  const distance = round.resolution.distance;
  const baseDamage = round.resolution.baseDamage;
  const modifier = round.damageDealt - baseDamage;
  const afterArmor = round.damageDealt - round.armorBlocked;
  const outcome = won
    ? "Enemy defeated"
    : round.hpDamage > 0
      ? "Attack landed"
      : round.damageDealt > 0
        ? "Attack blocked"
        : "No damage";

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`border p-4 text-center sm:p-5 ${won ? "border-gold/60 bg-gold/8" : "border-parchment/25 bg-ink"}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-500 sm:text-xs">
        Puzzle {encounter.roundIndex} resolved
      </p>
      <h2 className="mt-2 font-display text-3xl font-black sm:text-4xl">{outcome}</h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="border border-parchment/20 bg-ink/70 p-2 sm:p-3">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">
            Answer
          </span>
          <strong className="mt-1 block text-xl sm:text-2xl">{submitted ?? "—"}</strong>
        </div>
        <div className="border border-parchment/20 bg-ink/70 p-2 sm:p-3">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">
            Distance
          </span>
          <strong className="mt-1 block text-xl sm:text-2xl">
            {distance === 0 ? "Exact" : (distance ?? "—")}
          </strong>
        </div>
        <div className="border border-gold/40 bg-gold/10 p-2 sm:p-3">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-yellow-500/70">
            HP lost
          </span>
          <strong className="mt-1 block text-xl text-yellow-400 sm:text-2xl">
            {round.hpDamage}
          </strong>
        </div>
      </div>
      <div
        aria-label="Damage calculation"
        className="mt-3 border border-gold/25 bg-gold/5 p-3 text-left text-xs sm:mt-4 sm:p-4 sm:text-sm"
      >
        <span className="mb-2 block text-[9px] font-black uppercase tracking-wider text-gold">
          How damage was calculated
        </span>
        <p>
          <strong>{accuracyTier(distance)}</strong> → {baseDamage} base power
        </p>
        <p className="mt-1 text-parchment/70">
          {baseDamage} base{" "}
          {modifier === 0
            ? "+ 0 modifiers"
            : modifier > 0
              ? `+ ${modifier} bonus`
              : `− ${Math.abs(modifier)} penalty`}{" "}
          = <strong className="text-white">{round.damageDealt} attack power</strong>
        </p>
        <p className="mt-1 text-parchment/70">
          {round.damageDealt} attack − {round.armorBlocked} armor = {afterArmor} available damage →{" "}
          <strong className="text-gold">{round.hpDamage} HP lost</strong>
          {round.hpDamage < afterArmor ? ` (enemy only had ${round.enemyHpBefore} HP)` : ""}
        </p>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mt-3 border border-parchment/20 bg-ink/70 p-3 text-left text-xs text-parchment/70 sm:mt-4 sm:p-4 sm:text-sm"
      >
        <span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-zinc-500">
          Enemy response
        </span>
        {round.enemyAction}
      </motion.div>
      <GameButton
        className="mt-4 sm:mt-5"
        full
        onClick={() => dispatch({ type: "ENCOUNTER_CONTINUED" })}
      >
        {won
          ? encounter.type === "boss"
            ? "Finish the run"
            : "Claim reward"
          : `Begin puzzle ${encounter.roundIndex + 1}`}
      </GameButton>
    </motion.section>
  );
}

function PuzzleProgress({ run }: { run: RunState }) {
  const encounter = run.encounter!;
  const solved = encounter.roundHistory.filter((attempt) => attempt.outcome === "solved").length;
  const partial = encounter.roundHistory.filter((attempt) => attempt.outcome === "partial").length;
  const failed = encounter.roundHistory.filter((attempt) => attempt.outcome === "failed").length;

  return (
    <div aria-label={`Puzzle ${encounter.roundIndex} of ${encounter.maxRounds}`}>
      <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-zinc-500 sm:text-[10px]">
        Opponent puzzle <span className="text-white">{encounter.roundIndex}</span> /{" "}
        {encounter.maxRounds}
      </p>
      <div className="flex items-center gap-1">
        {Array.from({ length: encounter.maxRounds }, (_, index) => {
          const puzzleNumber = index + 1;
          const attempt = encounter.roundHistory[index];
          const current = puzzleNumber === encounter.roundIndex && encounter.status === "puzzle";
          const symbol =
            attempt?.outcome === "solved"
              ? "✓"
              : attempt?.outcome === "partial"
                ? "≈"
                : attempt?.outcome === "failed"
                  ? "×"
                  : puzzleNumber;
          return (
            <span
              key={puzzleNumber}
              title={
                attempt
                  ? `Puzzle ${puzzleNumber}: ${attempt.outcome}`
                  : current
                    ? `Puzzle ${puzzleNumber}: current`
                    : `Puzzle ${puzzleNumber}: remaining`
              }
              className={`grid size-6 place-items-center border text-[9px] font-black sm:size-7 sm:text-[10px] ${attempt?.outcome === "solved" ? "border-gold bg-gold text-ink" : attempt?.outcome === "partial" ? "border-gold/50 bg-gold/10 text-gold" : attempt?.outcome === "failed" ? "border-coral/50 bg-coral/10 text-coral" : current ? "border-parchment bg-parchment text-ink" : "border-parchment/20 bg-ink text-parchment/30"}`}
            >
              {symbol}
            </span>
          );
        })}
      </div>
      <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-zinc-500 sm:text-[9px]">
        <span className="text-yellow-400">{solved} exact</span> · {partial} close ·{" "}
        <span className={failed > 0 ? "text-red-300" : undefined}>{failed} missed</span>
      </p>
    </div>
  );
}

function CombatImpact({ run }: { run: RunState }) {
  const encounter = run.encounter!;
  const round = encounter.lastRound!;
  const submitted = round.resolution.submittedValue;
  const distance = round.resolution.distance;
  const hit = round.damageDealt > 0;
  const reducedMotion = useUiStore((state) => state.reducedMotion);
  const [phase, setPhase] = useState(reducedMotion ? 3 : 0);
  const accuracy = accuracyTier(distance);
  const modifier = round.damageDealt - round.resolution.baseDamage;
  const enemyRetaliating = isEnemyRetaliating(run);

  useEffect(() => {
    if (reducedMotion) return;
    const timers = [
      window.setTimeout(() => setPhase(1), 1_150),
      window.setTimeout(() => setPhase(2), 2_050),
      window.setTimeout(() => setPhase(3), 2_850),
      ...(enemyRetaliating
        ? [window.setTimeout(() => setPhase(4), ENEMY_RETALIATION_START_MS)]
        : []),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [enemyRetaliating, reducedMotion]);

  return (
    <motion.section
      aria-label="Attack resolving"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden text-center"
    >
      <motion.p
        initial={{ opacity: 0, letterSpacing: "0.1em" }}
        animate={{ opacity: 1, letterSpacing: "0.35em" }}
        className="relative text-[10px] font-black uppercase text-yellow-500 sm:text-xs"
      >
        Attack calculation
      </motion.p>

      <div className="relative mt-3 grid w-full max-w-xl grid-cols-3 gap-1.5 sm:mt-5 sm:gap-3">
        <motion.div
          animate={{
            borderColor: phase === 0 ? "#eab308" : "#52525b",
            y: 0,
          }}
          className="border bg-ink p-2 sm:p-4"
        >
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 sm:text-[10px]">
            01 · Answer
          </span>
          <strong className="mt-2 block font-display text-3xl tabular-nums text-white sm:text-5xl">
            {submitted === undefined ? "—" : <CountUpNumber value={submitted} duration={1_050} />}
          </strong>
        </motion.div>

        <motion.div
          animate={{
            borderColor: phase === 1 ? "#eab308" : phase > 1 ? "#52525b" : "#3f3f46",
            y: 0,
            opacity: phase >= 1 ? 1 : 0.35,
          }}
          className="border bg-ink p-2 sm:p-4"
        >
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 sm:text-[10px]">
            02 · Accuracy
          </span>
          <AnimatePresence mode="wait">
            {phase >= 1 ? (
              <motion.strong
                key="accuracy"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: [0.7, 1.12, 1] }}
                className={`mt-2 block font-display text-xl uppercase sm:text-3xl ${distance === 0 ? "text-yellow-400" : "text-white"}`}
              >
                {accuracy}
              </motion.strong>
            ) : (
              <strong
                key="waiting"
                className="mt-2 block font-display text-3xl text-zinc-700 sm:text-5xl"
              >
                ?
              </strong>
            )}
          </AnimatePresence>
          <span className="mt-1 block text-[8px] text-zinc-600 sm:text-[10px]">
            {round.resolution.baseDamage} base · target {encounter.puzzle.target}
          </span>
        </motion.div>

        <motion.div
          animate={{
            borderColor: phase === 2 ? "#eab308" : phase > 2 ? "#52525b" : "#3f3f46",
            y: 0,
            opacity: phase >= 2 ? 1 : 0.35,
          }}
          className="border bg-ink p-2 sm:p-4"
        >
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 sm:text-[10px]">
            03 · Power
          </span>
          <strong
            className={`mt-2 block font-display text-3xl tabular-nums sm:text-5xl ${hit ? "text-yellow-400" : "text-zinc-600"}`}
          >
            {phase >= 2 ? <CountUpNumber value={round.damageDealt} duration={650} /> : "—"}
          </strong>
          <span className="mt-1 block text-[8px] text-zinc-600 sm:text-[10px]">
            {round.resolution.baseDamage} base {modifier >= 0 ? "+" : "−"} {Math.abs(modifier)}
          </span>
        </motion.div>
      </div>

      <div className="relative mt-3 h-1.5 w-full max-w-xl overflow-hidden border border-parchment/15 bg-ink sm:mt-5">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: phase >= 3 ? 1 : (phase + 1) / 4 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="h-full origin-left bg-yellow-500 shadow-[0_0_14px_rgba(234,179,8,0.7)]"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.strong
          key={phase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, scale: phase === 3 ? [0.85, 1.18, 1] : 1 }}
          className={`relative mt-3 font-display text-xl font-black uppercase sm:text-3xl ${phase >= 3 && hit ? "text-yellow-400" : "text-zinc-400"}`}
        >
          {phase === 0
            ? "Counting answer…"
            : phase === 1
              ? "Measuring distance…"
              : phase === 2
                ? "Charging attack…"
                : phase === 3
                  ? hit
                    ? `Fire · ${round.damageDealt} attack · ${round.armorBlocked} blocked · ${round.hpDamage} HP`
                    : "Attack fizzled"
                  : `Enemy retaliation · ${encounter.enemy.currentIntent.label}`}
        </motion.strong>
      </AnimatePresence>
    </motion.section>
  );
}

function CountUpNumber({ value, duration = 1_050 }: { value: number; duration?: number }) {
  const reducedMotion = useUiStore((state) => state.reducedMotion);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;

    let frame = 0;
    const startedAt = window.performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, reducedMotion, value]);

  return <>{reducedMotion ? value : display}</>;
}

function AttackFx({ run }: { run: RunState }) {
  const round = run.encounter?.lastRound;
  if (!round || round.damageDealt <= 0) return null;
  const answer = round.resolution.submittedValue ?? "▣";

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden" aria-hidden="true">
      <motion.div
        initial={{ left: "52%", top: "38%", opacity: 0, scale: 0.7, rotate: 0 }}
        animate={{
          left: ["52%", "56%", "89%"],
          top: ["38%", "35%", "24%"],
          opacity: [0, 1, 1, 0],
          scale: [0.7, 1.15, 0.35],
          rotate: [0, 6, 24],
        }}
        transition={{ delay: 2.85, duration: 0.82, times: [0, 0.2, 0.88, 1], ease: "easeInOut" }}
        className="absolute hidden size-14 -translate-x-1/2 -translate-y-1/2 place-items-center border-2 border-white bg-yellow-500 font-display text-2xl font-black text-zinc-950 shadow-[0_0_36px_rgba(250,204,21,0.6)] lg:grid"
      >
        {answer}
      </motion.div>
      <motion.div
        initial={{ left: "50%", top: "46%", opacity: 0, scale: 0.7 }}
        animate={{
          left: "50%",
          top: ["46%", "40%", "7%"],
          opacity: [0, 1, 1, 0],
          scale: [0.7, 1.1, 0.3],
          rotate: [0, -4, -18],
        }}
        transition={{ delay: 2.85, duration: 0.8, times: [0, 0.18, 0.86, 1], ease: "easeInOut" }}
        className="absolute grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center border-2 border-white bg-yellow-500 font-display text-xl font-black text-zinc-950 shadow-[0_0_30px_rgba(250,204,21,0.55)] lg:hidden"
      >
        {answer}
      </motion.div>
      <motion.strong
        initial={{ opacity: 0, scale: 0.5, y: 12 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1, 0.9], y: [12, 0, -8, -18] }}
        transition={{ delay: 3.48, duration: 0.58 }}
        className="absolute left-[89%] top-[18%] hidden -translate-x-1/2 font-display text-4xl text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.75)] lg:block"
      >
        {round.hpDamage > 0 ? `−${round.hpDamage} HP` : "Blocked"}
      </motion.strong>
      <motion.strong
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.25, 1, 0.9], y: [8, 0, -8, -14] }}
        transition={{ delay: 3.45, duration: 0.58 }}
        className="absolute left-1/2 top-[2%] -translate-x-1/2 font-display text-3xl text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.7)] lg:hidden"
      >
        {round.hpDamage > 0 ? `−${round.hpDamage} HP` : "Blocked"}
      </motion.strong>
      {Array.from({ length: 10 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 10;
        const x = Math.cos(angle) * (38 + (index % 3) * 10);
        const y = Math.sin(angle) * (32 + (index % 2) * 12);
        return (
          <motion.span
            key={index}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0.2], x, y }}
            transition={{ delay: 3.47 + index * 0.018, duration: 0.62, ease: "easeOut" }}
            className="absolute left-[89%] top-[24%] hidden size-2 rotate-45 bg-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.9)] lg:block"
          />
        );
      })}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ delay: 3.47, duration: 0.38 }}
        className="absolute inset-y-0 right-0 hidden w-[22%] bg-yellow-300 mix-blend-screen lg:block"
      />
    </div>
  );
}

function rollingTarget(target: number, step: number): number {
  return 100 + ((target - 100 + step * 137) % 900);
}

function TargetReveal({
  target,
  reducedMotion,
  onComplete,
}: {
  target: number;
  reducedMotion: boolean;
  onComplete: () => void;
}) {
  const [locked, setLocked] = useState(reducedMotion);
  const [display, setDisplay] = useState(reducedMotion ? target : rollingTarget(target, 1));

  useEffect(() => {
    if (reducedMotion) {
      const timeout = window.setTimeout(onComplete, 180);
      return () => window.clearTimeout(timeout);
    }

    let step = 1;
    const rolling = window.setInterval(() => setDisplay(rollingTarget(target, ++step)), 130);
    const locked = window.setTimeout(() => {
      window.clearInterval(rolling);
      setDisplay(target);
      setLocked(true);
    }, 1_750);
    const complete = window.setTimeout(onComplete, 2_450);
    return () => {
      window.clearInterval(rolling);
      window.clearTimeout(locked);
      window.clearTimeout(complete);
    };
  }, [onComplete, reducedMotion, target]);

  return (
    <motion.div
      aria-label="Target selection"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex min-h-52 w-full items-center justify-center overflow-hidden py-3"
    >
      <section className="relative w-full max-w-md overflow-hidden border border-gold/50 bg-panel p-6 text-center shadow-[0_0_48px_rgba(234,179,8,0.16)] sm:p-8">
        <motion.div
          aria-hidden="true"
          animate={{ opacity: locked ? 1 : [0.45, 1, 0.45] }}
          transition={{ duration: 0.7, repeat: locked ? 0 : Infinity, ease: "easeInOut" }}
          className="absolute inset-x-0 top-0 h-1 bg-gold"
        />
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-gold sm:text-xs">
          Drawing target
        </p>
        <strong
          aria-hidden="true"
          className="mt-4 block border-y border-gold/40 py-2 font-display text-7xl font-black tabular-nums text-gold shadow-[inset_0_0_18px_rgba(234,179,8,0.18)] sm:text-8xl"
        >
          {display}
        </strong>
        <span className="sr-only">Target selected: {target}</span>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-parchment/50">
          {locked ? "Target locked" : "Rolling numbers…"}
        </p>
      </section>
    </motion.div>
  );
}

function EncounterIntro({ run, onComplete }: { run: RunState; onComplete: () => void }) {
  const encounter = run.encounter!;
  const reducedMotion = useUiStore((state) => state.reducedMotion);
  const enemyDefinition = ENEMIES.find((enemy) => enemy.id === encounter.enemy.enemyId);

  useEffect(() => {
    const timeout = window.setTimeout(onComplete, reducedMotion ? 180 : 2_800);
    return () => window.clearTimeout(timeout);
  }, [onComplete, reducedMotion]);

  return (
    <main
      aria-label="Opponent introduction"
      className="relative mx-auto grid h-full min-h-0 w-full max-w-6xl place-items-center overflow-hidden p-2 sm:p-4"
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative grid h-full max-h-[610px] w-full max-w-4xl min-h-0 overflow-hidden border border-coral/45 bg-panel lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="relative min-h-0 overflow-hidden bg-[#11110f]">
          <div className="absolute inset-x-0 top-0 border-t-8 border-coral/20" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            className="absolute inset-5 border border-coral/20"
          />
          <div className="absolute bottom-[12%] left-1/2 h-10 w-2/3 -translate-x-1/2 rounded-[50%] bg-black/80 blur-xl" />
          <motion.img
            src={enemyPortraitUrl(encounter.enemy.enemyId)}
            alt={`${encounter.enemy.name} enters battle`}
            initial={{ opacity: 0, x: 90, scale: 0.78 }}
            animate={{ opacity: 1, x: 0, scale: [0.78, 1.04, 1] }}
            transition={{ delay: 0.15, duration: 0.75, ease: "easeOut" }}
            className="absolute bottom-0 left-1/2 h-[108%] w-auto max-w-none -translate-x-1/2 object-contain lg:h-[96%]"
          />
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-3 top-3 border border-coral/40 bg-ink px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-coral sm:left-5 sm:top-5 sm:text-[10px]"
          >
            Incoming opponent
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="relative flex flex-col justify-center border-t border-coral/30 bg-ink p-4 lg:border-l lg:border-t-0 lg:p-5"
        >
          <div className="flex items-center gap-2">
            <span className="border border-coral/30 bg-coral/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-coral">
              {encounter.type} encounter
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-parchment/35">
              {encounter.maxRounds} puzzles
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase leading-none sm:text-4xl">
            {encounter.enemy.name}
          </h1>
          <p className="mt-1 text-xs italic text-parchment/50 sm:text-sm">
            {encounter.enemy.epithet}
          </p>

          <div className="mt-3 grid grid-cols-[70px_minmax(0,1fr)] gap-2 border border-parchment/20 bg-panel p-3">
            <div>
              <span className="block text-[8px] font-black uppercase tracking-widest text-parchment/35">
                Health
              </span>
              <strong className="font-display text-2xl text-coral">{encounter.enemy.maxHp}</strong>
            </div>
            <div className="border-l border-parchment/10 pl-3">
              <span className="block text-[8px] font-black uppercase tracking-widest text-gold">
                Opens with
              </span>
              <strong className="mt-0.5 block text-sm">
                {encounter.enemy.currentIntent.label}
              </strong>
              <span className="text-[10px] text-parchment/50">
                {encounter.enemy.currentIntent.description}
              </span>
            </div>
          </div>

          {enemyDefinition?.passive && (
            <p className="mt-2 border border-mint/25 bg-mint/8 px-3 py-2 text-[10px] leading-snug text-mint">
              <strong>{enemyDefinition.passive.name}</strong> ·{" "}
              {enemyDefinition.passive.description}
            </p>
          )}

          <GameButton
            className="mt-3"
            full
            onClick={onComplete}
            aria-label={`Start puzzle against ${encounter.enemy.name}`}
          >
            Start puzzle
          </GameButton>
          <p className="mt-2 text-center text-[9px] text-parchment/35">Starting automatically…</p>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: reducedMotion ? 0.1 : 2.8, ease: "linear" }}
          className="absolute inset-x-0 bottom-0 h-1 origin-left bg-coral"
        />
      </motion.section>
    </main>
  );
}

function ActiveEncounterScreen({ run }: { run: RunState }) {
  const encounter = run.encounter;
  const dispatch = useGameStore((state) => state.dispatch);
  const dialogSlot = useUiStore((state) => state.consumableDialogSlot);
  const instructionsOpen = useUiStore((state) => state.instructionsOpen);
  const audioOpen = useUiStore((state) => state.audioOpen);
  const reducedMotion = useUiStore((state) => state.reducedMotion);
  const [revealedTargetPuzzleId, setRevealedTargetPuzzleId] = useState<string | null>(null);
  const [revealedResolutionKey, setRevealedResolutionKey] = useState<string | null>(null);
  const [landedResolutionKey, setLandedResolutionKey] = useState<string | null>(null);
  const targetRevealKey = encounter?.status === "puzzle" ? encounter.puzzle.puzzleId : null;
  const showingTargetReveal = targetRevealKey !== null && targetRevealKey !== revealedTargetPuzzleId;
  const completeTargetReveal = useCallback(() => {
    if (targetRevealKey) setRevealedTargetPuzzleId(targetRevealKey);
  }, [targetRevealKey]);
  const paused = dialogSlot !== null || instructionsOpen || audioOpen || showingTargetReveal;
  const resolutionKey = encounter?.lastRound ? encounter.puzzle.puzzleId : null;
  const enemyRetaliating = isEnemyRetaliating(run);
  const combatDefeatPending = run.status === "defeat" && enemyRetaliating;
  const showingImpact = Boolean(
    encounter &&
    encounter.status !== "puzzle" &&
    (resolutionKey !== revealedResolutionKey || combatDefeatPending),
  );

  useEffect(() => {
    if (!showingImpact || !resolutionKey) return;
    const timeout = window.setTimeout(
      () => {
        if (combatDefeatPending) dispatch({ type: "COMBAT_DEFEAT_REVEALED" });
        else setRevealedResolutionKey(resolutionKey);
      },
      reducedMotion
        ? REDUCED_MOTION_RESOLUTION_MS
        : enemyRetaliating
          ? ENEMY_RETALIATION_RESOLUTION_MS
          : STANDARD_RESOLUTION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [
    combatDefeatPending,
    dispatch,
    enemyRetaliating,
    reducedMotion,
    resolutionKey,
    showingImpact,
  ]);

  useEffect(() => {
    if (!showingImpact || !resolutionKey) return;
    const timeout = window.setTimeout(
      () => setLandedResolutionKey(resolutionKey),
      reducedMotion ? 0 : 3_450,
    );
    return () => window.clearTimeout(timeout);
  }, [reducedMotion, resolutionKey, showingImpact]);

  const sourceTiles = useMemo(
    () =>
      encounter
        ? encounter.puzzle.sourceTileIds
            .map((tileId) => encounter.puzzle.tiles[tileId])
            .filter((tile): tile is NumberTile => Boolean(tile))
        : [],
    [encounter],
  );
  const resultTiles = useMemo(
    () =>
      encounter
        ? encounter.puzzle.operations
            .map((operation) => encounter.puzzle.tiles[operation.resultTileId])
            .filter((tile): tile is NumberTile => Boolean(tile))
        : [],
    [encounter],
  );
  const selectableTiles = useMemo(
    () => [...sourceTiles, ...resultTiles].filter((tile) => tile.status === "available"),
    [resultTiles, sourceTiles],
  );

  useEffect(() => {
    if (!encounter || encounter.status !== "puzzle" || paused) return;
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;
      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1 && number <= 9) {
        const tile = selectableTiles[number - 1];
        if (tile) {
          event.preventDefault();
          const selected = encounter.puzzle.selectedTileIds.some((id) => id === tile.tileId);
          dispatch({
            type: "PUZZLE_ACTION",
            action: selected
              ? { type: "TILE_DESELECTED", tileId: tile.tileId }
              : { type: "TILE_SELECTED", tileId: tile.tileId },
          });
          audioManager.play(selected ? "tile-deselected" : "tile-selected");
        }
        return;
      }
      const operator = OPERATORS.find(
        (candidate) =>
          candidate.key === event.key || (candidate.value === "add" && event.key === "="),
      );
      if (operator) {
        event.preventDefault();
        dispatch({
          type: "PUZZLE_ACTION",
          action: { type: "OPERATOR_SELECTED", operator: operator.value },
        });
        audioManager.play("operator-selected");
      } else if (event.key.toLowerCase() === "u") {
        event.preventDefault();
        dispatch({ type: "PUZZLE_ACTION", action: { type: "LAST_OPERATION_UNDONE" } });
      } else if (event.key.toLowerCase() === "s" && encounter.puzzle.closestResult) {
        event.preventDefault();
        dispatch({ type: "PUZZLE_ACTION", action: { type: "RESULT_SUBMITTED", reason: "manual" } });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dispatch, encounter, paused, selectableTiles]);

  if (!encounter) return null;
  const puzzle = encounter.puzzle;
  const enemyDefinition = ENEMIES.find((enemy) => enemy.id === encounter.enemy.enemyId);
  const selected = puzzle.selectedTileIds;
  const active = encounter.status === "puzzle";
  const attackHasLanded = !showingImpact || landedResolutionKey === resolutionKey;
  const displayedEnemyHp =
    showingImpact && !attackHasLanded && encounter.lastRound
      ? encounter.lastRound.enemyHpBefore
      : encounter.enemy.hp;
  const nextStep =
    selected.length === 2
      ? "Pick an operator"
      : selected.length === 1
        ? "Pick 1 more"
        : "Pick 2 numbers";

  const toggleTile = (tileId: string) => {
    const isSelected = selected.some((id) => id === tileId);
    dispatch({
      type: "PUZZLE_ACTION",
      action: isSelected ? { type: "TILE_DESELECTED", tileId } : { type: "TILE_SELECTED", tileId },
    });
    audioManager.play(isSelected ? "tile-deselected" : "tile-selected");
  };

  return (
    <main className="relative mx-auto grid h-full min-h-0 w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] gap-2 overflow-hidden p-1 sm:p-2 lg:grid-cols-[180px_minmax(0,1fr)_250px] lg:grid-rows-1 lg:gap-3 lg:p-4">
      {showingImpact && <AttackFx run={run} />}
      <motion.aside
        aria-label="Enemy"
        animate={
          showingImpact && (encounter.lastRound?.damageDealt ?? 0) > 0
            ? { x: [0, -7, 7, -4, 0], filter: ["brightness(1)", "brightness(2)", "brightness(1)"] }
            : { x: 0, filter: "brightness(1)" }
        }
        transition={{ delay: 3.42, duration: 0.52 }}
        className="relative overflow-hidden border border-coral/40 bg-panel p-2 lg:col-start-3 lg:row-start-1 lg:p-3"
      >
        <div className="grid grid-cols-[72px_minmax(0,1fr)_104px] items-center gap-2 lg:block">
          <div className="relative h-[72px] overflow-hidden border border-coral/30 bg-[#11110f] lg:h-56">
            <div className="absolute inset-2 border border-coral/10" />
            <div className="absolute left-1/2 top-[70%] h-5 w-3/4 -translate-x-1/2 rounded-[50%] bg-black/70 blur-md lg:h-9" />
            <motion.img
              src={enemyPortraitUrl(encounter.enemy.enemyId)}
              alt={`${encounter.enemy.name} monster`}
              animate={
                encounter.enemy.hp > 0
                  ? { y: [0, -5, 0], scale: [1, 1.025, 1] }
                  : { y: 8, scale: 0.94, opacity: 0.45, filter: "grayscale(1)" }
              }
              transition={{
                duration: 3.2,
                repeat: encounter.enemy.hp > 0 ? Infinity : 0,
                ease: "easeInOut",
              }}
              className="absolute bottom-0 left-1/2 h-[132%] w-auto max-w-none -translate-x-1/2 object-contain lg:h-[122%]"
            />
            <span className="absolute left-1.5 top-1.5 border border-coral/30 bg-ink px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-coral lg:left-2 lg:top-2 lg:px-2 lg:py-1 lg:text-[9px]">
              {encounter.type}
            </span>
            <span className="absolute bottom-1 right-1 border border-parchment/15 bg-ink px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-parchment/45 lg:bottom-2 lg:right-2 lg:text-[8px]">
              Opponent
            </span>
          </div>

          <div className="min-w-0 lg:mt-3">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-coral lg:text-[10px]">
              Now fighting
            </p>
            <h1 className="mt-0.5 truncate font-display text-base font-black leading-tight lg:mt-1 lg:whitespace-normal lg:text-2xl">
              {encounter.enemy.name}
            </h1>
            <p className="truncate text-[9px] italic text-parchment/45 lg:mt-0.5 lg:whitespace-normal lg:text-xs">
              {encounter.enemy.epithet}
            </p>
          </div>

          <div className="min-w-0 text-right lg:mt-3 lg:text-left">
            <div className="flex items-baseline justify-end gap-1 lg:justify-between">
              <strong className="font-display text-base tabular-nums lg:text-xl">
                {displayedEnemyHp}
              </strong>
              <span className="text-[8px] font-bold uppercase text-parchment/40 lg:text-[9px]">
                / {encounter.enemy.maxHp} HP
              </span>
            </div>
            <HealthBar value={displayedEnemyHp} max={encounter.enemy.maxHp} />
            {encounter.enemy.armor > 0 && (
              <p className="mt-1 text-[9px] font-bold text-zinc-300 lg:text-xs">
                ◆ {encounter.enemy.armor} armor
              </p>
            )}
          </div>
        </div>

        <div className="mt-1.5 grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 border border-gold/30 bg-gold/8 px-2 py-1.5 lg:mt-3 lg:grid-cols-[36px_minmax(0,1fr)] lg:p-3">
          <span className="grid size-7 place-items-center border border-gold bg-gold text-sm font-black text-ink lg:row-span-2 lg:size-9 lg:text-lg">
            {intentGlyph(encounter.enemy.currentIntent.type)}
          </span>
          <div className="min-w-0">
            <p className="text-[7px] font-black uppercase tracking-widest text-gold lg:text-[9px]">
              Enemy acts next
            </p>
            <strong className="block truncate text-xs lg:mt-0.5 lg:text-base">
              {encounter.enemy.currentIntent.label}
            </strong>
          </div>
          <span className="text-right text-[9px] leading-tight text-parchment/60 lg:col-start-2 lg:text-left lg:text-xs lg:leading-relaxed">
            {encounter.enemy.currentIntent.description}
          </span>
        </div>
        {enemyDefinition?.passive && (
          <div className="mt-1 border border-mint/25 bg-mint/8 px-2 py-1 text-[9px] leading-tight text-mint lg:mt-2 lg:px-3 lg:py-2 lg:text-xs">
            <span className="mr-1 font-black uppercase tracking-wider">Passive</span>
            <strong>{enemyDefinition.passive.name}</strong> · {enemyDefinition.passive.description}
          </div>
        )}
      </motion.aside>

      <section className="flex min-h-0 flex-col overflow-hidden border border-parchment/25 bg-panel p-2 sm:p-3 lg:col-start-2 lg:row-start-1 lg:p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <PuzzleProgress run={run} />
          <div className="min-w-24 border border-gold/35 bg-gold px-5 py-2.5 text-center text-ink shadow-[0_8px_24px_rgba(234,179,8,0.16)] sm:min-w-32 sm:px-7 sm:py-3">
            <span className="sr-only">Target </span>
            <strong className="font-display text-4xl font-black leading-none sm:text-5xl">
              {showingTargetReveal ? "???" : puzzle.target}
            </strong>
          </div>
          <div className="justify-self-end text-right">
            <PuzzleTimer key={puzzle.puzzleId} run={run} paused={paused} />
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <AnimatePresence mode="sync">
            {showingTargetReveal ? (
              <TargetReveal
                key={puzzle.puzzleId}
                target={puzzle.target}
                reducedMotion={reducedMotion}
                onComplete={completeTargetReveal}
              />
            ) : active ? (
              <motion.div
                key="workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full min-h-0 flex-col"
              >
                <div className="mx-auto mt-2 w-full max-w-xl lg:mt-3" aria-label="Number workspace">
                  <p className="mb-1 text-center text-[9px] font-black uppercase tracking-[0.2em] text-parchment/40 lg:text-[10px]">
                    Starting numbers
                    {puzzle.minimumOperations > 0 && (
                      <span className="text-yellow-500/70">
                        {" "}
                        · {puzzle.minimumOperations}-step target
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-6 gap-[3px] sm:gap-2">
                    {sourceTiles.map((tile) => {
                      const isSelected = selected.some((id) => id === tile.tileId);
                      const shortcutIndex = selectableTiles.findIndex(
                        (candidate) => candidate.tileId === tile.tileId,
                      );
                      return (
                        <motion.button
                          animate={{ scale: 1, opacity: tile.status === "consumed" ? 0.28 : 1 }}
                          key={tile.tileId}
                          disabled={tile.status === "consumed"}
                          aria-pressed={isSelected}
                          aria-label={`${tile.value}${tile.status === "consumed" ? ", consumed" : isSelected ? ", selected" : ", available"}`}
                          onClick={() => toggleTile(tile.tileId)}
                          className={`relative aspect-square min-w-0 border-2 font-display text-lg font-black transition sm:text-2xl ${isSelected ? "border-gold bg-gold text-ink shadow-[0_0_0_3px_rgba(234,179,8,0.22)]" : "border-parchment/15 bg-parchment/10 hover:border-parchment/40"}`}
                        >
                          {tile.value}
                          {shortcutIndex >= 0 && shortcutIndex < 9 && (
                            <span className="absolute right-1.5 top-1 text-[9px] font-sans text-current opacity-45">
                              {shortcutIndex + 1}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="mx-auto mt-2 flex w-full max-w-md items-center justify-around gap-2 lg:mt-3"
                  aria-label="Operators"
                >
                  {OPERATORS.map((operator) => (
                    <button
                      key={operator.value}
                      aria-pressed={puzzle.selectedOperator === operator.value}
                      aria-label={operator.name}
                      onClick={() => {
                        dispatch({
                          type: "PUZZLE_ACTION",
                          action: { type: "OPERATOR_SELECTED", operator: operator.value },
                        });
                        audioManager.play("operator-selected");
                      }}
                      className={`relative size-10 shrink-0 border text-xl font-black transition-colors sm:size-12 lg:size-14 lg:text-2xl ${puzzle.selectedOperator === operator.value ? "border-gold bg-gold text-ink" : "border-parchment/20 bg-ink hover:border-gold"}`}
                    >
                      {operator.symbol}
                      <span className="absolute bottom-0.5 right-2 text-[8px] opacity-40">
                        {operator.key}
                      </span>
                    </button>
                  ))}
                </div>

                <div
                  className="mx-auto mt-2 w-full max-w-md flex-1 space-y-1 overflow-hidden lg:mt-3 lg:space-y-2"
                  aria-label="Calculation rows"
                >
                  {puzzle.operations.map((operation, index) => {
                    const resultTile = puzzle.tiles[operation.resultTileId];
                    if (!resultTile) return null;
                    const resultSelected = selected.some((id) => id === resultTile.tileId);
                    const shortcutIndex = selectableTiles.findIndex(
                      (candidate) => candidate.tileId === resultTile.tileId,
                    );
                    const isLatest = index === puzzle.operations.length - 1;
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={operation.operationId}
                        className="grid grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)_1rem_minmax(0,1fr)_2.25rem] items-center gap-1"
                      >
                        <div className="grid min-h-10 place-items-center border border-parchment/15 bg-parchment/10 px-1 font-display text-lg font-black sm:min-h-11 sm:text-xl">
                          {puzzle.tiles[operation.leftTileId]?.value}
                        </div>
                        <div className="grid size-9 place-items-center justify-self-center border border-parchment/15 bg-ink text-lg font-black">
                          {operatorSymbol(operation.operator)}
                        </div>
                        <div className="grid min-h-10 place-items-center border border-parchment/15 bg-parchment/10 px-1 font-display text-lg font-black sm:min-h-11 sm:text-xl">
                          {puzzle.tiles[operation.rightTileId]?.value}
                        </div>
                        <span className="text-center text-xl font-black text-parchment/30">=</span>
                        <motion.button
                          layout
                          disabled={resultTile.status === "consumed"}
                          aria-pressed={resultSelected}
                          aria-label={`${resultTile.value}${resultTile.status === "consumed" ? ", consumed" : resultSelected ? ", selected" : ", available"}`}
                          onClick={() => toggleTile(resultTile.tileId)}
                          animate={{ opacity: resultTile.status === "consumed" ? 0.28 : 1 }}
                          className={`relative min-h-10 border-2 px-1 font-display text-lg font-black transition sm:min-h-11 sm:text-xl ${resultSelected ? "border-gold bg-gold text-ink" : "border-mint/45 bg-mint/10 text-mint hover:border-mint"}`}
                        >
                          {resultTile.value}
                          {shortcutIndex >= 0 && shortcutIndex < 9 && (
                            <span className="absolute right-1 top-0.5 text-[8px] font-sans opacity-45">
                              {shortcutIndex + 1}
                            </span>
                          )}
                        </motion.button>
                        <button
                          type="button"
                          disabled={!isLatest}
                          aria-label={
                            isLatest
                              ? `Undo operation ${index + 1}`
                              : `Operation ${index + 1} cannot be undone yet`
                          }
                          onClick={() =>
                            dispatch({
                              type: "PUZZLE_ACTION",
                              action: { type: "LAST_OPERATION_UNDONE" },
                            })
                          }
                          className="grid size-9 place-items-center border border-transparent text-lg text-coral transition-colors hover:border-coral/40 hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-20"
                        >
                          ♲
                        </button>
                      </motion.div>
                    );
                  })}

                  <div
                    className="grid grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)_1rem_minmax(0,1fr)_2.25rem] items-center gap-1"
                    aria-live="polite"
                  >
                    <div className="grid min-h-10 place-items-center border border-dashed border-parchment/25 bg-ink/20 px-1 font-display text-lg font-black sm:min-h-11 sm:text-xl">
                      {selected[0] ? puzzle.tiles[selected[0]]?.value : ""}
                    </div>
                    <div className="grid size-9 place-items-center justify-self-center border border-parchment/20 text-lg font-black text-gold">
                      {puzzle.selectedOperator ? operatorSymbol(puzzle.selectedOperator) : ""}
                    </div>
                    <div className="grid min-h-10 place-items-center border border-dashed border-parchment/25 bg-ink/20 px-1 font-display text-lg font-black sm:min-h-11 sm:text-xl">
                      {selected[1] ? puzzle.tiles[selected[1]]?.value : ""}
                    </div>
                    <span className="text-center text-xl font-black text-parchment/30">=</span>
                    <div className="min-h-10 border border-dashed border-parchment/25 bg-ink/20 sm:min-h-11" />
                    <span aria-hidden="true" />
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-3">
                  <GameButton
                    aria-label="Undo last operation"
                    variant="secondary"
                    disabled={!puzzle.operations.length}
                    onClick={() =>
                      dispatch({ type: "PUZZLE_ACTION", action: { type: "LAST_OPERATION_UNDONE" } })
                    }
                  >
                    Undo <span className="hidden text-xs opacity-60 sm:inline">U</span>
                  </GameButton>
                  <GameButton
                    aria-label="Submit closest result"
                    variant="danger"
                    disabled={!puzzle.closestResult}
                    onClick={() =>
                      dispatch({
                        type: "PUZZLE_ACTION",
                        action: { type: "RESULT_SUBMITTED", reason: "manual" },
                      })
                    }
                  >
                    Submit {puzzle.closestResult?.value ?? "—"}{" "}
                    <span className="hidden text-xs opacity-60 sm:inline">S</span>
                  </GameButton>
                </div>

                <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border border-parchment/15 bg-ink/35 px-3 py-2 text-xs sm:text-sm lg:mt-3">
                  <span className="text-parchment/55">
                    {puzzle.closestResult ? "Closest" : "Next step"}
                  </span>
                  <strong className="text-center">
                    {puzzle.closestResult
                      ? `${puzzle.closestResult.value} · ${puzzle.closestResult.distance} away`
                      : nextStep}
                  </strong>
                  <span className="text-gold">
                    {puzzle.closestResult
                      ? `${getBaseDamage(puzzle.closestResult.distance)} base`
                      : "Auto-resolves"}
                  </span>
                </div>
                <span className="sr-only">
                  Equations resolve automatically when two tiles and an operator are selected.
                  Keyboard enabled: 1–9 tiles, plus, minus, star, slash operators, U undo, S submit.
                </span>
              </motion.div>
            ) : showingImpact ? (
              <CombatImpact key={`impact-${resolutionKey}`} run={run} />
            ) : (
              <RoundResolution key="resolution" run={run} />
            )}
          </AnimatePresence>
        </div>
      </section>

      <aside aria-label="Consumables and damage guide" className="lg:col-start-1 lg:row-start-1">
        <section className="border border-parchment/25 bg-panel p-2 lg:p-4">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-parchment/45 lg:mb-3 lg:text-xs">
            Consumables
          </p>
          <ConsumableTray run={run} />
        </section>
        <DamageGuide />
      </aside>
    </main>
  );
}

export function EncounterScreen({ run }: { run: RunState }) {
  const encounterId = run.encounter?.encounterId;
  const [introducedEncounterId, setIntroducedEncounterId] = useState<string | null>(null);

  if (!run.encounter || !encounterId) return null;
  if (introducedEncounterId !== encounterId) {
    return (
      <EncounterIntro
        key={encounterId}
        run={run}
        onComplete={() => setIntroducedEncounterId(encounterId)}
      />
    );
  }
  return <ActiveEncounterScreen run={run} />;
}
