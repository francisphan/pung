# Pung

Hong Kong mahjong you can actually play: against three opponents, or with friends around one table, in the browser, with nothing to install. 碰 (pung) is the call for claiming a discard to complete a set.

Live: https://francisphan.github.io/pung/

Pung is the sibling of [Sparrow](https://francisphan.github.io/sparrow/), which teaches the game from the first tile. Sparrow explains; Pung deals.

## The game

- **A full table.** 144 tiles, four seats, flowers set aside and replaced, a wall that runs down to the last tile. The dealer keeps the deal after a win or a drawn hand; the round wind turns after four dealerships. Play one East round or all four.
- **Every call.** Chow from the player before you, pung and kong from anyone, concealed and added kongs with a replacement draw, robbing a kong, self-drawn wins and wins on a discard. Priority is win, then pung or kong, then chow.
- **Hong Kong scoring.** Faan for all chows, all pungs, mixed and pure one suit, dragon and wind pungs, self-draw, a concealed hand, flowers, win on the kong, the last tile and robbing the kong, the jade, ruby and pearl dragon hands at ten faan (three pungs of one suit, a pung of its dragon and a pair of the suit), plus the limit hands: big and little three dragons, big and little four winds, all honours, all terminals, thirteen orphans, nine gates, four kongs, heavenly and earthly hands. A three-faan minimum by default (or one, or none), a thirteen-faan limit, points on the half-spicy-up table, and half payment from the two players who did not throw the winning tile.
- **Opponents that play fair.** Mei, Bo and Ling see only what a player at the table sees: their own rack, the open melds, the discards and the flowers. They judge a discard by how many tiles still bring the hand closer, and they only open a hand when it can still reach the minimum.
- **Friends at the table.** Host a table, share its four-letter code or link, and everyone picks a seat. Any seat left empty gets one of the bots when the host deals. The host's browser runs the table; the others connect to it directly, with nothing to install or deploy. A player who drops out keeps their seat and comes back to it; after twenty seconds away a bot moves for them until they return. See *Playing with friends*.
- **A table log.** Every deal, flower, discard, claim and win, with the tile shown, from your point of view: "Bo discarded Five of characters", "Ling pung on Bo's White dragon", "You win by self-draw". It sits beside the table on a wide screen and under your rack on a narrow one, scrolls back through earlier hands, and can be hidden.
- **The tiles you know.** Faces are the classic designs found on most sets, by Cangjie6 on Wikimedia Commons (CC BY-SA 4.0, see `CREDITS.md`), served as one optimised SVG sprite.
- **Soft sounds from the table.** A low wooden knock when a tile is set down, a lighter one when you pick one up, two or three for a claim, a muffled rummage as each hand is dealt, and a run of pieces when a winning hand is laid out. They are cut from CC0 recordings of chess pieces on a board (see `CREDITS.md`), kept quiet and low, and served from this site as MP3 files totalling under 200 KB, played through audio elements so they work on an iPad even with the ringer muted. "Sound off" in the masthead mutes them and the choice is remembered.
- **Three pages.** The front page (`/pung/`) is the solo game; *With friends* (`/pung/friends/`) hosts and joins tables; *Learn to play* (`/pung/learn/`) holds the guided round. Each is a real address (the build writes an `index.html` into each folder), so links, bookmarks and the back button work, and the page switches in place on a tap.
- **A guided round for a first game.** *Play a guided round* on the learn page deals a fixed East round at a 1-faan table in which the coach picks every move: one tile on your rack glows, the line above it says why that tile, and in a claim window only the right button works. Short lessons appear the first time something new happens (the deal, a hand taking shape, a claim, a win, the second hand), with the rule of thumb that good-looking hands score more running through them, each result card explains how the hand was counted, and the round ends with a word on what a full game adds. The chosen deal starts you with two dragon pairs, which the lesson points at, so you pung them both and win the first hand on 3 faan; later hands bring a chow, two kongs, two opponents' wins, and a round you finish in front.
- **Pick up where you left off.** A solo game is saved in the browser after every move. An online table is remembered too: reload the page and you are back in your seat, and a host's reload brings the whole table back.

## Controls

Tap a tile to pick it up, tap it again to discard. When a discard suits your hand the table offers the claims you are allowed, with Pass beside them; a self-drawn win and any kong appear as buttons on your turn. Arrow keys move along the rack, Enter picks and discards, Escape puts a tile back.

Designed for an iPad held either way, and it works on a phone or a desktop.

## Playing with friends

Nothing to set up: the host's browser runs the table. The site on GitHub Pages is static, and the game, the bots and every player's view live in the host's page; friends' browsers connect to it directly over WebRTC. A public signalling service (PeerJS's) makes the introduction, which is how a four-letter code finds the right browser; after that no game data passes through anyone else.

- **Host.** On the friends page, give your name and tap *Host a table*. You get a code such as `QBAP` and a link (`…/pung/friends/?join=QBAP`). You sit at East, which deals first. Keep the page open and in the foreground while you play: if it closes, the table closes for everyone (you are asked first when friends are at it). Reloading the page is fine; the table comes back from a copy kept in the browser and the others reconnect to it.
- **Join.** Friends enter the code, or open the link, and take the next open seat. Tapping another seat moves there; the host can put a bot on any open seat, or take one off, before dealing.
- **Deal.** The host chooses the rules and taps *Deal*. Open seats get bots. Only the host deals the next hand; everyone else sees the result card until then. When the game ends the host can play again at the same table with the same seats.
- **Dropping out.** A guest who closes the tab, loses the network or whose iPad goes to sleep keeps their seat. Come back to the same page and you rejoin; opening the table in a second window moves you to that window. After twenty seconds away a bot plays your turns and claims until you return. *Leave table* gives your hand to a bot for the rest of the game, or opens the seat if the game has not started. Someone arriving with the code during a game takes over a bot's seat.
- **Fairness.** Each guest's browser is sent only what its seat may see: its own rack, the open melds, the discards, and how many tiles the others and the wall still hold. The host's browser holds the whole table, so the host could in principle read the code's memory; among friends that is the same trust as handling the physical wall.
- **If a browser cannot connect.** Most home and office networks connect directly; the rest go through a free public relay. A browser without WebRTC cannot host or join and the lobby says so.

**A table server instead.** For tables that must outlive the host's page (a tournament, a host on a flaky connection), the same room logic runs in a small Node WebSocket server, `server/`, which then runs the game and the bots and lets anyone, host included, drop out and come back. See *Deploy*. With a server configured, hosting and joining go through it and nothing is hosted in a browser.

## Metrics

Set the repository variable `PUNG_GOATCOUNTER` to a [GoatCounter](https://www.goatcounter.com/) site, such as `https://pung.goatcounter.com`, and the build loads its script: page views plus a dozen named events (`deal/solo`, `deal/tutorial`, `tutorial/end`, `deal/table/2p`, `rules/min-3`, `hand/win/person`, `hand/win/bot`, `hand/draw`, `game/end`, `table/host`, `table/join`, `table/host-failed`, `table/join-failed`; the list is in `src/metrics.ts`). GoatCounter sets no cookies and keeps no personal data, so there is no banner, and it skips localhost by itself. A table's deals and hands are counted by its host only. Without the variable nothing is loaded or counted.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173; hosting and joining work between two browsers (or two origins, localhost and 127.0.0.1)
npm run server:dev   # the optional table server on ws://localhost:8787; open the site once with ?server=ws://localhost:8787 to use it
npm test             # vitest: tiles, hand validator, shanten, scoring, game engine, full AI games, views, protocol, rooms
npm run lint
npm run build        # tsc + vite, output in dist/
npm run server:build # bundles the server into dist-server/index.mjs
```

React 19, TypeScript, Vite. No UI library. The engine in `src/engine/` is pure and serialisable: `game.ts` is a reducer over a plain `GameState`, `scoring.ts` counts faan, `shanten.ts` measures how far a hand is from ready, `ai.ts` turns that into decisions, and `view.ts` cuts a `GameState` down to what one seat may see. The same engine runs in the browser for solo play and in the table server for online play. The tile set and the hand validator are shared with Sparrow.

A table is `src/table/room.ts`: members, seats, bots, stand-ins for absent players and the game itself, pure apart from a clock and an outbox, so `room.test.ts` drives it with fake timers. `src/net/protocol.ts` is the wire format, with validation of everything a browser sends. In the browser, `src/net/host.ts` runs a room and lets guests in over data links from `src/net/broker.ts` (PeerJS, loaded on demand, behind a small interface that `src/test/fakeBroker.ts` also implements, so `p2p.test.ts` runs a host and guests in memory); `src/net/peerLink.ts` is a guest's reconnecting link to a host, `src/net/client.ts` the same over a WebSocket to the server, and `src/hooks/useRoom.ts` the seat's state in React. The server, `server/index.ts`, is the same room behind a `ws` endpoint, bundled with Vite's SSR build so the engine's extensionless imports need no special runtime. `VITE_PUNG_ICE` (a JSON array of ICE servers) replaces the default STUN and relay servers.

To rebuild the classic tile sprite, download Cangjie6's `MJ*-.svg` files from Wikimedia Commons into a folder and run `npm run tiles -- <folder>`; the mapping from file names to tile ids is in `scripts/build-tiles.mjs`.

## Deploy

**The site.** Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages. The Vite `base` is `/pung/` in production builds. `ci.yml` runs lint, build and tests on pull requests.

**The table server (optional).** Any host that runs Node 22 or newer and accepts WebSockets will do. `Dockerfile` builds a small image (`npm run server:build`, then `node dist-server/index.mjs`) for Railway, Fly.io or a container host; a VPS or an always-on machine can run the same two commands, and `tailscale funnel 8787` exposes a machine on a tailnet to the internet with HTTPS. The server listens on `PORT` (default 8787), answers `GET /healthz`, and takes an optional `PUNG_ORIGINS` (comma-separated page origins allowed to connect, for example `https://francisphan.github.io`). Rooms live in memory: a restart ends the tables in progress, and a room with nobody connected for fifteen minutes is dropped.

**Telling the site where the server is.** Set the repository variable `PUNG_SERVER_URL` to the server's `wss://…` address; `deploy.yml` passes it to the build as `VITE_PUNG_SERVER`. Without it tables are hosted in the host's browser. To try a server from any copy of the site, open `…/pung/?server=wss://host:port` once; the override is kept in that browser until `?server=` (empty) clears it.
