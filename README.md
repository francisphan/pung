# Pung

Hong Kong mahjong you can actually play: you against three opponents, in the browser, with nothing to install. 碰 (pung) is the call for claiming a discard to complete a set.

Live: https://francisphan.github.io/pung/

Pung is the sibling of [Sparrow](https://francisphan.github.io/sparrow/), which teaches the game from the first tile. Sparrow explains; Pung deals.

## The game

- **A full table.** 144 tiles, four seats, flowers set aside and replaced, a wall that runs down to the last tile. The dealer keeps the deal after a win or a drawn hand; the round wind turns after four dealerships. Play one East round or all four.
- **Every call.** Chow from the player before you, pung and kong from anyone, concealed and added kongs with a replacement draw, robbing a kong, self-drawn wins and wins on a discard. Priority is win, then pung or kong, then chow.
- **Hong Kong scoring.** Faan for all chows, all pungs, mixed and pure one suit, dragon and wind pungs, self-draw, a concealed hand, flowers, win on the kong, the last tile and robbing the kong, plus the limit hands: big and little three dragons, big and little four winds, all honours, all terminals, thirteen orphans, nine gates, four kongs, heavenly and earthly hands. A three-faan minimum by default (or one, or none), a thirteen-faan limit, points on the half-spicy-up table, and half payment from the two players who did not throw the winning tile.
- **Opponents that play fair.** Mei, Bo and Ling see only what a player at the table sees: their own rack, the open melds, the discards and the flowers. They judge a discard by how many tiles still bring the hand closer, and they only open a hand when it can still reach the minimum.
- **The tiles you know.** Faces are the classic designs found on most sets, by Cangjie6 on Wikimedia Commons (CC BY-SA 4.0, see `CREDITS.md`), served as one optimised SVG sprite. The line-art faces drawn for Sparrow are still there as an option in the lobby.
- **Sounds from the table.** Tiles clack on the felt when thrown, click when picked up, land in pairs for a claim, clatter as each hand is washed and dealt, and run down the rack when a winning hand is laid out. All of it is synthesised in the browser with the Web Audio API, so nothing is downloaded; "Sound off" in the masthead mutes it and the choice is remembered.
- **Pick up where you left off.** The game is saved in the browser after every move.

## Controls

Tap a tile to pick it up, tap it again to discard. When a discard suits your hand the table offers the claims you are allowed, with Pass beside them; a self-drawn win and any kong appear as buttons on your turn. Arrow keys move along the rack, Enter picks and discards, Escape puts a tile back.

Designed for an iPad held either way, and it works on a phone or a desktop.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest: tiles, hand validator, shanten, scoring, game engine, full AI games
npm run lint
npm run build      # tsc + vite, output in dist/
```

React 19, TypeScript, Vite. No UI library. The engine in `src/engine/` is pure and serialisable: `game.ts` is a reducer over a plain `GameState`, `scoring.ts` counts faan, `shanten.ts` measures how far a hand is from ready, and `ai.ts` turns that into decisions. The tile set, the hand validator and the line-art tiles are shared with Sparrow.

To rebuild the classic tile sprite, download Cangjie6's `MJ*-.svg` files from Wikimedia Commons into a folder and run `npm run tiles -- <folder>`; the mapping from file names to tile ids is in `scripts/build-tiles.mjs`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages. The Vite `base` is `/pung/` in production builds. `ci.yml` runs lint, build and tests on pull requests.
