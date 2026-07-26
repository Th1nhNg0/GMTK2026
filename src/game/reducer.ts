import { BALANCE } from "../content/balance";
import { CONSUMABLES } from "../content/consumables";
import { ENEMIES } from "../content/enemies";
import { EVENTS } from "../content/events";
import { RELICS } from "../content/relics";
import type { EngineTransition, GameEffect } from "./effects";
import type {
  ConsumableDefinition,
  EnemyDefinition,
  EncounterType,
  EventEffect,
  RelicEffect,
} from "./content/types";
import { completeCurrentNode, generateMap, selectMapNode } from "./map/map";
import { createPuzzle } from "./puzzle/createPuzzle";
import { puzzleDifficultyFor } from "./puzzle/difficulty";
import { generateTarget } from "./puzzle/generateTarget";
import { reducePuzzle } from "./puzzle/puzzleReducer";
import type { PuzzleResolution } from "./puzzle/types";
import { createRng, randomInt, shuffle } from "./rng";
import { createEncounterSequence, createNumberSet, drawHand, recycleHand } from "./run/numbers";
import type {
  EncounterState,
  GameAction,
  GameScreen,
  GameState,
  RewardKind,
  RewardOption,
  RunState,
  ShopItem,
} from "./run/types";

export const initialGameState: GameState = { screen: "title" };

function result(state: GameState, effects: GameEffect[] = []): EngineTransition<GameState> {
  return { state, effects };
}

function message(state: GameState, text: string): EngineTransition<GameState> {
  return result(state, [{ type: "MESSAGE", message: text }]);
}

function relicEffects(run: RunState): RelicEffect[] {
  return run.relicIds.flatMap((id) => RELICS.find((relic) => relic.id === id)?.effects ?? []);
}

function startArmor(run: RunState): number {
  return relicEffects(run)
    .filter((effect) => effect.type === "start-armor")
    .reduce((total, effect) => total + effect.amount, 0);
}

export function encounterPuzzleBudget(enemyMaxHp: number): number {
  return Math.ceil(enemyMaxHp / BALANCE.expectedReliableDamage) + BALANCE.recoveryPuzzleBuffer;
}

function encounterFloor(run: RunState): number {
  const current = run.map.nodes.find((node) => node.id === run.currentNodeId);
  return (current?.row ?? 0) + 1;
}

function pickEnemyIntent(definition: EnemyDefinition, rng: RunState["rng"], round: number) {
  const intent = definition.intents[(round - 1) % definition.intents.length];
  if (!intent) throw new Error(`Enemy ${definition.id} has no intents`);
  return { intent, rng };
}

function createEncounter(run: RunState, type: EncounterType): RunState {
  const candidates = ENEMIES.filter((enemy) => enemy.type === type);
  const floor = encounterFloor(run);
  const definition = candidates[(floor - 1) % candidates.length];
  if (!definition) throw new Error(`No enemy content exists for ${type}`);

  const encounterSequence = createEncounterSequence(run.numberSet, run.rng);
  const drawn = drawHand(encounterSequence.numberSequence, encounterSequence.rng);
  const handValues = drawn.hand.map((cardId) => {
    const card = run.numberSet.find((candidate) => candidate.definitionId === cardId);
    if (!card) throw new Error(`Missing number card ${cardId}`);
    return card.value;
  });
  const target = generateTarget(handValues, drawn.rng, puzzleDifficultyFor(floor, type, 1));
  const intentPick = pickEnemyIntent(definition, target.rng, 1);

  const encounterId = `${run.currentNodeId ?? "debug"}:${definition.id}`;
  const cardsById = new Map(run.numberSet.map((card) => [card.definitionId, card]));
  const puzzle = {
    ...createPuzzle(
      `${encounterId}:puzzle:1`,
      target.target,
      drawn.hand.map((cardId, index) => {
        const card = cardsById.get(cardId);
        if (!card) throw new Error(`Missing number card ${cardId}`);
        return {
          tileId: `${encounterId}:puzzle:1:source:${index}`,
          sourceDefinitionId: card.definitionId,
          value: card.value,
        };
      }),
      target.minimumOperations,
    ),
    timeBonusSeconds: run.focusBonusSeconds,
  };
  const encounter: EncounterState = {
    encounterId,
    type,
    roundIndex: 1,
    maxRounds: encounterPuzzleBudget(definition.maxHp),
    roundHistory: [],
    enemy: {
      enemyId: definition.id,
      name: definition.name,
      epithet: definition.epithet,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      armor: 0,
      currentIntent: intentPick.intent,
    },
    numberSequence: drawn.numberSequence,
    handCardIds: drawn.hand,
    puzzle,
    status: "puzzle",
  };
  return { ...run, rng: intentPick.rng, armor: startArmor(run), encounter };
}

