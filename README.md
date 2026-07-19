# Echoes of Oblivion — Project Documentation

A browser-based, server-authoritative 3D multiplayer arena game built on Express, Socket.IO, Three.js, and MongoDB. Players sign up, enter a jungle-themed arena scene rendered with low-poly Three.js avatars, and fight in rooms of up to 3 players with real-time, server-computed movement and collision. The project also includes an EJS-rendered marketing/landing page, a feedback system summarized by an LLM, and an OTP-gated admin dashboard.

> This document reflects the actual state of the code on branch `Trees` as of 2026-06-23, including known bugs and legacy/unused files. It is meant as a technical reference, not aspirational design.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Server | Node.js, Express 5 |
| Real-time | Socket.IO 4 (server + client) |
| Database | MongoDB via Mongoose 9 |
| Cache / ephemeral store | Redis via `ioredis` (admin OTP storage) |
| Templating | EJS |
| Auth | `express-session` + JWT (`jsonwebtoken`) cookies, `bcryptjs` password hashing |
| Email | `nodemailer` via SendGrid SMTP |
| File uploads | `multer` |
| AI | OpenAI API (`gpt-3.5-turbo`) for admin feedback classification |
| 3D rendering | Three.js r128 (CDN) + local `public/three.js` |
| Dev tooling | `nodemon` |

Run with:
```bash
npm install
npm start   # nodemon server.js
```

---

## 2. Entry Points

There are **two server implementations** in the repo; only one is wired to `npm start`.

### `server.js` (685 lines) — **canonical / active**

The production entry point (`package.json` → `"start": "nodemon server.js"`). Implements **per-room** server-authoritative physics:

- Rooms hold up to **3 players** (`maxCapacity = 3`).
- Physics tick runs every **33ms** (~30 Hz).
- Player/world state is isolated per room in a `World[roomId]` object — this is what the commit `079a639 "Full server based authority initialized"` introduced, replacing the older global-state model.
- Matches auto-start when a room fills, run for 5 minutes, then end with a heap-sorted leaderboard (`'stop match'` event).

### `alphaserver.js` (594 lines) — legacy, not run by `npm start`

An earlier iteration that used a single **global** `infoBox` object for all players (no per-room isolation), capped rooms at 2 players, and ticked at 50ms. Kept in the repo for reference but superseded by `server.js`. Other legacy server/client pairs also exist (`serversafe.js` + `public/protosafe.js`, `public/betasafeplayers.js`) representing earlier client-authoritative experiments — none of these are active.

---

## 3. Server Middleware Stack (`server.js`)

In order:
```
cors()                                    // all origins allowed
view engine: ejs, views: 'views'
body-parser (urlencoded)
cookie-parser
express-session (secret = SESSION_SECRET)
multer().single('image')                  // mounted globally on every request
express.json()
session middleware
connect-flash
express.static('public')                  // static assets at /
express.static('images') mounted at /images
routes: userRoutes, authRoutes, adminRoutes
```

Socket.IO shares the Express session via:
```js
io.use((socket, next) => sessionMiddleware(socket.request, {}, next));
```
This lets socket handlers read `socket.request.session.username` without a separate handshake auth step.

**Note:** `cors` is used but not listed in `package.json` dependencies — it currently resolves transitively through `engine.io` (a Socket.IO dependency), which is fragile and should be declared explicitly.

---

## 4. Routes

### `routes/auth.js`
| Method | Path | Middleware | Purpose |
|---|---|---|---|
| GET | `/signup` | — | Signup form |
| POST | `/signup` | — | Create account, upload avatar, send welcome email |
| GET | `/signin` | — | Login form |
| POST | `/signin` | — | Authenticate, issue session + JWT cookie |
| GET | `/mainScene` | `verifyJwt`, `isAuthenticated` | Game canvas (protected) |
| POST | `/mainScene` | — | Logout (destroy session, clear cookie) |
| GET | `/error` | — | Error page |
| GET/POST | `/editProfile` | `verifyJwt`, `isAuthenticated` | Edit profile (protected) |

### `routes/user.js`
| Method | Path | Middleware | Purpose |
|---|---|---|---|
| GET/POST | `/` | — | Landing page + feedback form |
| GET/POST | `/user` | `isAuthenticated`, `verifyJwt` | Post-login dashboard |
| GET | `/profile` | `verifyJwt` | Read-only profile view |

