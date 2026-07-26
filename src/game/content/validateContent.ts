import { CONSUMABLES } from "../../content/consumables";
import { ENEMIES } from "../../content/enemies";
import { EVENTS } from "../../content/events";
import { RELICS } from "../../content/relics";

function assertUnique(label: string, ids: string[]): void {
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length)
    throw new Error(`Duplicate ${label} IDs: ${[...new Set(duplicates)].join(", ")}`);
  if (ids.some((id) => !id.trim())) throw new Error(`${label} IDs cannot be empty`);
}

export function validateContent(): void {
  assertUnique(
    "enemy",
    ENEMIES.map((item) => item.id),
  );
  assertUnique(
    "relic",
    RELICS.map((item) => item.id),
  );
  assertUnique(
    "consumable",
    CONSUMABLES.map((item) => item.id),
  );
  assertUnique(
    "event",
    EVENTS.map((item) => item.id),
  );
  for (const enemy of ENEMIES)
    assertUnique(
      `intent for ${enemy.id}`,
      enemy.intents.map((intent) => intent.id),
    );
  for (const event of EVENTS)
    assertUnique(
      `option for ${event.id}`,
      event.options.map((option) => option.id),
    );

  const relicIds = new Set(RELICS.map((item) => item.id));
  const consumableIds = new Set(CONSUMABLES.map((item) => item.id));
  for (const event of EVENTS) {
    for (const option of event.options) {
      for (const effect of option.effects) {
        if (effect.type === "relic" && !relicIds.has(effect.relicId))
          throw new Error(`Event ${event.id} references missing relic ${effect.relicId}`);
        if (effect.type === "consumable" && !consumableIds.has(effect.consumableId))
          throw new Error(`Event ${event.id} references missing consumable ${effect.consumableId}`);
      }
    }
  }
}