function nextPuzzle(run: RunState): RunState {
  const encounter = run.encounter;
  if (!encounter) return run;
  const roundIndex = encounter.roundIndex + 1;
  const drawn = drawHand(encounter.numberSequence, run.rng);
  const handValues = drawn.hand.map((cardId) => {
    const card = run.numberSet.find((candidate) => candidate.definitionId === cardId);
    if (!card) throw new Error(`Missing number card ${cardId}`);
    return card.value;
  });
  const floor = encounterFloor(run);
  const target = generateTarget(
    handValues,
    drawn.rng,
    puzzleDifficultyFor(floor, encounter.type, roundIndex),
  );
  const definition = ENEMIES.find((enemy) => enemy.id === encounter.enemy.enemyId);
  if (!definition) throw new Error(`Missing enemy ${encounter.enemy.enemyId}`);
  const intentPick = pickEnemyIntent(definition, target.rng, roundIndex);
  const cardsById = new Map(run.numberSet.map((card) => [card.definitionId, card]));
  const puzzleId = `${encounter.encounterId}:puzzle:${roundIndex}`;
  const puzzle = {
    ...createPuzzle(
      puzzleId,
      target.target,
      drawn.hand.map((cardId, index) => {
        const card = cardsById.get(cardId);
        if (!card) throw new Error(`Missing number card ${cardId}`);
        return {
          tileId: `${puzzleId}:source:${index}`,
          sourceDefinitionId: cardId,
          value: card.value,
        };
      }),
      target.minimumOperations,
    ),
    timeBonusSeconds: run.focusBonusSeconds,
  };
  return {
    ...run,
    rng: intentPick.rng,
    encounter: {
      ...encounter,
      roundIndex,
      puzzle,
      handCardIds: drawn.hand,
      numberSequence: drawn.numberSequence,
      status: "puzzle",
      lastRound: undefined,
      enemy: { ...encounter.enemy, currentIntent: intentPick.intent },
    },
  };
}

function calculatePlayerDamage(
  run: RunState,
  encounter: EncounterState,
  resolution: PuzzleResolution,
): number {
  let damage: number = resolution.baseDamage;
  const effects = relicEffects(run);
  if (
    damage === 0 &&
    resolution.distance !== undefined &&
    effects.some(
      (effect) => effect.type === "close-call" && resolution.distance! <= effect.maxDistance,
    )
  ) {
    damage = Math.max(
      ...effects.filter((effect) => effect.type === "close-call").map((effect) => effect.damage),
    );
  }
  if (damage > 0) {
    const enemyDefinition = ENEMIES.find((enemy) => enemy.id === encounter.enemy.enemyId);
    if (resolution.distance === 0 && enemyDefinition?.passive) {
      damage += enemyDefinition.passive.exactDamageBonus;
    }
    for (const effect of effects) {
      if (effect.type === "damage-bonus") damage += effect.amount;
      if (effect.type === "exact-bonus" && resolution.distance === 0) damage += effect.amount;
      if (effect.type === "first-round-bonus" && encounter.roundIndex === 1)
        damage += effect.amount;
      if (
        effect.type === "divisible-by-seven-bonus" &&
        resolution.submittedValue !== undefined &&
        resolution.submittedValue % 7 === 0
      ) {
        damage += effect.amount;
      }
    }
    damage = Math.max(0, damage - run.weakenedBy);
    if (run.doubleNextDamage) damage *= 2;
  }
  return damage;
}

