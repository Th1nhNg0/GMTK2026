import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BALANCE } from "../../content/balance";
import type { MapNodeType, RunState } from "../../game/run/types";
import { useGameStore } from "../../store/gameStore";
import { useUiStore } from "../../store/uiStore";
import { GameButton } from "../components/GameButton";
import { ScreenFrame } from "../components/ScreenFrame";

function freshSeed(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
  }
  return Date.now() >>> 0;
}

export function TitleScreen() {
  const dispatch = useGameStore((state) => state.dispatch);
  const setInstructionsOpen = useUiStore((state) => state.setInstructionsOpen);
  const [debugSeed, setDebugSeed] = useState("2026");

  return (
    <section className="relative flex h-full items-center overflow-hidden border border-transparent px-4 py-4 sm:py-6">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.025)_0,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_6px)]" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative mx-auto w-full max-w-2xl text-center"
      >
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-parchment/40">
          Arithmetic combat program // 2026
        </p>
        <h1 className="font-display text-4xl font-bold uppercase leading-[0.9] sm:text-6xl">
          Last Sum
          <br />
          <span className="text-gold">Standing</span>
        </h1>
        <div
          className="mx-auto mt-4 flex max-w-md items-center justify-center gap-1.5"
          aria-hidden="true"
        >
          {[100, 50, 25, 8, 7, 3].map((value, index) => (
            <span
              key={`${value}-${index}`}
              className={`grid size-9 place-items-center border font-display text-xs font-black sm:size-11 sm:text-sm ${index === 3 ? "border-gold bg-gold text-ink" : "border-parchment/20 bg-panel text-parchment/75"}`}
            >
              {value}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-parchment/65 sm:text-base">
          Six numbers. One target. Forty-five seconds. Do the arithmetic before it does you.
        </p>
        <div className="mx-auto mt-5 grid max-w-sm gap-2.5 sm:mt-6">
          <GameButton onClick={() => dispatch({ type: "RUN_STARTED", seed: freshSeed() })} full>
            Start the clock
          </GameButton>
          <GameButton variant="secondary" onClick={() => setInstructionsOpen(true)} full>
            Rules of play
          </GameButton>
        </div>
        {import.meta.env.DEV && (
          <form
            className="mx-auto mt-4 flex max-w-sm gap-2 border border-dashed border-parchment/25 p-2"
            onSubmit={(event) => {
              event.preventDefault();
              dispatch({ type: "RUN_STARTED", seed: Number(debugSeed) || 1 });
            }}
          >
            <label className="sr-only" htmlFor="debug-seed">
              Developer seed
            </label>
            <input
              id="debug-seed"
              value={debugSeed}
              onChange={(event) => setDebugSeed(event.target.value)}
              inputMode="numeric"
              className="min-w-0 flex-1 border border-parchment/20 bg-ink px-3 text-parchment"
            />
            <GameButton type="submit" variant="quiet">
              Use seed
            </GameButton>
          </form>
        )}
        <p className="mt-4 text-[10px] uppercase tracking-widest text-parchment/35 sm:text-xs">
          One run · No saves · No second chances
        </p>
      </motion.div>
    </section>
  );
}

const NODE_META: Record<MapNodeType, { icon: string; label: string; tone: string }> = {
  normal: { icon: "±", label: "Encounter", tone: "text-zinc-100" },
  elite: { icon: "◆", label: "Elite", tone: "text-yellow-300" },
  boss: { icon: "★", label: "Boss", tone: "text-yellow-300" },
  shop: { icon: "●", label: "Shop", tone: "text-yellow-400" },
  event: { icon: "?", label: "Event", tone: "text-zinc-300" },
  rest: { icon: "♥", label: "Rest", tone: "text-white" },
  upgrade: { icon: "↑", label: "Upgrade", tone: "text-zinc-100" },
};

export function MapScreen({ run }: { run: RunState }) {
  const dispatch = useGameStore((state) => state.dispatch);
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxRow = Math.max(...run.map.nodes.map((node) => node.row));
  const focusRow = Math.max(
    0,
    ...run.map.nodes.filter((node) => node.status === "available").map((node) => node.row),
  );
  const rowSpacing = 88;
  const verticalPadding = 56;
  const mapHeight = maxRow * rowSpacing + verticalPadding * 2;
  const yForRow = (row: number) => (maxRow - row) * rowSpacing + verticalPadding;
  const xForColumn = (column: number) => (column + 0.5) * 200;

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const focusY = (maxRow - focusRow) * rowSpacing + verticalPadding;
    viewport.scrollTop = Math.max(0, focusY - viewport.clientHeight / 2);
  }, [focusRow, maxRow]);

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden px-3 py-3 sm:px-6 sm:py-5">
      <header className="mb-3 shrink-0 border-b border-parchment/25 pb-3 text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">
          Seed {run.seed} · Floor {focusRow + 1} / {maxRow + 1}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold uppercase leading-none sm:text-3xl">
          Choose your route
        </h1>
        <p className="mt-1 text-xs text-parchment/55 sm:text-sm">
          Follow the live circuit upward before the count reaches zero.
        </p>
      </header>

      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain border border-parchment/30 bg-[#121210] [scrollbar-color:#c6a75a66_transparent]"
        aria-label="Branching run map"
      >
        <div className="relative mx-auto w-full max-w-2xl" style={{ height: mapHeight }}>
          <div
            className="pointer-events-none absolute left-0 right-0 z-0 border-t border-dashed border-gold/25"
            style={{ top: yForRow(focusRow) }}
            aria-hidden="true"
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 600 ${mapHeight}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {run.map.nodes.flatMap((node) =>
              node.connections.map((connectionId) => {
                const target = run.map.nodes.find((candidate) => candidate.id === connectionId);
                if (!target) return null;
                const travelled = node.status === "completed";
                const reachable = travelled && target.status === "available";
                const sourceX = xForColumn(node.column);
                const sourceY = yForRow(node.row);
                const targetX = xForColumn(target.column);
                const targetY = yForRow(target.row);
                const midpointY = (sourceY + targetY) / 2;
                return (
                  <motion.path
                    key={`${node.id}-${connectionId}`}
                    d={`M ${sourceX} ${sourceY} C ${sourceX} ${midpointY}, ${targetX} ${midpointY}, ${targetX} ${targetY}`}
                    fill="none"
                    stroke={reachable ? "#c6a75a" : travelled ? "#8f9e72" : "#5c5a52"}
                    strokeOpacity={reachable ? 1 : travelled ? 0.62 : 0.38}
                    strokeWidth={reachable ? 3 : travelled ? 2 : 1}
                    strokeDasharray={travelled ? undefined : "3 7"}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              }),
            )}
          </svg>

          {run.map.nodes.map((node) => {
            const meta = NODE_META[node.type];
            const available = node.status === "available";
            const completed = node.status === "completed";
            return (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: completed ? 0.8 : available ? 1 : 0.62 }}
                key={node.id}
                disabled={!available}
                onClick={() => dispatch({ type: "MAP_NODE_SELECTED", nodeId: node.id })}
                aria-label={`${meta.label}, ${node.status}`}
                data-map-node-status={node.status}
                style={{ left: `${((node.column + 0.5) / 3) * 100}%`, top: yForRow(node.row) }}
                className={`absolute flex h-12 w-20 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 border bg-[#1b1a17] px-2 text-left transition-colors sm:h-14 sm:w-24 sm:gap-2 sm:px-3 ${meta.tone} ${available ? "cursor-pointer !border-gold !bg-gold !text-ink hover:!bg-[#d8bb6d]" : "cursor-default border-parchment/30"} ${completed ? "!border-mint/60 !bg-mint/10 !text-mint" : ""}`}
              >
                <span className="text-lg font-black sm:text-xl" aria-hidden="true">
                  {completed ? "✓" : meta.icon}
                </span>
                <span className="min-w-0 text-[8px] font-black uppercase leading-tight tracking-wide sm:text-[9px]">
                  {meta.label}
                </span>
                <span className="absolute right-1.5 top-1 font-mono text-[7px] opacity-45 sm:text-[8px]">
                  T−{maxRow - node.row}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto mt-2 flex max-w-2xl shrink-0 flex-wrap justify-center gap-x-3 gap-y-1 text-[9px] text-parchment/45 sm:text-[10px]">
        {Object.values(NODE_META).map((meta) => (
          <span key={meta.label}>
            {meta.icon} {meta.label}
          </span>
        ))}
      </div>
    </section>
  );
}

export function RewardScreen({ run }: { run: RunState }) {
  const dispatch = useGameStore((state) => state.dispatch);
  return (
    <ScreenFrame
      eyebrow="Encounter cleared"
      title="Choose one reward"
      description="Every choice changes this run. The other two disappear."
      narrow
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {run.rewards?.map((reward, index) => (
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            key={reward.id}
            onClick={() => dispatch({ type: "REWARD_SELECTED", rewardId: reward.id })}
            className="min-h-32 border border-parchment/20 bg-panel p-4 text-left transition-colors hover:border-gold hover:bg-[#24231f] sm:min-h-44"
          >
            <span className="text-xs font-black uppercase tracking-widest text-gold">
              {reward.kind.replace("-", " ")}
            </span>
            <strong className="mt-3 block font-display text-xl uppercase">{reward.title}</strong>
            <span className="mt-2 block text-sm leading-relaxed text-parchment/65">
              {reward.description}
            </span>
          </motion.button>
        ))}
      </div>
    </ScreenFrame>
  );
}

export function ShopScreen({ run }: { run: RunState }) {
  const dispatch = useGameStore((state) => state.dispatch);
  return (
    <ScreenFrame
      eyebrow={`${run.currency} coins`}
      title="The Counting House"
      description="Everything has a price. Leaving closes the shop for this run."
      narrow
    >
      <div className="space-y-3">
        {run.shop?.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 border border-parchment/20 bg-panel p-3"
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-lg">{item.title}</strong>
              <span className="text-sm text-parchment/60">{item.description}</span>
            </div>
            <GameButton
              variant="secondary"
              disabled={item.purchased || run.currency < item.cost}
              onClick={() => dispatch({ type: "SHOP_ITEM_PURCHASED", itemId: item.id })}
              aria-label={`${item.purchased ? "Purchased" : "Buy"} ${item.title} for ${item.cost} coins`}
            >
              {item.purchased ? "Sold" : `● ${item.cost}`}
            </GameButton>
          </div>
        ))}
      </div>
      <GameButton
        className="mt-6"
        variant="quiet"
        full
        onClick={() => dispatch({ type: "SHOP_LEFT" })}
      >
        Leave shop
      </GameButton>
    </ScreenFrame>
  );
}

