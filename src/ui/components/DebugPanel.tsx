import { useState } from "react";
import { CONSUMABLES } from "../../content/consumables";
import { RELICS } from "../../content/relics";
import { useGameStore } from "../../store/gameStore";
import { useUiStore } from "../../store/uiStore";

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [nodeId, setNodeId] = useState("node-10-1");
  const game = useGameStore((state) => state.game);
  const effects = useGameStore((state) => state.effects);
  const dispatch = useGameStore((state) => state.dispatch);
  const timerScale = useUiStore((state) => state.debugTimerScale);
  const setTimerScale = useUiStore((state) => state.setDebugTimerScale);
  const run = game.run;
  if (!run) return null;

  const autoExact = () => {
    dispatch({ type: "DEBUG_EXACT_SETUP" });
    const puzzle = useGameStore.getState().game.run?.encounter?.puzzle;
    const first = puzzle?.sourceTileIds[0];
    const second = puzzle?.sourceTileIds[1];
    if (!first || !second) return;
    dispatch({ type: "PUZZLE_ACTION", action: { type: "TILE_SELECTED", tileId: first } });
    dispatch({ type: "PUZZLE_ACTION", action: { type: "TILE_SELECTED", tileId: second } });
    dispatch({ type: "PUZZLE_ACTION", action: { type: "OPERATOR_SELECTED", operator: "add" } });
  };

  return (
    <aside
      className={`fixed right-2 top-[4.25rem] z-[60] max-h-[80dvh] overflow-y-auto rounded-xl border border-fuchsia-400/40 bg-[#170e20]/95 text-xs shadow-2xl transition-[width] ${open ? "w-72" : "w-12"}`}
    >
      <button
        className={`flex min-h-11 w-full items-center px-3 font-black text-fuchsia-300 ${open ? "justify-between" : "justify-center"}`}
        onClick={() => setOpen(!open)}
        aria-label="Toggle developer tools"
      >
        {open ? (
          <>
            DEV TOOLS <span>×</span>
          </>
        ) : (
          <span aria-hidden="true">+</span>
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t border-fuchsia-400/20 p-3">
          <div>
            <p className="mb-1 font-bold text-parchment/50">Start encounter</p>
            <div className="grid grid-cols-3 gap-1">
              {(["normal", "elite", "boss"] as const).map((encounterType) => (
                <button
                  key={encounterType}
                  onClick={() => dispatch({ type: "DEBUG_ENCOUNTER_STARTED", encounterType })}
                  className="min-h-9 rounded bg-fuchsia-400/15 px-1"
                >
                  {encounterType}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => dispatch({ type: "DEBUG_EXACT_SETUP" })}
              className="min-h-9 rounded bg-gold/15"
            >
              Exact setup
            </button>
            <button onClick={autoExact} className="min-h-9 rounded bg-gold/15">
              Auto exact
            </button>
            <button
              onClick={() => dispatch({ type: "DEBUG_ENEMY_HP_SET", hp: 1 })}
              className="min-h-9 rounded bg-coral/15"
            >
              Enemy HP 1
            </button>
            <button
              onClick={() => dispatch({ type: "DEBUG_PLAYER_HP_SET", hp: 1 })}
              className="min-h-9 rounded bg-coral/15"
            >
              Player HP 1
            </button>
            <button
              onClick={() => dispatch({ type: "DEBUG_CURRENCY_GRANTED", amount: 50 })}
              className="min-h-9 rounded bg-gold/15"
            >
              +50 coins
            </button>
            <button
              onClick={() =>
                dispatch({
                  type: "DEBUG_RELIC_GRANTED",
                  relicId:
                    RELICS.find((relic) => !run.relicIds.includes(relic.id))?.id ?? RELICS[0]!.id,
                })
              }
              className="min-h-9 rounded bg-mint/15"
            >
              Grant relic
            </button>
            <button
              onClick={() =>
                dispatch({ type: "DEBUG_CONSUMABLE_GRANTED", consumableId: CONSUMABLES[0]!.id })
              }
              className="min-h-9 rounded bg-mint/15"
            >
              Grant item
            </button>
          </div>
          <div>
            <p className="mb-1 font-bold text-parchment/50">Timer speed: {timerScale}×</p>
            <div className="grid grid-cols-4 gap-1">
              {[0, 1, 10, 60].map((scale) => (
                <button
                  key={scale}
                  onClick={() => setTimerScale(scale)}
                  className={`min-h-9 rounded ${timerScale === scale ? "bg-fuchsia-400 text-ink" : "bg-fuchsia-400/15"}`}
                >
                  {scale}×
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1">
            <select
              value={nodeId}
              onChange={(event) => setNodeId(event.target.value)}
              className="min-w-0 flex-1 rounded bg-ink px-2"
            >
              {run.map.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.id} · {node.type}
                </option>
              ))}
            </select>
            <button
              className="min-h-9 rounded bg-fuchsia-400/15 px-2"
              onClick={() => dispatch({ type: "DEBUG_NODE_JUMPED", nodeId })}
            >
              Jump
            </button>
          </div>
          <details>
            <summary className="cursor-pointer font-bold text-parchment/50">
              Engine state and effects
            </summary>
            <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-2 text-[9px]">
              {JSON.stringify(
                {
                  screen: game.screen,
                  hp: run.hp,
                  currency: run.currency,
                  encounter: run.encounter,
                  effects,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </div>
      )}
    </aside>
  );
}