function applyEnemyIntent(
  run: RunState,
  encounter: EncounterState,
): { run: RunState; encounter: EncounterState; action: string; damageTaken: number } {
  const intent = encounter.enemy.currentIntent;
  let nextRun = run;
  let enemy = encounter.enemy;
  let action = "The enemy waits.";
  let damageTaken = 0;

  if (intent.type === "attack") {
    const reduction = relicEffects(run)
      .filter((effect) => effect.type === "incoming-reduction")
      .reduce((total, effect) => total + effect.amount, 0);
    const incoming = Math.max(0, intent.value - reduction);
    const absorbed = Math.min(run.armor, incoming);
    damageTaken = incoming - absorbed;
    nextRun = {
      ...nextRun,
      armor: run.armor - absorbed,
      hp: Math.max(0, run.hp - damageTaken),
    };
    action = `${enemy.name} attacks for ${damageTaken} damage${absorbed ? ` (${absorbed} blocked)` : ""}.`;
  } else if (intent.type === "defend") {
    enemy = { ...enemy, armor: enemy.armor + intent.value };
    action = `${enemy.name} gains ${intent.value} armor.`;
  } else if (intent.type === "heal") {
    const healed = Math.min(intent.value, enemy.maxHp - enemy.hp);
    enemy = { ...enemy, hp: enemy.hp + healed };
    action = `${enemy.name} recovers ${healed} health.`;
  } else if (intent.type === "weaken") {
    nextRun = { ...nextRun, weakenedBy: Math.max(run.weakenedBy, intent.value) };
    action = `${enemy.name} weakens your next answer by ${intent.value} damage.`;
  }

  return { run: nextRun, encounter: { ...encounter, enemy }, action, damageTaken };
}

function resolveRound(
  run: RunState,
  resolution: PuzzleResolution,
): {
  run: RunState;
  screen: GameScreen;
  effects: GameEffect[];
} {
  const encounter = run.encounter;
  if (!encounter) return { run, screen: "map", effects: [] };
  const finalDamage = calculatePlayerDamage(run, encounter, resolution);
  const absorbed = Math.min(encounter.enemy.armor, finalDamage);
  const hpDamage = finalDamage - absorbed;
  let enemy = {
    ...encounter.enemy,
    armor: encounter.enemy.armor - absorbed,
    hp: Math.max(0, encounter.enemy.hp - hpDamage),
  };
  const actualHpDamage = encounter.enemy.hp - enemy.hp;
  const finalResolution = { ...resolution, finalDamage };
  const attempt = {
    puzzleNumber: encounter.roundIndex,
    outcome:
      resolution.distance === 0
        ? ("solved" as const)
        : finalDamage > 0
          ? ("partial" as const)
          : ("failed" as const),
    submittedValue: resolution.submittedValue,
    distance: resolution.distance,
    damageDealt: finalDamage,
  };
  const roundHistory = [...encounter.roundHistory, attempt];
  const recycledSequence = recycleHand(encounter.numberSequence, encounter.handCardIds);
  let nextRun: RunState = {
    ...run,
    weakenedBy: 0,
    doubleNextDamage: false,
  };
  const effects: GameEffect[] =
    finalDamage > 0 ? [{ type: "ENEMY_DAMAGED", amount: finalDamage }] : [];

  if (enemy.hp <= 0) {
    const wonEncounter: EncounterState = {
      ...encounter,
      enemy,
      roundHistory,
      numberSequence: recycledSequence,
      puzzle: { ...encounter.puzzle, resolution: finalResolution },
      status: "won",
      lastRound: {
        resolution: finalResolution,
        damageDealt: finalDamage,
        armorBlocked: absorbed,
        hpDamage: actualHpDamage,
        enemyHpBefore: encounter.enemy.hp,
        enemyHpAfter: enemy.hp,
        enemyAction: `${enemy.name} is defeated before it can act.`,
        playerDamageTaken: 0,
      },
    };
    return { run: { ...nextRun, encounter: wonEncounter }, screen: "encounter", effects };
  }

  const acted = applyEnemyIntent(nextRun, { ...encounter, enemy });
  nextRun = acted.run;
  enemy = acted.encounter.enemy;
  const enemyRetaliated = encounter.enemy.currentIntent.type === "attack";
  const resolvedEncounter: EncounterState = {
    ...encounter,
    enemy,
    roundHistory,
    numberSequence: recycledSequence,
    puzzle: { ...encounter.puzzle, resolution: finalResolution },
    status: "resolved",
    lastRound: {
      resolution: finalResolution,
      damageDealt: finalDamage,
      armorBlocked: absorbed,
      hpDamage: actualHpDamage,
      enemyHpBefore: encounter.enemy.hp,
      enemyHpAfter: enemy.hp,
      enemyAction: acted.action,
      playerDamageTaken: acted.damageTaken,
    },
  };
  nextRun = { ...nextRun, encounter: resolvedEncounter };
  if (acted.damageTaken > 0) effects.push({ type: "PLAYER_DAMAGED", amount: acted.damageTaken });

  if (nextRun.hp <= 0) {
    return {
      run: { ...nextRun, status: "defeat", defeatReason: "Your health reached zero." },
      screen: enemyRetaliated ? "encounter" : "defeat",
      effects,
    };
  }
  if (encounter.roundIndex >= encounter.maxRounds) {
    return {
      run: {
        ...nextRun,
        status: "defeat",
        defeatReason: `${enemy.name} survived all ${encounter.maxRounds} puzzles.`,
      },
      screen: enemyRetaliated ? "encounter" : "defeat",
      effects,
    };
  }
  return { run: nextRun, screen: "encounter", effects };
}

