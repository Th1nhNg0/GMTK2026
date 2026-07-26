export type EncounterType = "normal" | "elite" | "boss";

export interface EnemyIntentTemplate {
  id: string;
  type: "attack" | "defend" | "heal" | "weaken";
  value: number;
  label: string;
  description: string;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  epithet: string;
  type: EncounterType;
  maxHp: number;
  passive?: {
    name: string;
    description: string;
    exactDamageBonus: number;
  };
  intents: EnemyIntentTemplate[];
}

export type RelicEffect =
  | { type: "damage-bonus"; amount: number }
  | { type: "exact-bonus"; amount: number }
  | { type: "first-round-bonus"; amount: number }
  | { type: "incoming-reduction"; amount: number }
  | { type: "start-armor"; amount: number }
  | { type: "currency-bonus"; amount: number }
  | { type: "divisible-by-seven-bonus"; amount: number }
  | { type: "close-call"; maxDistance: number; damage: number };

export interface RelicDefinition {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "boss";
  stackable: boolean;
  effects: RelicEffect[];
}

export type ConsumableEffect =
  | { type: "add-time"; seconds: number }
  | { type: "damage-enemy"; amount: number }
  | { type: "heal-player"; amount: number }
  | { type: "gain-armor"; amount: number }
  | { type: "double-next-damage" };

export interface ConsumableDefinition {
  id: string;
  name: string;
  description: string;
  effect: ConsumableEffect;
}

export type EventEffect =
  | { type: "heal"; amount: number }
  | { type: "damage"; amount: number }
  | { type: "currency"; amount: number }
  | { type: "relic"; relicId: string }
  | { type: "consumable"; consumableId: string };

export interface EventOptionDefinition {
  id: string;
  label: string;
  description: string;
  effects: EventEffect[];
}

export interface EventDefinition {
  id: string;
  title: string;
  body: string;
  options: EventOptionDefinition[];
}
