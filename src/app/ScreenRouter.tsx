import type { GameState } from "../game/run/types";
import { EncounterScreen } from "../ui/encounter/EncounterScreen";
import {
  EndScreen,
  EventScreen,
  MapScreen,
  RestScreen,
  RewardScreen,
  ShopScreen,
  TitleScreen,
  UpgradeScreen,
} from "../ui/screens/GameScreens";

export function ScreenRouter({ game }: { game: GameState }) {
  if (game.screen === "title" || !game.run) return <TitleScreen />;
  const run = game.run;
  if (game.screen === "map") return <MapScreen run={run} />;
  if (game.screen === "encounter") return <EncounterScreen run={run} />;
  if (game.screen === "reward") return <RewardScreen run={run} />;
  if (game.screen === "shop") return <ShopScreen run={run} />;
  if (game.screen === "event") return <EventScreen run={run} />;
  if (game.screen === "rest") return <RestScreen run={run} />;
  if (game.screen === "upgrade") return <UpgradeScreen />;
  if (game.screen === "victory") return <EndScreen run={run} victory />;
  return <EndScreen run={run} victory={false} />;
}
