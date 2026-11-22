# Turf - real-time shared grid

A live board of 600 tiles (30 x 20) that everyone online plays on at the same time. Pick a name and a colour, click a tile to capture it, and every other player sees it change instantly.

Built with **MongoDB, Express, React, Node.js** (MERN) plus **Socket.IO** for the real-time layer and **Tailwind CSS** for the UI.

## Features

- Live grid, every capture is pushed to all connected players in real time
- Unclaimed tiles and tiles owned by a player (their colour, their name)
- Safe under concurrency: two people clicking the same tile at the same moment can never both win
- Rules: a **cooldown** between your captures and a **lock** that protects a freshly captured tile
- Live leaderboard, territory stats, online players and a live activity feed
- Zoom and pan (mouse wheel, drag, pinch on touch), fit-to-screen button
- Optimistic UI with rollback, capture animations, lock countdown ring, cooldown bar, toasts
- Survives refreshes (session kept in the browser) and reconnects automatically

## Tech choices

| Layer | Choice | Why |
| --- | --- | --- |
| Real-time | Socket.IO | WebSockets with automatic reconnection, acknowledgements (used for capture results) and a polling fallback |
| Backend | Node + Express | Small, familiar, easy to reason about. REST is only used for joining and health, the game runs over the socket |
| Database | MongoDB + Mongoose | One document per tile makes conflict handling a single atomic `findOneAndUpdate` |
| Validation | zod | One schema language for env, REST bodies and socket payloads |
| Frontend | React + Vite | Fast dev loop, simple state model |
| Styling | Tailwind CSS v4 | Fast to build a consistent, clean UI. Only the tile animations are hand written CSS |

## How the real-time part works

```
 Browser A ──click──▶ socket "tile:capture" ──▶ server ──▶ MongoDB (atomic update)
                                                  │
                                    success ──────┤──▶ io.emit("tile:update")  ──▶ every browser
                                                  │──▶ throttled io.emit("leaderboard")
                                    failure ──────┴──▶ ack { ok:false, code } ──▶ only the sender
```

1. The client connects with its session token. The server authenticates it in a Socket.IO middleware and answers with one `init` event: grid config, all claimed tiles, leaderboard, presence, and the player's own cooldown state.
2. A click sends `tile:capture {x, y}` with an acknowledgement callback. The tile is painted immediately (optimistic), semi-transparent, until the server confirms.
3. The server validates and rate limits the payload, runs the atomic capture, broadcasts `tile:update` to everyone, and acknowledges the sender.
4. If the capture is rejected, the optimistic tile is rolled back and a toast explains why (cooldown, locked, someone was faster).

### Conflict handling

Everything that decides a winner is a **single conditional write**, so there are no read-then-write races:

1. **Cooldown gate**: `User.findOneAndUpdate({ _id, lastCaptureAt: null | <= now - cooldown }, { lastCaptureAt: now })`
2. **Tile claim**: `Tile.findOneAndUpdate({ x, y, ownerId != me, lockedUntil: null | <= now }, { owner, capturedAt, lockedUntil })`

MongoDB serialises writes to one document, so if two players hit the same tile together exactly one update matches. The other gets `null` back, the cooldown from step 1 is refunded (a lost race should not punish the player), and the error code tells the client what happened (`LOCKED`, `ALREADY_OWNED`, `CONFLICT`).

### Keeping clients consistent

- Every payload carries a server timestamp (`capturedAt`, `at`). The client only applies data that is newer than what it already has, so out-of-order or duplicate events are harmless.
- Tile updates that arrive while the initial snapshot is still loading (or after a reconnect) are buffered and replayed on top of the snapshot, so nothing is lost in that gap.
- The client keeps an offset to the server clock, so cooldown and lock countdowns are correct even if the player's own clock is wrong.
- The leaderboard is recalculated at most every 250 ms, a burst of captures costs one aggregation instead of one per capture.

### Other backend details