### `routes/admin.js`
| Method | Path | Middleware | Purpose |
|---|---|---|---|
| GET/POST | `/admin/verify/otp` | — | Admin credential entry → triggers OTP email |
| GET/POST | `/verifyotp` | — | 6-digit OTP entry/verification |
| GET | `/admin/dashboard` | `isAdminAuth`, `verifyAdminJwt` | View feedback, AI-classified |
| POST | `/admin/dashboard` | — | Admin logout |

---

## 5. Authentication & Authorization

Two **independent** auth systems exist side by side, with separate JWT secrets and cookie names so they cannot collide.

### Player auth
1. `POST /signup`: requires an uploaded image, hashes password with `bcryptjs` (cost 12), creates a `User` document, emails a welcome message via SendGrid SMTP, redirects to `/signin`.
2. `POST /signin`: looks up by email, compares password hash, regenerates the session (mitigates session fixation), stores `isLoggedIn`, `username`, `email`, `photo`, `games`, `role: "user"` in session, signs a JWT (`{ id: sessionID, user, role: "player" }`), sets it as cookie `player_jwt` (httpOnly, `sameSite: strict`, secure in production, 1h TTL).
3. Protected routes use two middlewares stacked: `verifyJwt` (validates the `player_jwt` cookie) and `isAuthenticated` (checks `req.session.isLoggedIn && role === "user"`).

### Admin auth (OTP-based, separate from player auth)
1. `POST /admin/verify/otp`: compares submitted name/password against `ADMIN_NAME`/`ADMIN_PASSWORD` env vars with plain `===` (not hashed). On match, generates a numeric OTP, stores it in Redis keyed by a `crypto.randomUUID()` session token (`attempts: 3`, 5-minute TTL), emails the OTP via SendGrid.
2. `POST /verifyotp`: compares submitted code against Redis-stored OTP. On success, regenerates session, sets `role: "admin"`, signs a JWT with a **separate secret** (`JWT_ADMIN_SECRET`), sets cookie `admin_jwt`, deletes the Redis entry, redirects to `/admin/dashboard`. On failure, decrements the attempts counter in Redis; after 3 failed attempts the key is deleted and the user is locked out (403).
3. `/admin/dashboard` is gated by `isAdminAuth` + `verifyAdminJwt`.

---

## 6. Data Models (Mongoose)

### `models/user.js` — collection `users`
```js
{
  name: String,
  email: String,
  password: String,              // bcryptjs hash
  imageUrl: { type: String, required: true },
  gamesplayed: Number,
  // + timestamps: createdAt, updatedAt
}
```
No unique index on `name`/`email` — duplicate checks happen manually in `controllers/auth.js`, which is not race-safe under concurrent signups.

### `models/feedback.js` — collection `feedbacks`
```js
{
  name: { type: String, required: true },     // freeform, not tied to a user account
  feedback: { type: [String], required: true } // appended to on repeat submissions
  // + timestamps
}
```
Feedback is keyed by whatever name string is typed into the landing-page form — it is **not** linked to authenticated `User` accounts, so two different people using the same display name will have their feedback merged into a single document. The form also collects an email address that is never persisted.

---

## 7. Multiplayer Game Logic (server-authoritative)

All physics — movement, gravity, collision, damage — are computed on the server in `server.js`; clients only send input intent and render whatever state the server broadcasts.

### State shape
```js
World[roomId] = {
  [playerName]: {
    playerName, id, health, lives, x, y, z, r,
    moveUp, moveDown, moveLeft, moveRight, moveForward, moveBackward
  }
}
```

### Tick loop (every 33ms)
For each room, for each player with an active movement flag:
1. Check pairwise collision against every other player in the room via `willcollide(roomId, a, b, v=15, delta, direction)` (sphere-distance check on the projected next position).
2. **On collision**: the *other* player takes 1 damage; the moving player does not advance. When a player's health hits 0, they lose a life and health resets to `lives * 10`; at 0 lives they're removed from the world and flagged in `deadPlayers[roomId]` for that tick.
3. **No collision**: position updates by `velocity (15 units/s) * delta`.
4. Gravity (`-9.8`) is applied to `y` for all players each tick, floored at 0.
5. Server emits `'update-movement'` with the full room's world state plus any players who died this tick, then clears the dead-player buffer.