const REWARD_KINDS: RewardKind[] = ["relic", "consumable", "currency", "heal"];

function buildReward(
  run: RunState,
  kind: RewardKind,
  index: number,
): { run: RunState; option: RewardOption } {
  const id = `reward-${run.currentNodeId}-${index}`;
  if (kind === "currency") {
    return {
      run,
      option: { id, kind, title: "Coin Cache", description: "Gain 14 coins.", value: 14 },
    };
  }
  if (kind === "heal") {
    return {
      run,
      option: {
        id,
        kind,
        title: "Catch Your Breath",
        description: "Recover 10 health.",
        value: 10,
      },
    };
  }
  if (kind === "relic") {
    const available = RELICS.filter((relic) => relic.stackable || !run.relicIds.includes(relic.id));
    if (!available.length) return buildReward(run, "currency", index);
    const pick = randomInt(run.rng, 0, available.length - 1);
    const relic = available[pick.value];
    if (!relic) return buildReward({ ...run, rng: pick.rng }, "currency", index);
    return {
      run: { ...run, rng: pick.rng },
      option: { id, kind, title: relic.name, description: relic.description, relicId: relic.id },
    };
  }
  const pick = randomInt(run.rng, 0, CONSUMABLES.length - 1);
  const consumable = CONSUMABLES[pick.value];
  if (!consumable) return buildReward({ ...run, rng: pick.rng }, "currency", index);
  const replacing = run.consumableSlots.every(Boolean);
  return {
    run: { ...run, rng: pick.rng },
    option: {
      id,
      kind,
      title: consumable.name,
      description: `${consumable.description}${replacing ? " Replaces the leftmost consumable." : ""}`,
      consumableId: consumable.id,
    },
  };
}

function generateRewards(run: RunState): RunState {
  const kinds = shuffle(run.rng, REWARD_KINDS);
  let nextRun = { ...run, rng: kinds.rng };
  const options: RewardOption[] = [];
  for (let index = 0; index < 3; index += 1) {
    const built = buildReward(nextRun, kinds.values[index] ?? "currency", index);
    nextRun = built.run;
    options.push(built.option);
  }
  return { ...nextRun, rewards: options };
}

