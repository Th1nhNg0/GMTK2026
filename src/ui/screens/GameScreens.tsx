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
    <section className="relative flex h-full items-center overflow-hidden px-4 py-5 sm:py-8">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(245,238,223,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(245,238,223,0.04)_1px,transparent_1px),radial-gradient(circle_at_25%_20%,#f3b83b_0,transparent_24%),radial-gradient(circle_at_75%_75%,#ef6a5b_0,transparent_26%)] [background-size:32px_32px,32px_32px,auto,auto]" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto w-full max-w-3xl text-center"
      >
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-gold sm:mb-3 sm:text-xs">
          GMTK Game Jam 2026 · Countdown
        </p>
        <h1 className="font-display text-5xl font-black uppercase leading-[0.82] tracking-[-0.06em] sm:text-7xl">
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
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-parchment/70 sm:text-lg">
          Six numbers. One target. Forty-five seconds. Do the arithmetic before it does you.
        </p>
        <div className="mx-auto mt-5 grid max-w-sm gap-2.5 sm:mt-6">
          <GameButton
            onClick={() => dispatch({ type: "RUN_STARTED", seed: freshSeed() })}
            className="text-lg"
            full
          >
            Start the clock
          </GameButton>
          <GameButton variant="secondary" onClick={() => setInstructionsOpen(true)} full>
            Rules of play
          </GameButton>
        </div>
        {import.meta.env.DEV && (
          <form
            className="mx-auto mt-4 flex max-w-sm gap-2 rounded-xl border border-dashed border-parchment/20 p-2"
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
              className="min-w-0 flex-1 rounded-lg bg-ink px-3 text-parchment"
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

const NODE_META: Record<MapNodeType, { icon: string; label: string; color: string }> = {
  normal: { icon: "±", label: "Encounter", color: "border-parchment/45 text-parchment" },
  elite: { icon: "◆", label: "Elite", color: "border-coral/75 text-coral" },
  boss: { icon: "★", label: "Boss", color: "border-gold text-gold" },
  shop: { icon: "●", label: "Shop", color: "border-gold/75 text-gold" },
  event: { icon: "?", label: "Event", color: "border-violet-400/75 text-violet-300" },
  rest: { icon: "♥", label: "Rest", color: "border-mint/75 text-mint" },
  upgrade: { icon: "↑", label: "Upgrade", color: "border-sky-400/75 text-sky-300" },
};

export function MapScreen({ run }: { run: RunState }) {
  const dispatch = useGameStore((state) => state.dispatch);
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxRow = Math.max(...run.map.nodes.map((node) => node.row));
  const focusRow = Math.max(
    0,
    ...run.map.nodes.filter((node) => node.status === "available").map((node) => node.row),
  );
  const rowSpacing = 94;
  const verticalPadding = 58;
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
      <header className="mb-3 shrink-0 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">
          Seed {run.seed} · Floor {focusRow + 1} / {maxRow + 1}
        </p>
        <h1 className="mt-1 font-display text-3xl font-black tracking-tight sm:text-4xl">
          Choose your route
        </h1>
        <p className="mt-1 text-xs text-parchment/55 sm:text-sm">
          Climb upward. Only connected rooms can be entered.
        </p>
      </header>

      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-parchment/15 bg-panel/45 [background-image:radial-gradient(circle,rgba(245,238,223,0.06)_1px,transparent_1px)] [background-size:22px_22px] [scrollbar-color:#f3b83b66_transparent]"
        aria-label="Branching run map"
      >
        <div className="relative mx-auto w-full max-w-2xl" style={{ height: mapHeight }}>
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
                return (
                  <line
                    key={`${node.id}-${connectionId}`}
                    x1={xForColumn(node.column)}
                    y1={yForRow(node.row)}
                    x2={xForColumn(target.column)}
                    y2={yForRow(target.row)}
                    stroke={reachable ? "#f3b83b" : travelled ? "#70d6a5" : "#f5eedf"}
                    strokeOpacity={reachable ? 0.9 : travelled ? 0.58 : 0.22}
                    strokeWidth={reachable ? 4 : 2}
                    strokeDasharray={travelled ? undefined : "6 8"}
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
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: completed ? 0.78 : available ? 1 : 0.56 }}
                key={node.id}
                disabled={!available}
                onClick={() => dispatch({ type: "MAP_NODE_SELECTED", nodeId: node.id })}
                aria-label={`${meta.label}, ${node.status}`}
                data-map-node-status={node.status}
                style={{ left: `${((node.column + 0.5) / 3) * 100}%`, top: yForRow(node.row) }}
                className={`absolute grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-panel text-xl font-black shadow-xl transition sm:size-16 sm:text-2xl ${meta.color} ${available ? "cursor-pointer ring-4 ring-gold/35 shadow-[0_0_26px_rgba(243,184,59,0.16)] hover:scale-110 hover:bg-ink" : "cursor-default"} ${completed ? "!border-mint/60 !text-mint" : ""}`}
              >
                <span aria-hidden="true">{completed ? "✓" : meta.icon}</span>
                <span className="pointer-events-none absolute top-[calc(100%+0.25rem)] whitespace-nowrap rounded bg-ink/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-parchment/75 sm:text-[9px]">
                  {meta.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto mt-2 flex max-w-2xl shrink-0 flex-wrap justify-center gap-x-3 gap-y-1 text-[9px] text-parchment/45 sm:text-xs">
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
            className="min-h-36 rounded-2xl border border-parchment/15 bg-panel p-4 text-left transition hover:-translate-y-1 hover:border-gold/70 hover:bg-panel/85 sm:min-h-52 sm:p-5"
          >
            <span className="text-xs font-black uppercase tracking-widest text-gold">
              {reward.kind.replace("-", " ")}
            </span>
            <strong className="mt-4 block font-display text-2xl">{reward.title}</strong>
            <span className="mt-3 block text-sm leading-relaxed text-parchment/65">
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
            className="flex items-center gap-4 rounded-2xl border border-parchment/12 bg-panel p-4"
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
            className="min-h-32 rounded-2xl border border-violet-400/25 bg-panel p-4 text-left transition hover:-translate-y-1 hover:border-violet-300 sm:min-h-40 sm:p-5"
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
      <div className="mx-auto max-w-md rounded-2xl border border-mint/25 bg-panel p-7 text-center">
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

export function UpgradeScreen({ run }: { run: RunState }) {
  const dispatch = useGameStore((state) => state.dispatch);
  const smallest = Math.min(...run.numberBag.map((card) => card.value));
  return (
    <ScreenFrame eyebrow="Improve the formula" title="Choose an upgrade" narrow>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => dispatch({ type: "UPGRADE_SELECTED", upgrade: "max-hp" })}
          className="min-h-36 rounded-2xl border border-sky-400/25 bg-panel p-4 text-left transition hover:-translate-y-1 hover:border-sky-300 sm:min-h-48 sm:p-6"
        >
          <span className="text-3xl text-sky-300">♥+</span>
          <strong className="mt-4 block font-display text-2xl">Stronger Nerves</strong>
          <span className="mt-2 block text-sm text-parchment/65">
            Gain {BALANCE.upgradeMaxHp} maximum health and heal the same amount.
          </span>
        </button>
        <button
          onClick={() => dispatch({ type: "UPGRADE_SELECTED", upgrade: "refine" })}
          className="min-h-36 rounded-2xl border border-gold/25 bg-panel p-4 text-left transition hover:-translate-y-1 hover:border-gold sm:min-h-48 sm:p-6"
        >
          <span className="text-3xl text-gold">⌫</span>
          <strong className="mt-4 block font-display text-2xl">Refine the Bag</strong>
          <span className="mt-2 block text-sm text-parchment/65">
            Remove one {smallest}, your lowest-value tile.
          </span>
        </button>
      </div>
    </ScreenFrame>
  );
}

export function EndScreen({ run, victory }: { run: RunState; victory: boolean }) {
  const dispatch = useGameStore((state) => state.dispatch);
  return (
    <section className="flex min-h-dvh items-center px-4 py-12 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-xl"
      >
        <div className={`text-7xl ${victory ? "text-gold" : "text-coral"}`}>
          {victory ? "★" : "×"}
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-parchment/45">
          Seed {run.seed}
        </p>
        <h1 className="mt-3 font-display text-5xl font-black sm:text-7xl">
          {victory ? "Clock stopped" : "Time's up"}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-parchment/65">
          {victory
            ? "The last answer lands. For once, the clock has nothing left to say."
            : (run.defeatReason ?? "The numbers got the final word.")}
        </p>
        <div className="mt-6 flex justify-center gap-4 text-sm text-parchment/50">
          <span>{run.relicIds.length} relics</span>
          <span>{run.numberBag.length} tiles</span>
          <span>{run.currency} coins</span>
        </div>
        <GameButton className="mt-8" onClick={() => dispatch({ type: "RETURNED_TO_TITLE" })}>
          Return to title
        </GameButton>
      </motion.div>
    </section>
  );
}
