import { useEffect, useMemo, useState } from "react";
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

const OPERATORS: Array<{ value: Operator; symbol: string; key: string; name: string }> = [
  { value: "add", symbol: "+", key: "+", name: "add" },
  { value: "subtract", symbol: "−", key: "-", name: "subtract" },
  { value: "multiply", symbol: "×", key: "*", name: "multiply" },
  { value: "divide", symbol: "÷", key: "/", name: "divide" },
];

const ENEMY_GLYPHS: Record<string, string> = {
  sumslinger: "+",
  "ledger-wisp": "≋",
  "divide-hydra": "÷",
  "clockwork-adder": "◷",
  "prime-warden": "♢",
  "compound-golem": "%",
  "final-examiner": "!",
};

function operatorSymbol(operator: Operator): string {
  return OPERATORS.find((candidate) => candidate.value === operator)?.symbol ?? "?";
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
      className="h-2.5 overflow-hidden rounded-full bg-ink/70"
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
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/70">
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
              className="flex min-h-16 min-w-0 flex-col items-center justify-center rounded-xl border border-parchment/12 bg-ink/40 px-1.5 py-2 text-[10px] font-bold leading-tight text-parchment/70 transition hover:border-mint/50 hover:text-mint disabled:opacity-30 sm:text-xs lg:min-h-11 lg:flex-row lg:justify-start lg:gap-2 lg:px-3 lg:text-left"
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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-mint/25 bg-panel p-6 shadow-2xl focus:outline-none">
            <Dialog.Title className="font-display text-3xl font-black">
              {selected?.name ?? "Empty slot"}
            </Dialog.Title>
            <Dialog.Description className="mt-3 text-parchment/65">
              {selected?.description ?? "There is nothing to use here."}
            </Dialog.Description>
            <p className="mt-4 rounded-lg bg-mint/10 px-3 py-2 text-sm font-bold text-mint">
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

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl border p-6 text-center ${won ? "border-mint/40 bg-mint/8" : "border-parchment/15 bg-panel"}`}
    >
      <p
        className={`text-xs font-black uppercase tracking-[0.25em] ${won ? "text-mint" : "text-gold"}`}
      >
        {won ? "Enemy defeated" : `Puzzle ${encounter.roundIndex} resolved`}
      </p>
      <h2 className="mt-3 font-display text-4xl font-black">{submitted ?? "Miss"}</h2>
      <p className="mt-2 text-parchment/65">
        {submitted === undefined
          ? "No valid result was created."
          : `${round.resolution.distance} away · ${round.damageDealt} damage`}
      </p>
      <div className="mt-5 rounded-xl bg-ink/45 p-4 text-sm text-parchment/75">
        {round.enemyAction}
      </div>
      <GameButton className="mt-6" full onClick={() => dispatch({ type: "ENCOUNTER_CONTINUED" })}>
        {won
          ? encounter.type === "boss"
            ? "Finish the run"
            : "Claim reward"
          : `Begin puzzle ${encounter.roundIndex + 1}`}
      </GameButton>
    </motion.section>
  );
}

export function EncounterScreen({ run }: { run: RunState }) {
  const encounter = run.encounter;
  const dispatch = useGameStore((state) => state.dispatch);
  const dialogSlot = useUiStore((state) => state.consumableDialogSlot);
  const instructionsOpen = useUiStore((state) => state.instructionsOpen);
  const audioOpen = useUiStore((state) => state.audioOpen);
  const paused = dialogSlot !== null || instructionsOpen || audioOpen;

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
    <main className="mx-auto grid h-full min-h-0 w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] gap-2 overflow-hidden p-1 sm:p-2 lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:grid-rows-1 lg:gap-3 lg:p-4">
      <aside className="rounded-xl border border-coral/20 bg-panel p-2 lg:rounded-2xl lg:p-4">
        <div className="flex items-start justify-between gap-4 lg:block">
          <div className="flex items-center gap-2 lg:block">
            <div className="grid size-9 shrink-0 place-items-center rounded-full border border-coral/35 bg-coral/10 font-display text-lg font-black text-coral lg:mb-3 lg:size-14 lg:text-2xl">
              {ENEMY_GLYPHS[encounter.enemy.enemyId] ?? "?"}
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-coral lg:text-xs">
                {encounter.type} encounter
              </p>
              <h1 className="mt-0.5 font-display text-lg font-black lg:mt-2 lg:text-2xl">
                {encounter.enemy.name}
              </h1>
              <p className="hidden text-xs italic text-parchment/45 lg:block">
                {encounter.enemy.epithet}
              </p>
            </div>
          </div>
          <div className="min-w-24 text-right text-sm lg:mt-5 lg:text-left lg:text-base">
            <strong>
              {encounter.enemy.hp}/{encounter.enemy.maxHp} HP
            </strong>
            <HealthBar value={encounter.enemy.hp} max={encounter.enemy.maxHp} />
            {encounter.enemy.armor > 0 && (
              <p className="mt-2 text-xs text-sky-300">◆ {encounter.enemy.armor} armor</p>
            )}
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-gold/20 bg-gold/8 px-2 py-1.5 lg:mt-4 lg:block lg:rounded-xl lg:p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gold">Next intent</p>
          <strong className="text-xs lg:mt-1 lg:block lg:text-base">
            {encounter.enemy.currentIntent.label}
          </strong>
          <span className="ml-auto text-[10px] text-parchment/60 lg:ml-0 lg:mt-1 lg:block lg:text-xs lg:leading-relaxed">
            {encounter.enemy.currentIntent.description}
          </span>
        </div>
        {enemyDefinition?.passive && (
          <p className="mt-1 rounded-lg border border-mint/20 bg-mint/8 px-2 py-1 text-[10px] leading-tight text-mint lg:mt-2 lg:px-3 lg:py-2 lg:text-xs">
            <strong>{enemyDefinition.passive.name}</strong> · {enemyDefinition.passive.description}
          </p>
        )}
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-parchment/12 bg-panel/80 p-2 sm:p-3 lg:rounded-2xl lg:p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <p className="pt-1 text-[9px] font-black uppercase leading-tight tracking-wider text-parchment/45 sm:text-xs sm:tracking-widest">
            Puzzle {encounter.roundIndex} of {encounter.maxRounds}
          </p>
          <div className="min-w-24 border border-gold/35 bg-gold px-5 py-2.5 text-center text-ink shadow-[0_8px_24px_rgba(243,184,59,0.12)] sm:min-w-32 sm:px-7 sm:py-3">
            <span className="sr-only">Target </span>
            <strong className="font-display text-4xl font-black leading-none sm:text-5xl">
              {puzzle.target}
            </strong>
          </div>
          <div className="justify-self-end text-right">
            <PuzzleTimer key={puzzle.puzzleId} run={run} paused={paused} />
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <AnimatePresence mode="sync">
            {active ? (
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
                          className={`relative aspect-square min-w-0 border-2 font-display text-lg font-black transition sm:text-2xl ${isSelected ? "border-gold bg-gold text-ink shadow-[0_0_0_3px_rgba(243,184,59,0.2)]" : "border-parchment/15 bg-parchment/10 hover:border-parchment/40"}`}
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
                      className={`relative size-10 shrink-0 rounded-full border text-xl font-black transition sm:size-12 lg:size-14 lg:text-2xl ${puzzle.selectedOperator === operator.value ? "border-gold bg-gold text-ink" : "border-parchment/15 bg-parchment/10 hover:border-gold/50"}`}
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
                        <div className="grid size-9 place-items-center justify-self-center rounded-full bg-parchment/12 text-lg font-black">
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
                          className="grid size-9 place-items-center rounded-full text-lg text-coral transition hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-20"
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
                    <div className="grid size-9 place-items-center justify-self-center rounded-full border border-parchment/20 text-lg font-black text-gold">
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

                <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-ink/35 px-3 py-2 text-xs sm:text-sm lg:mt-3">
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
            ) : (
              <RoundResolution key="resolution" run={run} />
            )}
          </AnimatePresence>
        </div>
      </section>

      <aside className="grid grid-cols-2 gap-2 lg:block lg:space-y-3">
        <section className="rounded-xl border border-parchment/12 bg-panel p-2 lg:rounded-2xl lg:p-4">
          <p className="text-xs font-black uppercase tracking-widest text-parchment/45">Player</p>
          <div className="mt-2 flex justify-between">
            <strong>
              {run.hp}/{run.maxHp} HP
            </strong>
            {run.armor > 0 && <span className="text-sky-300">◆ {run.armor}</span>}
          </div>
          <HealthBar value={run.hp} max={run.maxHp} color="bg-mint" />
          {run.weakenedBy > 0 && (
            <p className="mt-2 text-xs text-coral">Next answer −{run.weakenedBy} damage</p>
          )}
          {run.doubleNextDamage && (
            <p className="mt-2 text-xs text-gold">Next answer deals double damage</p>
          )}
        </section>
        <section className="rounded-xl border border-parchment/12 bg-panel p-2 lg:rounded-2xl lg:p-4">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-parchment/45 lg:mb-3 lg:text-xs">
            Consumables
          </p>
          <ConsumableTray run={run} />
        </section>
        <section className="hidden rounded-2xl border border-parchment/12 bg-panel p-4 lg:block">
          <p className="text-xs font-black uppercase tracking-widest text-parchment/45">
            Calculation flow
          </p>
          <p className="mt-3 text-sm leading-relaxed text-parchment/55">
            The six starting numbers stay in the top row. Each answer appears in its equation row;
            select that answer there to use it in the next calculation.
          </p>
        </section>
      </aside>
    </main>
  );
}
