# LAST SUM STANDING

A 45-second arithmetic roguelike made for GMTK Game Jam 2026 and its **Countdown** theme.

Created by [th1nhng0](https://thinhcorner.com).

Six numbers enter. One answer leaves. Build legal whole-number equations, turn their results into new operands, and fight your way up a branching run before the clock reaches zero.

Puzzle difficulty is directed rather than randomly selected. Early floors use readable two-step targets, the middle introduces three-step solutions, late elites require four steps, and the boss advances to five-step targets. Every displayed target is selected from values that are exactly reachable with the current six numbers. Hands use a stable Countdown-style composition of one large and five small numbers.

Encounters continue until either the monster or the player runs out of health. The combat header records exact, close, and missed attempts, while each submitted answer passes through an Answer → Accuracy → Power score sequence before impact.

Each new fight opens with an opponent reveal showing the monster's health, opening intent, and any special passive. The puzzle clock starts only when the player begins the puzzle.

## Play locally

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Choose two number tiles and an operator in any order. The equation resolves automatically when all three choices are ready. Only positive whole-number results are legal. Exact answers submit immediately; otherwise submit the closest result before the 45-second timer ends.

Keyboard controls:

- `1`–`9`: select an available tile by its displayed shortcut
- `+`, `-`, `*`, `/`: select an operator
- `U`: undo the latest operation
- `S`: submit the closest created result

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser suite covers Chromium, Firefox, and a mobile WebKit profile. It also verifies that the game stays inside the viewport and confines scrolling to the route map.

The unit suite also plays 50 seeded runs end to end using only legal arithmetic and normal game actions. This guards against generated targets or late-game balance combinations that would defeat an otherwise exact player.

## itch.io release

```powershell
npm run release
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create-itch-assets.ps1
```

Upload `release/last-sum-standing-html5.zip` as an HTML game and select **This file will be played in the browser**. Recommended page copy, embed settings, tags, and the final human checklist are in [itch-assets/ITCH_IO_PAGE.md](itch-assets/ITCH_IO_PAGE.md).

The Vite build uses relative asset paths and has no server or network dependency. Runs, volume, mute, and reduced-motion preferences are intentionally memory-only; refreshing or closing the page destroys them.

The cover and banner are generated locally from simple geometric drawing code. No generated-image assets are used.

## Art credit

Monster illustrations are from the [FREE RPG Monster Pack by Pipoya](https://pipoya.itch.io/free-rpg-monster-pack), used and adapted under the pack's commercial/personal-use license. The pack permits game use and editing but not redistribution or resale as a standalone asset pack.