function applyReward(run: RunState, reward: RewardOption): RunState {
  if (reward.kind === "currency") return { ...run, currency: run.currency + (reward.value ?? 0) };
  if (reward.kind === "heal")
    return { ...run, hp: Math.min(run.maxHp, run.hp + (reward.value ?? 0)) };
  if (reward.kind === "relic" && reward.relicId && !run.relicIds.includes(reward.relicId)) {
    return { ...run, relicIds: [...run.relicIds, reward.relicId] };
  }
  if (reward.kind === "consumable" && reward.consumableId) {
    const slots = [...run.consumableSlots];
    const slot = slots.findIndex((value) => value === null);
    slots[slot >= 0 ? slot : 0] = reward.consumableId;
    return { ...run, consumableSlots: slots };
  }
  return run;
}

function generateShop(run: RunState): RunState {
  const kinds: RewardKind[] = ["relic", "consumable", "heal", "relic", "consumable"];
  let nextRun = run;
  const items: ShopItem[] = [];
  const costs: Record<string, number> = {
    relic: 38,
    consumable: 18,
    heal: 14,
  };
  for (let index = 0; index < BALANCE.shopInventorySize; index += 1) {
    const kind = kinds[index] ?? "heal";
    const built = buildReward(nextRun, kind, index);
    nextRun = built.run;
    items.push({
      ...built.option,
      id: `shop-${run.currentNodeId}-${index}`,
      cost: costs[kind] ?? 20,
      purchased: false,
    });
  }
  return { ...nextRun, shop: items };
}

function finishNode(run: RunState): RunState {
  return {
    ...run,
    map: completeCurrentNode(run.map),
    currentNodeId: undefined,
    encounter: undefined,
    rewards: undefined,
    shop: undefined,
    event: undefined,
  };
}

function addConsumable(run: RunState, consumableId: string): RunState {
  const slots = [...run.consumableSlots];
  const empty = slots.findIndex((slot) => slot === null);
  slots[empty >= 0 ? empty : 0] = consumableId;
  return { ...run, consumableSlots: slots };
}

function applyEventEffect(run: RunState, effect: EventEffect): RunState {
  if (effect.type === "heal") return { ...run, hp: Math.min(run.maxHp, run.hp + effect.amount) };
  if (effect.type === "damage") return { ...run, hp: Math.max(1, run.hp - effect.amount) };
  if (effect.type === "currency")
    return { ...run, currency: Math.max(0, run.currency + effect.amount) };
  if (effect.type === "consumable") return addConsumable(run, effect.consumableId);
  if (effect.type === "relic" && !run.relicIds.includes(effect.relicId))
    return { ...run, relicIds: [...run.relicIds, effect.relicId] };
  return run;
}

function currencyBonus(run: RunState): number {
  return relicEffects(run)
    .filter((effect) => effect.type === "currency-bonus")
    .reduce((total, effect) => total + effect.amount, 0);
}