### Match lifecycle
- Players join a room via `'join-room'`; rooms cap at 3.
- When full, the server resets everyone to 50 health / 5 lives and emits `'start match'`, starting a 5-minute timer.
- After 5 minutes, players are ranked with a max-heap sort (by health, then lives) and the server emits `'stop match'` with the final standings; the client renders a medal-style leaderboard.
- On disconnect, the player is removed from their room, `World`, `playerlist`, and the `activeUsers` map (which enforces one active session per username — a second login for the same user disconnects the new socket with a `'duplicate'` event).

### Socket events (server ⇄ client)
`join-room`, `chat message`, `start typing` / `stop typing`, `moveUp/Down/Left/Right/Forward/Backward` and their `...stop` counterparts, `identity`, `lobby-update`, `start match`, `update-movement`, `stop match`, `leave-room`, `duplicate`.

---

## 8. Client-Side Rendering (`public/players.js`, active)

Loaded by `views/mainScene.ejs` alongside Three.js r128 (CDN) and `CSS2DRenderer`/`GLTFLoader` add-ons.

- **Scene**: near-black jungle background, exponential fog, ambient + hemisphere + 3 point lights (lime/teal/gold), a 200×200 floor/grid, a glowing arena ring, procedurally placed trees (cylinder trunks + stacked cone canopies, optional hanging vines) and ferns, plus particle systems for ground mist and fireflies.
- **Avatars** (`Playeractions` class): low-poly humanoids built from `BoxGeometry` primitives (head/body/arms/legs), colored deterministically by hashing the player's name into an HSL hue. Each avatar carries two `CSS2DObject` HTML labels (name, HP) rendered above the mesh. A `tickAnimation` method drives a sine-wave walk cycle when the avatar is moving and eases limbs back to rest when idle, plus smooth rotation to face the direction of travel.
- **Camera**: a lerped chase camera trailing behind the local player.
- **Input**: keys mapped to `moveUp/Down/Left/Right/Forward/Backward`; on `keydown` the corresponding socket event fires; on `keyup` **all six** stop events fire regardless of which key was released (a known bug — see §10), which prevents true simultaneous multi-directional movement.
- **Render loop**: renders both the WebGL scene and the CSS2D label overlay every frame; `setPixelRatio(0.55)` is used intentionally to trade resolution for performance.
- **Match UI**: chat panel with typing indicators, a 5-minute countdown timer, and a dynamically built leaderboard overlay on `'stop match'`.

Legacy/unused client scripts also live in `public/`: `alphaplayers.js` (pairs with `alphaserver.js`), `betasafeplayers.js` and `protosafe.js` (earlier experiments, one with a "relic" pickup mechanic), `load.js`, `heartbeat.js`. These are not referenced by the active `mainScene.ejs` flow.

---

## 9. Views (EJS)

| View | Route | Notes |
|---|---|---|
| `Eco.ejs` | `GET /` | Landing page + feedback form |
| `signup.ejs` | `GET /signup` | Registration (name, email, password, required avatar upload) |
| `signin.ejs` | `GET /signin` | Login |
| `user.ejs` | `GET /user` | Post-login dashboard / action dispatcher |
| `profile.ejs` | `GET /profile` | Read-only profile (rendered from session, not a fresh DB read) |
| `editProfile.ejs` | `GET/POST /editProfile` | Edit username/avatar |
| `mainScene.ejs` | `GET /mainScene` | The 3D arena: canvas, HUD, chat, timer, leaderboard overlay |
| `verifyOtp.ejs` | `GET/POST /admin/verify/otp` | Admin credential form (name confusingly suggests OTP entry) |
| `otp.ejs` | `GET/POST /verifyotp` | 6-box OTP digit entry with auto-advance |
| `fb.ejs` | `GET /admin/dashboard` | Feedback list + AI-generated summary |
| `error.ejs` | `GET /error` | Generic error page |
| `Sea.ejs`, `dil.ejs` | not routed in `server.js` | Legacy scenes, previously served by `alphaserver.js` |

---

## 10. Admin Feedback Dashboard & AI Integration

`controllers/admin.js` fetches all `Feedback` documents and sends them to OpenAI (`gpt-3.5-turbo`) with the prompt *"These are user feedbacks ... group them by type and give a detailed report"*. The model's response is rendered alongside the raw feedback list in `fb.ejs`. This is the only place the OpenAI dependency is used.

---

## 11. Deployment / Infra

