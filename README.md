# Echoes of Oblivion

Echoes of Oblivion (also referred to as PixelMania in parts of the code) is a browser-based, real-time 3D multiplayer arena game. The application combines a Node.js/Express web server, EJS-rendered pages, Socket.IO multiplayer communication, MongoDB persistence, Redis-backed administrator OTP verification, and a Three.js game client.

The game server is authoritative: browsers send movement intent, while the server owns player positions, collision detection, health, lives, room membership, and match results.

> This document describes the current implementation. Some names in the UI, source code, package metadata, container names, and infrastructure still use the older PixelMania name.

## Table of contents

1. [Features](#features)
2. [Technology stack](#technology-stack)
3. [System architecture](#system-architecture)
4. [Repository structure](#repository-structure)
5. [Prerequisites](#prerequisites)
6. [Environment configuration](#environment-configuration)
7. [Local development](#local-development)
8. [Running with Docker](#running-with-docker)
9. [Application routes](#application-routes)
10. [Authentication and authorization](#authentication-and-authorization)
11. [Multiplayer game lifecycle](#multiplayer-game-lifecycle)
12. [Socket.IO event reference](#socketio-event-reference)
13. [Data models](#data-models)
14. [File uploads and static assets](#file-uploads-and-static-assets)
15. [Administrator feedback workflow](#administrator-feedback-workflow)
16. [CI/CD pipeline](#cicd-pipeline)
17. [Testing and verification](#testing-and-verification)
18. [Troubleshooting](#troubleshooting)
19. [Security and production readiness](#security-and-production-readiness)
20. [Known limitations](#known-limitations)

## Features

- Account registration with password hashing and avatar upload
- Sign-in using a server session and a signed JWT cookie
- Profile viewing and profile editing
- Three-player multiplayer rooms
- Server-controlled movement, gravity, collision, damage, health, and lives
- Five-minute matches with a final leaderboard
- Real-time room chat and typing indicators
- Duplicate active-session detection by username
- Landing-page feedback submission
- Administrator login with email OTP verification
- Redis-backed OTP expiry and retry tracking
- AI-generated feedback classification for the administrator dashboard
- Docker image and Docker Compose configuration
- Jenkins pipeline that builds and pushes images to Amazon ECR

## Technology stack

| Area | Technology |
|---|---|
| Runtime | Node.js 20 in the production container |
| Web framework | Express 5 |
| Server rendering | EJS |
| Real-time transport | Socket.IO 4 |
| Database | MongoDB with Mongoose |
| Temporary data | Redis with `ioredis` |
| Authentication | `express-session`, JWT, and `bcryptjs` |
| Email | Nodemailer using SendGrid SMTP |
| Uploads | Multer |
| 3D client | Three.js and browser JavaScript |
| AI integration | OpenAI Node SDK |
| Containers | Docker and Docker Compose |
| CI/CD | Jenkins and Amazon ECR |

The dependency list in `package.json` includes direct and transitive-style packages. The application-level packages named above are the important ones for understanding the system.

## System architecture

```text
Browser
  |
  | HTTP: pages, forms, cookies, images
  | Socket.IO: input, chat, world updates
  v
Express + Socket.IO server (server.js)
  |                  |                   |
  | Mongoose         | ioredis          | SMTP / OpenAI API
  v                  v                   v
MongoDB            Redis             SendGrid / OpenAI
```

### Request flow

1. Express renders EJS pages and processes form submissions.
2. Player authentication stores identity in an Express session and a JWT cookie.
3. The same session middleware is shared with Socket.IO.
4. An authenticated game socket reads the username from the session.
5. The server assigns the socket to an available room.
6. The browser emits input events; it does not directly set authoritative coordinates.
7. The server runs a physics tick approximately every 33 ms and broadcasts room state.

### Runtime entry point

`server.js` is the active entry point:

```bash
npm start
```

Although the `main` field in `package.json` currently names `alphaserver.js`, the start script and production container both execute `server.js`.

## Repository structure

```text
.
|-- controllers/
|   |-- admin.js             # Admin OTP, JWT, feedback, and AI report logic
|   |-- auth.js              # Signup, sign-in, player JWT, game/profile handlers
|   `-- user.js              # Landing page, user page, logout, and feedback
|-- models/
|   |-- feedback.js          # Feedback Mongoose model
|   `-- user.js              # User Mongoose model
|-- routes/
|   |-- admin.js
|   |-- auth.js
|   `-- user.js
|-- util/
|   `-- database.js          # MongoDB connection initialization
|-- views/                   # EJS templates
|-- public/
|   |-- css/
|   |-- players.js           # Active Three.js multiplayer client
|   |-- three.js
|   `-- *.glb                # 3D assets
|-- images/                  # Uploaded user avatars (runtime data)
|-- server.js                # Express, Socket.IO, rooms, and physics
|-- Dockerfile               # Node.js production image
|-- docker-compose.yaml      # Application and Redis services
|-- entrypoint.sh            # Container entry point
|-- Dockerfile.jent          # Custom Jenkins controller image
|-- Jenkinsfile              # Build/test/image/ECR pipeline
|-- package.json
`-- README.md
```

`Sea.ejs`, `dil.ejs`, and several scripts under `public/` appear to be older experiments or alternate scenes. They are not part of the primary route-to-`mainScene.ejs` game flow.

## Prerequisites

For local development:

- Node.js 20 or a compatible recent Node.js release
- npm
- A MongoDB deployment (local MongoDB or MongoDB Atlas)
- Redis
- SendGrid SMTP credentials if signup and administrator OTP email must work
- An OpenAI API key if AI feedback classification must work

For the containerized workflow:

- Docker Engine
- Docker Compose v2
- An externally reachable MongoDB deployment; the current Compose file does not create MongoDB

## Environment configuration

Create a local `.env` file in the repository root. Do not commit it.

```dotenv
# Web server
PORT=8081
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/echoes_of_oblivion

# Redis
REDIS_URL=redis://127.0.0.1:6379

# Sessions and JWTs
SESSION_SECRET=replace-with-a-long-random-value
JWT_SECRET=replace-with-a-different-long-random-value
JWT_ADMIN_SECRET=replace-with-another-long-random-value
JWT_EXPIRES_IN=1h

# Administrator login
ADMIN_NAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password

# SendGrid SMTP
SGKEY=your-sendgrid-api-key

# OpenAI feedback classification
OPEN_AI_API_KEY=your-openai-api-key
```

### Variable reference

| Variable | Required | Used for |
|---|---:|---|
| `PORT` | No | HTTP server port; defaults to `8081` |
| `NODE_ENV` | Recommended | Production cookie behavior and runtime mode |
| `MONGODB_URI` | Yes | Mongoose connection string |
| `REDIS_URL` | Yes for admin OTP | Redis connection; code defaults to `redis://redis:6379` |
| `SESSION_SECRET` | Yes | Signing the Express session cookie |
| `JWT_SECRET` | Yes | Signing and verifying player JWTs |
| `JWT_ADMIN_SECRET` | Yes | Signing and verifying administrator JWTs |
| `JWT_EXPIRES_IN` | Yes | JWT expiry passed to `jsonwebtoken` |
| `ADMIN_NAME` | Yes for admin access | Administrator credential check |
| `ADMIN_PASSWORD` | Yes for admin access | Administrator credential check |
| `SGKEY` | Yes for email | SendGrid SMTP password/API key |
| `OPEN_AI_API_KEY` | Yes for AI report | OpenAI client authentication |

Use separate high-entropy values for all three secrets. The application does not validate missing variables at startup, so a server can begin listening even when a feature is misconfigured.

## Local development

### 1. Install dependencies

```bash
npm ci
```

Use `npm install` only when intentionally changing the dependency lock file.

### 2. Start MongoDB and Redis

If they are installed locally, ensure both services are running and that `MONGODB_URI` and `REDIS_URL` point to them.

To start only Redis with Docker:

```bash
docker run --name echoes-redis -p 6379:6379 redis:7-alpine
```

### 3. Configure `.env`

Add the variables described in [Environment configuration](#environment-configuration).

### 4. Start the application

```bash
npm start
```

The current start command uses Nodemon:

```text
nodemon server.js
```

Open `http://localhost:8081` unless `PORT` is set to another value.

### 5. Exercise the main flow

1. Open `/signup` and create a player with a PNG or JPEG avatar.
2. Sign in at `/signin`.
3. Open `/mainScene`.
4. Use three different accounts/browser sessions to fill a room and start a match.
5. Submit feedback from the landing page.
6. Open `/admin/verify/otp` to test the administrator flow.

## Running with Docker

The production image uses Node.js 20 Alpine, installs locked production dependencies, copies the application, and launches `node server.js` through `entrypoint.sh`.

### Build and start

```bash
docker compose up --build
```

The Compose configuration exposes:

| Service | Host port | Container port |
|---|---:|---:|
| Application | `80` | `8081` |
| Redis | `6379` | `6379` |

After startup, open `http://localhost`.

### Important Compose behavior

- The app reads environment values from `.env`.
- Compose overrides `NODE_ENV=production` and `PORT=8081`.
- Redis is reachable inside the Compose network as `redis://redis:6379`.
- MongoDB is not defined in the Compose file. `MONGODB_URI` must point to MongoDB Atlas, a host MongoDB instance, or another accessible MongoDB service.
- `depends_on` controls container start order, not Redis readiness.
- Uploaded avatars are written inside the app container because `images/` has no volume mapping. They will be lost when the container is replaced unless persistent storage is added.

### Stop services

```bash
docker compose down
```

To remove the Redis data volume as well:

```bash
docker compose down --volumes
```

The second command permanently removes locally persisted Redis data.

## Application routes

### Public and player routes

| Method | Path | Protection | Purpose |
|---|---|---|---|
| `GET` | `/` | Public | Render the landing page |
| `POST` | `/player/feedback` | Public | Store feedback by submitted name |
| `GET` | `/signup` | Public | Render registration form |
| `POST` | `/signup` | Public | Create player and upload avatar |
| `GET` | `/signin` | Public | Render sign-in form |
| `POST` | `/signin` | Public | Authenticate and create player session/JWT |
| `GET` | `/user` | Session + player JWT | Render signed-in user page |
| `POST` | `/user` | Session + player JWT | Log out player |
| `GET` | `/profile` | Player JWT | Render profile from session data |
| `GET` | `/editProfile` | Session + player JWT | Render profile editor |
| `POST` | `/editProfile` | Session + player JWT | Update username and avatar |
| `GET` | `/mainScene` | Session + player JWT | Render the multiplayer scene |
| `GET` | `/error` | Public | Render generic error page |

### Administrator routes

| Method | Path | Protection | Purpose |
|---|---|---|---|
| `GET` | `/admin/verify/otp` | Public | Render admin credential form |
| `POST` | `/admin/verify/otp` | Public | Check credentials, create and email OTP |
| `GET` | `/verifyotp` | OTP session token | Render OTP form |
| `POST` | `/verifyotp` | OTP session token | Verify OTP and create admin session/JWT |
| `GET` | `/admin/dashboard` | Admin session + admin JWT | Render feedback and AI report |
| `POST` | `/admin/dashboard` | Public handler | Destroy admin session and clear cookie |

## Authentication and authorization

### Player authentication

Signup performs the following operations:

1. Reads `Name`, `email`, `Pswd`, and the uploaded `image`.
2. Accepts PNG, JPG, or JPEG MIME types.
3. Checks for an existing username and email.
4. Hashes the password with `bcryptjs` using cost factor 12.
5. Creates a MongoDB user document.
6. Sends a welcome email through SendGrid SMTP.
7. Redirects to `/signin`.

Sign-in:

1. Finds the account by email.
2. Compares the submitted password with the stored bcrypt hash.
3. Regenerates the session to reduce session-fixation risk.
4. Stores player details in the session.
5. Signs a player JWT containing the session ID, username, and `player` role.
6. Sets `player_jwt` as an HTTP-only, same-site cookie.

Protected player routes use `verifyJwt`, `isAuthenticated`, or both. The two checks are complementary:

- `verifyJwt` verifies the signed cookie.
- `isAuthenticated` checks that the server session is logged in with the `user` role.

### Administrator authentication

Administrator authentication is independent of player authentication:

1. Submitted credentials are compared with `ADMIN_NAME` and `ADMIN_PASSWORD`.
2. A numeric OTP and three allowed attempts are stored in Redis.
3. The Redis key uses a random UUID and expires after 300 seconds.
4. The OTP is emailed to the submitted address.
5. A valid OTP regenerates the session and sets the `admin` role.
6. A separate JWT is stored in the `admin_jwt` cookie.
7. The Redis OTP record is deleted after successful verification.

Player and administrator tokens use different cookie names and signing secrets.

## Multiplayer game lifecycle

### Connection and room assignment

Socket.IO reuses the Express session middleware. A socket without `session.username` is disconnected.

For an authenticated socket:

1. The server rejects a second active connection using the same username.
2. It finds the first room with fewer than three players.
3. If no room is available, it creates a random room ID.
4. It initializes the player's world state.
5. The client emits `join-room`, and the socket joins its assigned Socket.IO room.
6. When the room reaches three players, the server emits `start match`.

### Initial player state

```js
{
  playerName,
  id,
  health: 50,
  relicscore: 0,
  x,
  y: 0,
  z,
  r: 1,
  lives: 5,
  moveUp: false,
  moveDown: false,
  moveRight: false,
  moveLeft: false,
  moveForward: false,
  moveBackward: false
}
```

Initial `x` and `z` coordinates are randomized.

### Server tick

The game tick runs every 33 ms, approximately 30 times per second.

- Movement speed is based on `v = 15`.
- Movement flags are set by Socket.IO input events.
- Collision is tested against other players in the same room.
- A collision damages the affected player.
- When health reaches zero, a life is consumed and health is reset according to the remaining lives.
- A player with no remaining lives is removed from the active world state.
- Vertical position is updated by server-side gravity and constrained to the ground.
- The server emits `update-movement` to the room with authoritative state.

Because state is held in memory, rooms and active matches are lost whenever the Node.js process restarts.

### Match completion

When a room fills:

- All players are reset to 50 health and 5 lives.
- `start match` is broadcast.
- A five-minute timeout begins.
- At timeout, the server constructs rankings from username, health, and lives.
- The ranked result is sent in `stop match`.

### Disconnect cleanup

On disconnect, the server removes the socket/player from:

- The room membership object
- The per-room world state
- The player list
- The active-username map

It then emits `leave-room` to remaining room members.

## Socket.IO event reference

### Client to server

| Event | Payload | Purpose |
|---|---|---|
| `join-room` | None | Join the room assigned during connection |
| `chat message` | Message data | Send a chat message to other room members |
| `start typing` | None | Notify room members that the player is typing |
| `stop typing` | None | Clear the typing indicator |
| `moveUp` | Optional/unused | Enable upward movement flag |
| `moveDown` | Optional/unused | Enable downward movement flag |
| `moveLeft` | Optional/unused | Enable left movement flag |
| `moveRight` | Optional/unused | Enable right movement flag |
| `moveForward` | Optional/unused | Enable forward movement flag |
| `moveBackward` | Optional/unused | Enable backward movement flag |
| `moveUpstop` | None | Disable upward movement flag |
| `moveDownstop` | None | Disable downward movement flag |
| `moveLeftstop` | None | Disable left movement flag |
| `moveRightstop` | None | Disable right movement flag |
| `moveForwardstop` | None | Disable forward movement flag |
| `moveBackwardstop` | None | Disable backward movement flag |

### Server to client

| Event | Important fields | Purpose |
|---|---|---|
| `identity` | `me` | Tell the client its authenticated username |
| `duplicate` | `message` | Report an already-active username |
| `chat message` | `username`, message data | Deliver system or player chat |
| `lobby-update` | Room/player information | Refresh lobby state |
| `start typing` | Username data | Show typing indicator |
| `stop typing` | Username data | Remove typing indicator |
| `start match` | `msg`, `roomId`, `ws` | Initialize a full-room match |
| `update-movement` | World state and dead players | Render authoritative game state |
| `stop match` | `ordering` | Display final rankings |
| `leave-room` | Player information | Remove disconnected player |

When changing an event name or payload, update both `server.js` and `public/players.js`.

## Data models

### User

Defined in `models/user.js`:

| Field | Type | Notes |
|---|---|---|
| `name` | String | Player display name |
| `email` | String | Sign-in identifier |
| `password` | String | bcrypt hash |
| `imageUrl` | String | Required path under `/images` |
| `gamesplayed` | Number | Incremented when the game scene is opened |
| `createdAt` | Date | Added by Mongoose timestamps |
| `updatedAt` | Date | Added by Mongoose timestamps |

There are currently no schema-level unique constraints for `name` or `email`.

### Feedback

Defined in `models/feedback.js`:

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, free-form submitter name |
| `feedback` | String array | Required; repeat submissions are appended |
| `createdAt` | Date | Added by Mongoose timestamps |
| `updatedAt` | Date | Added by Mongoose timestamps |

Feedback is grouped by the submitted name, not by a user ID.

## File uploads and static assets

Multer uses disk storage:

- Destination: `images/`
- File name: current timestamp plus original file name
- Allowed MIME types: `image/png`, `image/jpg`, and `image/jpeg`
- Public URL prefix: `/images`

The `public/` directory is served from the site root. The uploaded `images/` directory is served separately under `/images`.

For production, consider object storage such as Amazon S3. Local container storage is not durable and original file names should not be trusted without additional sanitization.

## Administrator feedback workflow

The administrator dashboard loads every feedback document and builds an AI prompt asking for grouped, detailed feedback analysis. `controllers/admin.js` sends the prompt through the OpenAI SDK and renders the response in `views/fb.ejs`.

This means:

- Dashboard loading depends on MongoDB and the OpenAI API.
- All stored feedback is included in a single request.
- Large feedback collections may exceed model context or become expensive.
- Feedback should be treated as untrusted prompt content.
- A failed AI request can leave the generated content empty because the current helper logs the error and returns no fallback report.

## CI/CD pipeline

`Jenkinsfile` defines the following stages:

1. **Verify Environment**: checks Node.js, npm, Docker client, and Docker daemon access.
2. **Install Dependencies**: runs `npm ci`.
3. **Run Tests**: runs `npx jest --passWithNoTests`.
4. **Build Docker Image**: tags the image with the Jenkins build number and Git commit.
5. **Install AWS CLI**: reuses an existing CLI or installs it under `/tmp`.
6. **Inspect Image**: runs `docker image inspect`.
7. **Push to ECR**: authenticates to Amazon ECR and pushes both build-number and `latest` tags.

### Jenkins requirements

- A Jenkins agent with Node.js, npm, Docker CLI, `curl`, and `unzip`
- Access to the configured Docker daemon
- Jenkins AWS credentials stored under `aws-ecr-credentials`
- Permission to authenticate to and push to the configured ECR repository
- Network access to AWS endpoints and the AWS CLI download endpoint

`Dockerfile.jent` builds a Jenkins controller image with Docker CLI and the Blue Ocean, Docker Workflow, and JSON Path API plugins. It does not include a Docker daemon.

### Infrastructure values

The current `Jenkinsfile` contains fixed AWS account, region, repository, and Docker host values. Move environment-specific values into Jenkins credentials or parameters before reusing the pipeline in another account or environment.

## Testing and verification

There is no committed automated test suite at present. The package-level test command intentionally fails:

```bash
npm test
```

The Jenkins pipeline instead calls:

```bash
npx jest --passWithNoTests
```

This succeeds when no tests are found, so a green pipeline does not currently verify application behavior.

Recommended initial test coverage:

- Signup validation and duplicate handling
- Sign-in success, incorrect password, JWT expiry, and logout
- Admin OTP success, expiry, and attempt exhaustion
- Route authorization for player and admin roles
- Room allocation and room capacity
- Duplicate socket connection behavior
- Movement event validation and disconnect cleanup
- Collision, damage, death, and ranking logic
- Feedback creation and append behavior

### Manual smoke test

```text
[ ] Landing page renders
[ ] Signup accepts a valid avatar
[ ] Welcome email is sent
[ ] Sign-in creates a session and player_jwt cookie
[ ] Protected pages reject unauthenticated users
[ ] Three distinct players start a match
[ ] Movement is visible to every client in the room
[ ] Chat and typing indicators work
[ ] Disconnect removes the player
[ ] Feedback is stored in MongoDB
[ ] Admin OTP expires and limits retries
[ ] Admin dashboard renders stored and AI-classified feedback
```

## Troubleshooting

### Database connection failed

Check that:

- `MONGODB_URI` is present and uses the exact variable name
- The database hostname is reachable from the current environment
- MongoDB Atlas permits the source IP
- Credentials are URL-encoded when they contain special characters

The server currently logs a connection failure without terminating, so the HTTP port may still open while database-backed actions fail.

### Redis connection errors

For local Node.js execution, use:

```dotenv
REDIS_URL=redis://127.0.0.1:6379
```

Inside Docker Compose, use:

```dotenv
REDIS_URL=redis://redis:6379
```

`redis` is the Compose service DNS name and usually does not resolve from the host.

### Signup creates no account or redirects to the error page

- Confirm an avatar was selected.
- Confirm it is PNG or JPEG.
- Confirm `images/` exists and is writable.
- Check MongoDB connectivity.
- Check whether the username or email already exists.
- Check SendGrid credentials; the current signup flow awaits email delivery.

### OTP email is not received

- Confirm `SGKEY` is valid.
- Confirm the sender address is permitted by the SendGrid account.
- Check spam/junk folders.
- Confirm Redis is reachable.
- Complete verification within five minutes.

### The game does not start

A match starts only when the assigned room contains exactly three connected players and each browser has emitted `join-room`. Use separate accounts; the server blocks duplicate active usernames.

### Docker app cannot connect to MongoDB on the host

`127.0.0.1` inside a container refers to the container itself. Use an accessible MongoDB hostname, a Compose MongoDB service, MongoDB Atlas, or the platform-specific host gateway.

### Uploaded avatars disappear after deployment

The current Compose service does not mount `images/` as a volume. Container replacement removes files written into the old container. Add persistent storage or migrate uploads to object storage.

### Jenkins cannot reach Docker

Verify the configured `DOCKER_HOST`, daemon TCP exposure, networking, and security controls. An unauthenticated Docker TCP socket grants highly privileged access and should not be exposed broadly.

## Security and production readiness

Before deploying publicly:

1. Rotate any secret that has ever been committed or shared.
2. Keep `.env` and credential files out of version control.
3. Use a persistent session store. The default in-memory session store is not intended for production and does not work reliably across replicas.
4. Set secure cookie behavior consistently. The player cookie is currently created with `secure: false`, while the admin cookie derives it from `NODE_ENV`.
5. Restrict HTTP and Socket.IO CORS origins instead of allowing `*`.
6. Add CSRF protection to state-changing form routes.
7. Add request and authentication rate limits.
8. Validate and normalize all form and Socket.IO payloads.
9. Add upload size limits, content inspection, safe file naming, and durable storage.
10. Add unique MongoDB indexes for username and email.
11. Store administrator credentials as a password hash or use a managed identity provider.
12. Remove password, JWT, OTP, and session data from logs.
13. Validate required environment variables before listening.
14. Wait for MongoDB and Redis readiness before accepting traffic.
15. Add security headers with a package such as Helmet.
16. Pin and audit production dependencies regularly.
17. Avoid sending an unbounded feedback collection to the AI model.
18. Protect the administrator logout route with the same authorization and CSRF controls as other admin actions.

## Known limitations

- The application has no automated tests.
- The `package.json` `main` field does not match the actual entry point.
- Production dependencies include Nodemon because it is used by `npm start`.
- Express sessions use the default in-memory store.
- Room and match state exists only in one Node.js process.
- Horizontal scaling is not supported without shared Socket.IO state, sticky sessions, and a shared game-state design.
- The game timer is a process-local `setTimeout` and is not cancelled or persisted.
- MongoDB connection failure does not stop server startup.
- Usernames and emails do not have unique database indexes.
- Profile updates do not fully refresh the session state.
- Feedback submitter identity is free-form and same-name submissions are merged.
- File upload middleware is mounted globally rather than only on upload routes.
- Uploaded files are stored on local disk.
- The generated administrator OTP expression can produce a value outside the six-digit UI range.
- Some authentication and token data is logged.
- The administrator JWT verification handler restores the admin name from a payload property that does not match the property used when signing.
- The heap-ranking helper should be covered by tests before its ordering is relied on.
- Older views, scripts, and package dependencies remain in the repository and should be reviewed before removal.

## Suggested next steps

1. Add configuration validation and fail-fast startup.
2. Introduce unit and integration tests.
3. Correct authentication, OTP, and logging issues.
4. Add MongoDB unique indexes and validation.
5. Move sessions and Socket.IO coordination to shared infrastructure.
6. Persist avatars outside the application container.
7. Parameterize the Jenkins AWS and Docker settings.
8. Remove confirmed legacy code and unused dependencies.