function applyConsumable(
  run: RunState,
  slotIndex: number,
): { run: RunState; effects: GameEffect[] } | undefined {
  const encounter = run.encounter;
  const consumableId = run.consumableSlots[slotIndex];
  if (!encounter || encounter.status !== "puzzle" || !consumableId) return undefined;
  const consumable: ConsumableDefinition | undefined = CONSUMABLES.find(
    (item) => item.id === consumableId,
  );
  if (!consumable) return undefined;
  const slots = [...run.consumableSlots];
  slots[slotIndex] = null;
  let nextRun: RunState = { ...run, consumableSlots: slots };
  const effects: GameEffect[] = [{ type: "ITEM_USED", name: consumable.name }];
  const effect = consumable.effect;

  if (effect.type === "add-time") {
    nextRun = {
      ...nextRun,
      encounter: {
        ...encounter,
        puzzle: {
          ...encounter.puzzle,
          timeBonusSeconds: encounter.puzzle.timeBonusSeconds + effect.seconds,
        },
      },
    };
    effects.push({ type: "TIMER_ADDED", seconds: effect.seconds });
  } else if (effect.type === "heal-player") {
    nextRun = { ...nextRun, hp: Math.min(run.maxHp, run.hp + effect.amount) };
  } else if (effect.type === "gain-armor") {
    nextRun = { ...nextRun, armor: run.armor + effect.amount };
  } else if (effect.type === "double-next-damage") {
    nextRun = { ...nextRun, doubleNextDamage: true };
  } else if (effect.type === "damage-enemy") {
    const absorbed = Math.min(encounter.enemy.armor, effect.amount);
    const enemy = {
      ...encounter.enemy,
      armor: encounter.enemy.armor - absorbed,
      hp: Math.max(0, encounter.enemy.hp - (effect.amount - absorbed)),
    };
    const killed = enemy.hp === 0;
    nextRun = {
      ...nextRun,
      encounter: {
        ...encounter,
        enemy,
        status: killed ? "won" : "puzzle",
        puzzle: killed
          ? {
              ...encounter.puzzle,
              status: "resolved",
              resolution: { baseDamage: 0, finalDamage: 0, reason: "manual" },
            }
          : encounter.puzzle,
        lastRound: killed
          ? {
              resolution: { baseDamage: 0, finalDamage: 0, reason: "manual" },
              damageDealt: effect.amount,
              armorBlocked: absorbed,
              hpDamage: encounter.enemy.hp - enemy.hp,
              enemyHpBefore: encounter.enemy.hp,
              enemyHpAfter: enemy.hp,
              enemyAction: `${enemy.name} is defeated by the ${consumable.name}.`,
              playerDamageTaken: 0,
            }
          : undefined,
      },
    };
    effects.push({ type: "ENEMY_DAMAGED", amount: effect.amount });
  }
  return { run: nextRun, effects };
}