export function EventScreen({ run }: { run: RunState }) {
  const dispatch = useGameStore((state) => state.dispatch);
  const event = run.event;
  if (!event) return null;
  return (
    <ScreenFrame eyebrow="Unknown variable" title={event.title} description={event.body} narrow>
      <div className="grid gap-4 sm:grid-cols-2">
        {event.options.map((option) => (
          <button
            key={option.id}
            onClick={() => dispatch({ type: "EVENT_OPTION_SELECTED", optionId: option.id })}
            className="min-h-28 border border-gold/30 bg-panel p-4 text-left transition-colors hover:border-gold hover:bg-[#24231f] sm:min-h-36"
          >
            <strong className="font-display text-xl">{option.label}</strong>
            <span className="mt-3 block text-sm leading-relaxed text-parchment/65">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </ScreenFrame>
  );
}

export function RestScreen({ run }: { run: RunState }) {
  const dispatch = useGameStore((state) => state.dispatch);
  const healing = Math.min(BALANCE.restHealing, run.maxHp - run.hp);
  return (
    <ScreenFrame
      eyebrow="Safe for now"
      title="A Quiet Desk"
      description="The ticking fades. For a moment, there is time to breathe."
      narrow
    >
      <div className="mx-auto max-w-md border border-mint/35 bg-panel p-6 text-center">
        <div className="text-5xl">♥</div>
        <p className="mt-4 text-xl font-black text-mint">Recover {healing} health</p>
        <p className="mt-2 text-sm text-parchment/55">
          {run.hp} → {run.hp + healing} / {run.maxHp}
        </p>
        <GameButton className="mt-6" full onClick={() => dispatch({ type: "REST_COMPLETED" })}>
          Rest and continue
        </GameButton>
      </div>
    </ScreenFrame>
  );
}

export function UpgradeScreen() {
  const dispatch = useGameStore((state) => state.dispatch);
  return (
    <ScreenFrame eyebrow="Improve the formula" title="Choose an upgrade" narrow>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => dispatch({ type: "UPGRADE_SELECTED", upgrade: "max-hp" })}
          className="min-h-32 border border-gold/30 bg-panel p-4 text-left transition-colors hover:border-gold hover:bg-[#24231f] sm:min-h-44 sm:p-5"
        >
          <span className="text-3xl text-yellow-400">♥+</span>
          <strong className="mt-4 block font-display text-2xl">Stronger Nerves</strong>
          <span className="mt-2 block text-sm text-parchment/65">
            Gain {BALANCE.upgradeMaxHp} maximum health and heal the same amount.
          </span>
        </button>
        <button
          onClick={() => dispatch({ type: "UPGRADE_SELECTED", upgrade: "focus" })}
          className="min-h-32 border border-gold/30 bg-panel p-4 text-left transition-colors hover:border-gold hover:bg-[#24231f] sm:min-h-44 sm:p-5"
        >
          <span className="text-3xl text-gold">◷+</span>
          <strong className="mt-4 block font-display text-2xl">Clearer Thinking</strong>
          <span className="mt-2 block text-sm text-parchment/65">
            Gain {BALANCE.upgradeFocusSeconds} permanent seconds for every future puzzle.
          </span>
        </button>
      </div>
    </ScreenFrame>
  );
}

export function EndScreen({ run, victory }: { run: RunState; victory: boolean }) {
  const dispatch = useGameStore((state) => state.dispatch);
  return (
    <section className="flex h-full items-center overflow-hidden px-4 py-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-xl"
      >
        <div className={`font-display text-5xl ${victory ? "text-gold" : "text-coral"}`}>
          {victory ? "★" : "×"}
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-parchment/45">
          Seed {run.seed}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase sm:text-6xl">
          {victory ? "Clock stopped" : "Time's up"}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-parchment/65">
          {victory
            ? "The last answer lands. For once, the clock has nothing left to say."
            : (run.defeatReason ?? "The numbers got the final word.")}
        </p>
        <div className="mt-6 flex justify-center gap-4 text-sm text-parchment/50">
          <span>{run.relicIds.length} relics</span>
          <span>+{run.focusBonusSeconds}s focus</span>
          <span>{run.currency} coins</span>
        </div>
        <GameButton className="mt-8" onClick={() => dispatch({ type: "RETURNED_TO_TITLE" })}>
          Return to title
        </GameButton>
      </motion.div>
    </section>
  );
}