- Session tokens are random 256 bit values, only their SHA-256 hash is stored in the database
- Names are unique (case insensitive) and validated, colours must come from the palette
- Per-socket token bucket rate limiting, IP rate limit on `/api/users/join`
- Central error handling: every failure becomes `{ code, message }` for both HTTP and socket acknowledgements, no stack traces leak
- Environment is validated at start-up, with readable errors; graceful shutdown on SIGINT/SIGTERM
- The grid is seeded idempotently on boot, changing `GRID_COLS` / `GRID_ROWS` just works

## Getting started

**Requirements:** Node 18+ and a MongoDB database (Atlas free tier or local).

```bash
# 1. install everything (root, server and client)
npm install

# 2. put your MongoDB connection string in server/.env
#    MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/turf

# 3. run server (port 5000) and client (port 5173) together
npm run dev
```

Open <http://localhost:5173> in two browser windows (use a private window for the second one so it gets its own player) and start capturing.

> If you use MongoDB Atlas, add your IP address under *Network Access*, otherwise the server cannot connect.

### Production

```bash
npm run build   # builds client/dist
npm start       # Express serves the API, the websocket and the built client on one port
```

If the client is hosted separately, set `VITE_SERVER_URL` for the client build and `CLIENT_ORIGIN` on the server.

## Configuration (`server/.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `MONGODB_URI` | required | MongoDB connection string |
| `PORT` | `5000` | Server port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed browser origin(s), comma separated |
| `GRID_COLS` / `GRID_ROWS` | `30` / `20` | Grid size (5 to 100 each) |
| `COOLDOWN_MS` | `1500` | Wait time between two captures by the same player |
| `LOCK_MS` | `10000` | How long a captured tile is protected from being stolen |

## API

**REST**

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/users/join` | `{ name, color? }` creates a player, returns `{ user, token }` |
| `GET` | `/api/grid` | Snapshot of claimed tiles and the leaderboard |
| `GET` | `/api/health` | Liveness and database status |

Errors always look like `{ "error": { "code": "NAME_TAKEN", "message": "..." } }`.

**Socket events**

| Event | Direction | Payload |
| --- | --- | --- |
| `init` | server → client | `{ serverTime, config, me, tiles, leaderboard, online }` |
| `tile:capture` | client → server | `{ x, y }`, acknowledged with `{ ok, cooldownEndsAt }` or `{ ok:false, code, message, retryAfterMs? }` |
| `tile:update` | server → all | `{ x, y, ownerId, ownerName, ownerColor, capturedAt, lockedUntil, prevOwnerName }` |
| `leaderboard` | server → all | `{ at, top[], claimed, total }` |
| `presence` | server → all | `{ at, count, userIds[] }` |

Capture error codes: `COOLDOWN`, `LOCKED`, `ALREADY_OWNED`, `CONFLICT`, `INVALID_TILE`, `RATE_LIMITED`, `VALIDATION_ERROR`.

## Project structure

```
server/src
  config/        env validation, database connection
  models/        User, Tile
  services/      gridService (capture logic, leaderboard), userService
  sockets/       Socket.IO server: auth, presence, capture handler
  routes/        join, grid snapshot, health
  middleware/    validation, error handling
  utils/         AppError + error mapping, token bucket, palette
client/src
  components/    Board, Tile, Leaderboard, PlayerCard, ActivityFeed, JoinScreen ...
  hooks/         useGame (socket + state), usePanZoom, useCooldown
  lib/           api, clock sync, messages, storage
```

## Trade-offs and what I would do next

- **One server instance.** Presence and the leaderboard throttle live in memory. To scale out: Socket.IO Redis adapter for broadcasts, and presence in Redis. The capture logic itself is already safe across instances because it relies on atomic database writes (cooldowns use each server's clock, so clocks should be NTP synced).
- **Identity is a name, not an account.** Anyone can play instantly. Real auth (or recovering a name after clearing browser data) would be the first product step.
- **Leaderboard counts current tiles**, it does not track lifetime captures. Easy to add as a counter on the user document.
- **DOM tiles instead of canvas.** 600 DOM nodes with memoised tiles are smooth and make CSS animations trivial. Beyond a few thousand tiles I would switch the board to canvas/WebGL.
- Next ideas: team areas / area control bonuses, tile history, a mini-map, sound effects, automated tests for the capture race.