- **`docker.yaml`**: a Docker Compose file that containerizes **only the dependencies** (MongoDB and Redis), not the Node app itself:
  ```yaml
  services:
    mongo:   { image: mongo, ports: ["27017:27017"], env: MONGO_INITDB_ROOT_USERNAME/PASSWORD }
    redis:   { image: redis, ports: ["6379:6379"], command: --appendonly yes }
  ```
- **`Dockerfile`**: currently empty (0 bytes) — the app itself has no container image yet.
- The app is started directly with `npm start` (`nodemon server.js`), expecting `MONGO_DB_URI` and `REDIS_URL`-equivalent config to point at either the Compose services or MongoDB Atlas.

### Environment variables (`.env`)
`MONGO_DB_URI`, `SESSION_SECRET`, `JWT_SECRET`, `JWT_ADMIN_SECRET`, `NODE_ENV`, `JWT_EXPIRES_IN`, `PORT`, `PORT2` (declared, unused), `SGKEY` (SendGrid), `ADMIN_PASSWORD`, `ADMIN_NAME`, `OPEN_AI_API_KEY`.

⚠️ `.env` is currently tracked in git history (it shows as modified in `git status`, and an earlier commit `54d1467` is literally titled "Delete .env"). Any credentials that were ever committed (Mongo Atlas password, SendGrid key, JWT secrets, admin password, OpenAI key) should be treated as compromised and rotated.

---

## 12. Known Issues / Bugs

These are real issues observed in the current code, useful as a starting punch-list for cleanup:

1. **Secrets tracked in git** — `.env` history needs scrubbing and all keys rotated.
2. **Empty `Dockerfile`** — app isn't containerized despite Compose file existing for its dependencies.
3. **No unique DB indexes** on `User.name` / `User.email`; duplicate checks are manual and racy.
4. **Stale session after profile edit** — `posteditProfile` updates Mongo but not `req.session`, so the UI shows the old username until re-login.
5. **`gamesplayed` can be `undefined`**, producing `NaN` after increment in `getMainScene`.
6. **OTP can exceed 6 digits** — `Math.floor(Math.random()*1000000 + Math.random()*100000)` can reach 1,099,999, but the UI only has 6 input boxes.
7. **Admin credentials compared with plain `===`**, not hashed — full compromise if `.env` leaks.
8. **`cors` package not declared** in `package.json` — currently works only because it's hoisted from a transitive dependency.
9. **Feedback not tied to authenticated users** — freeform name, and same-name submissions merge into one document; collected email is discarded.
10. **`multer().single('image')` mounted globally** on every request rather than scoped to upload routes.
11. **`keyup` releases all six movement directions** regardless of which key was lifted, blocking true diagonal/simultaneous movement.
12. **Server starts listening before confirming the MongoDB connection**, so early requests can race a not-yet-ready DB.
13. Several `package.json` dependencies are unused (`bcrypt`, `bun`, `cookie`, `connect-mongo`, `flash`, `parser`, `redis`, `socket.io-client`, `ws`) and could be pruned.

---

## 13. Repository Layout (active vs. legacy)

```
server.js                  ✅ active entry point (server-authoritative, per-room)
alphaserver.js             ⚠️ legacy entry point (global state, not run by npm start)
serversafe.js              ⚠️ legacy experiment
controllers/
  auth.js                  ✅ signup/signin/JWT/profile
  user.js                  ✅ dashboard/profile/feedback
  admin.js                 ✅ OTP login + AI feedback dashboard
models/
  user.js                  ✅
  feedback.js              ✅
routes/
  auth.js, user.js, admin.js   ✅
views/                      ✅ active EJS templates + Sea.ejs/dil.ejs (legacy)
public/
  players.js                ✅ active game client
  alphaplayers.js, betasafeplayers.js, protosafe.js, load.js, heartbeat.js  ⚠️ legacy/unused
  three.js                  ✅ bundled Three.js
  *.glb                     3D models (sword, etc.)
docker.yaml                 ✅ Mongo + Redis Compose
Dockerfile                  ⚠️ empty, unused
.env                        ⚠️ tracked in git — rotate secrets
```

---

## 14. Glossary

- **Server-authoritative**: the server is the single source of truth for player position, health, and collisions; clients are "dumb" renderers that send input and draw whatever state the server sends back. This prevents client-side movement/damage cheating.
- **Room**: an isolated match instance (`World[roomId]`) capped at 3 players, created/joined via Socket.IO's `join-room`.
- **OTP flow**: a one-time-password email loop used only for admin login, backed by Redis with a 5-minute TTL and a 3-attempt lockout.