export function reduceGame(state: GameState, action: GameAction): EngineTransition<GameState> {
  if (action.type === "RUN_STARTED") {
    const seeded = createRng(action.seed);
    const generated = generateMap(seeded);
    const run: RunState = {
      seed: seeded.seed,
      rng: generated.rng,
      hp: BALANCE.playerMaxHp,
      maxHp: BALANCE.playerMaxHp,
      armor: 0,
      currency: 12,
      numberSet: createNumberSet(),
      focusBonusSeconds: 0,
      relicIds: [],
      consumableSlots: ["time-tonic", null, null],
      doubleNextDamage: false,
      weakenedBy: 0,
      map: generated.map,
      status: "active",
    };
    return result({ screen: "map", run }, [
      { type: "MESSAGE", message: `Run ${run.seed} started.` },
    ]);
  }
  if (action.type === "RETURNED_TO_TITLE") return result(initialGameState);
  if (action.type === "COMBAT_DEFEAT_REVEALED") {
    if (state.screen !== "encounter" || state.run?.status !== "defeat") return result(state);
    return result({ ...state, screen: "defeat" });
  }
  const run = state.run;
  if (!run || run.status !== "active") return message(state, "Start a new run first.");

  if (action.type === "DEBUG_ENCOUNTER_STARTED") {
    const debugRun = createEncounter({ ...run, currentNodeId: "debug-node" }, action.encounterType);
    return result({ screen: "encounter", run: debugRun });
  }
  if (action.type === "DEBUG_NODE_JUMPED") {
    const exists = run.map.nodes.some((node) => node.id === action.nodeId);
    if (!exists) return message(state, "Debug node does not exist.");
    const debugMap = {
      ...run.map,
      nodes: run.map.nodes.map((node) => ({
        ...node,
        status: node.id === action.nodeId ? ("available" as const) : node.status,
      })),
    };
    return reduceGame(
      { screen: "map", run: { ...run, map: debugMap } },
      {
        type: "MAP_NODE_SELECTED",
        nodeId: action.nodeId,
      },
    );
  }
  if (action.type === "DEBUG_CURRENCY_GRANTED") {
    return result({
      ...state,
      run: { ...run, currency: Math.max(0, run.currency + action.amount) },
    });
  }
  if (action.type === "DEBUG_RELIC_GRANTED") {
    const relic = RELICS.find((candidate) => candidate.id === action.relicId);
    if (!relic || (!relic.stackable && run.relicIds.includes(relic.id)))
      return message(state, "Debug relic is unavailable.");
    return result({ ...state, run: { ...run, relicIds: [...run.relicIds, relic.id] } });
  }
  if (action.type === "DEBUG_CONSUMABLE_GRANTED") {
    if (!CONSUMABLES.some((item) => item.id === action.consumableId))
      return message(state, "Debug consumable is unavailable.");
    return result({ ...state, run: addConsumable(run, action.consumableId) });
  }
  if (action.type === "DEBUG_PLAYER_HP_SET") {
    return result({ ...state, run: { ...run, hp: Math.max(1, Math.min(run.maxHp, action.hp)) } });
  }
  if (action.type === "DEBUG_ENEMY_HP_SET") {
    if (!run.encounter) return message(state, "There is no enemy to modify.");
    return result({
      ...state,
      run: {
        ...run,
        encounter: {
          ...run.encounter,
          enemy: {
            ...run.encounter.enemy,
            hp: Math.max(1, Math.min(run.encounter.enemy.maxHp, action.hp)),
          },
        },
      },
    });
  }
  if (action.type === "DEBUG_EXACT_SETUP") {
    const encounter = run.encounter;
    if (!encounter || encounter.status !== "puzzle")
      return message(state, "There is no active puzzle to prepare.");
    const sourceIds = encounter.puzzle.sourceTileIds;
    const first = sourceIds[0];
    const second = sourceIds[1];
    if (!first || !second) return message(state, "The puzzle hand is incomplete.");
    const sourceTiles = Object.fromEntries(
      sourceIds.map((tileId, index) => [
        tileId,
        {
          ...encounter.puzzle.tiles[tileId]!,
          value: index < 2 ? 50 : [1, 2, 3, 4][index - 2]!,
          status: "available" as const,
        },
      ]),
    );
    return result({
      ...state,
      run: {
        ...run,
        encounter: {
          ...encounter,
          puzzle: {
            ...encounter.puzzle,
            target: 100,
            tiles: sourceTiles,
            operations: [],
            selectedTileIds: [],
            selectedOperator: undefined,
            closestResult: undefined,
            status: "active",
            resolution: undefined,
          },
        },
      },
    });
  }

  if (action.type === "MAP_NODE_SELECTED") {
    const map = selectMapNode(run.map, action.nodeId);
    const node = run.map.nodes.find((candidate) => candidate.id === action.nodeId);
    if (!map || !node) return message(state, "That route is not available.");
    let nextRun: RunState = { ...run, map, currentNodeId: node.id };
    if (node.type === "normal" || node.type === "elite" || node.type === "boss") {
      nextRun = createEncounter(nextRun, node.type);
      return result({ screen: "encounter", run: nextRun });
    }
    if (node.type === "shop") return result({ screen: "shop", run: generateShop(nextRun) });
    if (node.type === "event") {
      const pick = randomInt(nextRun.rng, 0, EVENTS.length - 1);
      return result({
        screen: "event",
        run: { ...nextRun, rng: pick.rng, event: EVENTS[pick.value] },
      });
    }
    return result({ screen: node.type, run: nextRun });
  }

  if (action.type === "PUZZLE_ACTION") {
    const encounter = run.encounter;
    if (!encounter || encounter.status !== "puzzle")
      return message(state, "There is no active puzzle.");
    const puzzleResult = reducePuzzle(encounter.puzzle, action.action);
    const nextEncounter = { ...encounter, puzzle: puzzleResult.state };
    const nextRun = { ...run, encounter: nextEncounter };
    if (
      encounter.puzzle.status === "active" &&
      puzzleResult.state.status === "resolved" &&
      puzzleResult.state.resolution
    ) {
      const round = resolveRound(nextRun, puzzleResult.state.resolution);
      return result({ screen: round.screen, run: round.run }, [
        ...puzzleResult.effects,
        ...round.effects,
      ]);
    }
    return result({ ...state, run: nextRun }, puzzleResult.effects);
  }

  if (action.type === "CONSUMABLE_USED") {
    const used = applyConsumable(run, action.slotIndex);
    return used
      ? result({ ...state, run: used.run }, used.effects)
      : message(state, "That consumable cannot be used now.");
  }

  if (action.type === "ENCOUNTER_CONTINUED") {
    const encounter = run.encounter;
    if (!encounter) return message(state, "There is no encounter to continue.");
    if (encounter.status === "won") {
      if (encounter.type === "boss") {
        return result({ screen: "victory", run: { ...run, status: "victory" } }, [
          { type: "MESSAGE", message: "The Final Examiner is defeated." },
        ]);
      }
      const coins = (encounter.type === "elite" ? 14 : 8) + currencyBonus(run);
      const rewarded = generateRewards({ ...run, currency: run.currency + coins });
      return result({ screen: "reward", run: rewarded }, [
        { type: "REWARD_GAINED", name: `${coins} combat coins` },
      ]);
    }
    if (encounter.status === "resolved") {
      return result({ screen: "encounter", run: nextPuzzle(run) });
    }
    return message(state, "Finish the current puzzle first.");
  }

  if (action.type === "REWARD_SELECTED") {
    const reward = run.rewards?.find((option) => option.id === action.rewardId);
    if (!reward) return message(state, "That reward is not available.");
    const rewarded = applyReward(run, reward);
    return result({ screen: "map", run: finishNode(rewarded) }, [
      { type: "REWARD_GAINED", name: reward.title },
    ]);
  }

  if (action.type === "SHOP_ITEM_PURCHASED") {
    const item = run.shop?.find((candidate) => candidate.id === action.itemId);
    if (!item || item.purchased) return message(state, "That item is unavailable.");
    if (run.currency < item.cost) return message(state, "You do not have enough coins.");
    const purchased = applyReward({ ...run, currency: run.currency - item.cost }, item);
    return result(
      {
        ...state,
        run: {
          ...purchased,
          shop: run.shop?.map((candidate) =>
            candidate.id === item.id ? { ...candidate, purchased: true } : candidate,
          ),
        },
      },
      [{ type: "SHOP_PURCHASED", name: item.title }],
    );
  }

  if (action.type === "SHOP_LEFT") return result({ screen: "map", run: finishNode(run) });

  if (action.type === "EVENT_OPTION_SELECTED") {
    const option = run.event?.options.find((candidate) => candidate.id === action.optionId);
    if (!option) return message(state, "That event choice is unavailable.");
    const currencyDelta = option.effects
      .filter((effect) => effect.type === "currency")
      .reduce((total, effect) => total + effect.amount, 0);
    if (run.currency + currencyDelta < 0)
      return message(state, "You do not have enough coins for that choice.");
    const changed = option.effects.reduce(
      (current, effect) => applyEventEffect(current, effect),
      run,
    );
    return result({ screen: "map", run: finishNode(changed) }, [
      { type: "MESSAGE", message: option.description },
    ]);
  }

  if (action.type === "REST_COMPLETED") {
    const healed = { ...run, hp: Math.min(run.maxHp, run.hp + BALANCE.restHealing) };
    return result({ screen: "map", run: finishNode(healed) }, [
      { type: "MESSAGE", message: `Recovered ${BALANCE.restHealing} health.` },
    ]);
  }

  if (action.type === "UPGRADE_SELECTED") {
    const upgraded =
      action.upgrade === "max-hp"
        ? {
            ...run,
            maxHp: run.maxHp + BALANCE.upgradeMaxHp,
            hp: run.hp + BALANCE.upgradeMaxHp,
          }
        : {
            ...run,
            focusBonusSeconds: run.focusBonusSeconds + BALANCE.upgradeFocusSeconds,
          };
    return result({ screen: "map", run: finishNode(upgraded) }, [
      { type: "MESSAGE", message: "Your run has been upgraded." },
    ]);
  }

  return result(state);
}
