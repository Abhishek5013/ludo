# 🎲 Ludo Royale - Real-Time Multiplayer Ludo with Live Multi-Device Admin Dice Control

A production-grade, full-stack real-time multiplayer Ludo web application built with **React, TypeScript, Express, Socket.IO, and MongoDB/Mongoose**.

The game features server-authoritative state logic and an **Admin Control Panel (`/admin`)** capable of controlling a specific player's next dice roll in real time from a completely separate device (e.g. Device A runs the player game, Device B runs the admin panel).

---

## 📋 Table of Contents
1. [Project Overview](#1-project-overview)
2. [Technologies Used](#2-technologies-used)
3. [Folder Structure](#3-folder-structure)
4. [Requirements & Node.js Version](#4-requirements--nodejs-version)
5. [Installation Commands](#5-installation-commands)
6. [Environment Variables](#6-environment-variables)
7. [MongoDB Atlas Setup](#7-mongodb-atlas-setup)
8. [How to Run (Simultaneous Single-Command & Multi-Process)](#8-how-to-run)
9. [How to Play (Player Experience)](#9-how-to-play)
10. [Admin Panel & Live Dice Control (Device A & B Workflow)](#10-admin-panel--live-dice-control)
11. [Ludo Rules & Mathematical Model](#11-ludo-rules--mathematical-model)
12. [Server-Authoritative Game Architecture](#12-server-authoritative-game-architecture)
13. [Automated Test Suite](#13-automated-test-suite)
14. [Deployment Guide](#14-deployment-guide)
15. [Common Errors & Solutions](#15-common-errors--solutions)

---

## 1. Project Overview

- **Player Interface**: `https://<domain>/` (Lobby) & `https://<domain>/game/[gameId]` (Live Game Room)
- **Admin Interface**: `https://<domain>/admin` (Password & JWT Protected)
- **Multi-Device Live Control**: Admin on Device B can select Rahul on Device A and force Rahul's next dice result to any value from 1 to 6 (or Random). When Rahul rolls on Device A, the server returns the forced value, broadcasts the result instantly, and automatically consumes the forced value back to Random for subsequent rolls.
- **Server Authoritative**: The client cannot alter dice results, change turn order, overshoot the home goal, or forge moves. All rolls and token moves are validated on the Node.js server.
- **Reconnection Resilient**: If a player temporarily disconnects, their game state and tokens remain intact. Reconnecting restores their exact player session seamlessly.

---

## 2. Technologies Used

- **Frontend**: React 19, TypeScript, Tailwind CSS, Motion, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express, Socket.IO, JWT (`jsonwebtoken`), Dotenv.
- **Database & Persistence**: MongoDB Atlas + Mongoose with high-speed in-memory sync for low latency.
- **Testing**: Built-in test runner with `assert` testing dice independence, rule enforcement, token captures, safe zones, and winning detection.

---

## 3. Folder Structure

```
/
├── server.ts                       # Express + Socket.IO + Vite Middleware Full-Stack Entry Point
├── package.json                    # Scripts & Dependencies
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite + Tailwind build configuration
├── index.html                      # HTML entry with metadata & typography
├── .env.example                    # Template for environment variables
├── tests/
│   └── ludo-game.test.ts           # Automated test suite (10 test suites covering Section 27)
├── src/
│   ├── main.tsx                    # React client entry point
│   ├── App.tsx                     # Route dispatcher (/game/:id, /admin, /)
│   ├── index.css                   # Tailwind v4 styles & fonts
│   ├── types/
│   │   └── ludo.ts                 # Authoritative TypeScript models & event types
│   ├── utils/
│   │   ├── audio.ts                # Web Audio API Sound Synthesizer (Zero external dependencies)
│   │   └── boardCoordinates.ts     # 15x15 canonical Ludo coordinate mapping
│   ├── components/
│   │   ├── lobby/
│   │   │   └── Lobby.tsx           # Create / Join game lobby & rules modal
│   │   ├── board/
│   │   │   ├── LudoBoard.tsx       # 15x15 SVG/CSS Board with safe stars, paths, yards
│   │   │   ├── Dice3D.tsx          # Animated 3D dice with rolling physics & pips
│   │   │   ├── PlayerCard.tsx      # Player cards with token breakdown & turn indicators
│   │   │   ├── GameControls.tsx    # Room link copy, start game, and action feed
│   │   │   ├── GameRoom.tsx        # Complete player game screen
│   │   │   ├── VictoryModal.tsx    # Confetti celebration & standings table
│   │   │   └── ChatDrawer.tsx      # In-game quick emojis & real-time chat
│   │   └── admin/
│   │       └── AdminDashboard.tsx  # Admin control center, per-player dice setter, audit logs
│   └── server/
│       ├── models/
│       │   ├── Game.ts             # Mongoose Game schema
│       │   ├── User.ts             # Mongoose User schema
│       │   └── AuditLog.ts         # Mongoose Audit Log schema
│       ├── services/
│       │   ├── ludoEngine.ts       # Core rules, captures, safe tiles, turn rotations
│       │   └── gameStore.ts        # In-memory store + MongoDB persistence
│       └── socket/
│           └── ludoSocket.ts       # Socket.IO event handlers & JWT authentication
└── README.md                       # Comprehensive system documentation
```

---

## 4. Requirements & Node.js Version

- **Node.js**: `v18.0.0` or higher (tested on Node v20 & v22 LTS)
- **npm**: `v9.0.0` or higher
- **Modern Browser**: Chrome, Edge, Safari, or Firefox with Web Audio and WebSocket support.

---

## 5. Installation Commands

Clone the repository and install all dependencies:

```bash
# Clone the repository
git clone <repository_url>
cd ludo-game

# Install dependencies
npm install
```

---

## 6. Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```ini
# Server Port (default: 3000)
PORT=3000

# MongoDB URI (Optional: Leave empty to run with high-speed built-in store)
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/ludodb?retryWrites=true&w=majority"

# JWT Secret Key
JWT_SECRET="ludo-super-secret-jwt-key-2026"

# Admin Access Credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="ludoAdmin2026!"

# Optional Client Socket URL override (defaults to window.location.origin)
VITE_SOCKET_URL=""
```

---

## 7. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free M0 cluster.
2. Under **Database Access**, create a user with read and write permissions (e.g., `ludo_user` and a strong password).
3. Under **Network Access**, add IP Address `0.0.0.0/0` (Allow Access from Anywhere).
4. Click **Connect** &rarr; **Drivers** &rarr; Copy the connection string.
5. Paste into `.env` as `MONGODB_URI=...` replacing `<password>` with your database user password.

*Note: If you run the app without MongoDB, the server automatically uses its built-in in-memory store so the game remains 100% playable out of the box without requiring any external cloud setup!*

---

## 8. How to Run

### Development Mode (Single Command Full-Stack)

The dev script starts the Express + Socket.IO server with Vite mounted as dev middleware:

```bash
npm run dev
```

Visit:
- **Player Interface**: `http://localhost:3000/`
- **Admin Panel**: `http://localhost:3000/admin`

### Running the Automated Tests

Run the test suite verifying all 10 core rules and forced dice independence:

```bash
npm test
```

### Production Build & Run

```bash
# 1. Build the production client bundle
npm run build

# 2. Start the production server
NODE_ENV=production npm start
```

---

## 9. How to Play

1. **Host a Game**:
   - Open `http://localhost:3000/`.
   - Enter your name (e.g. `Abhishek`), select player count (2, 3, or 4), pick your preferred color (Red, Green, Yellow, Blue), and click **Create & Host Game**.
   - You will be redirected to `http://localhost:3000/game/ABC123`.
2. **Join a Game**:
   - On another browser window or another device, open `http://localhost:3000/`.
   - Click **Join with Code**, enter `ABC123`, enter name (e.g. `Rahul`), and click **Join Game Room**.
   - Alternatively, open the direct link `http://localhost:3000/game/ABC123`.
3. **Start Game**:
   - The host clicks **Start Game** once at least 2 players have joined.
4. **Gameplay**:
   - The player whose turn it is rolls the 3D dice.
   - If a 6 is rolled, a token can exit the yard onto the starting square.
   - Tokens with valid moves pulse and bounce. Click any highlighted token to move.
   - Extra turns are awarded on rolling a 6, capturing an opponent, or reaching home.

---

## 10. Admin Panel & Live Dice Control

### Device A & Device B Testing Procedure:

1. **On Device A (Player)**:
   - Open `https://<your-app-url>/` and create a game (e.g. room code `ABC123`).
   - Add another player or open an Incognito tab to join.
2. **On Device B (Admin)**:
   - Open `https://<your-app-url>/admin`.
   - Log in using password: `ludoAdmin2026!`
   - Select game `ABC123` from the Active Games sidebar.
3. **Controlling the Dice**:
   - Locate the target player (e.g., `Rahul`).
   - Click any number `[ 1 ]` to `[ 6 ]` (or `[ Rnd ]` to revert to random).
   - An audit log entry is recorded, and the player's card shows `Forced: 6`.
4. **Authoritative Consumption**:
   - On Device A, Rahul rolls the dice.
   - The server inspects Rahul's `forcedNextDice`, returns `6`, and **immediately clears Rahul's setting back to `null`**.
   - On Rahul's next roll, the server generates a normal random number (1..6) unless the admin sets another forced value.
   - Other players in the same game remain completely unaffected by Rahul's forced dice!

---

## 11. Ludo Rules & Mathematical Model

- **Grid Coordinates**: 15x15 cell matrix.
- **Track**: 52-tile clockwise perimeter loop (indices 0..51).
  - Red start tile: `0` (cell `(6, 1)`)
  - Green start tile: `13` (cell `(1, 8)`)
  - Yellow start tile: `26` (cell `(8, 13)`)
  - Blue start tile: `39` (cell `(13, 6)`)
- **Safe Positions**:
  - The 4 starting tiles (`0, 13, 26, 39`).
  - The 4 star safe tiles (`8, 21, 34, 47`).
  - Tokens resting on any safe tile cannot be captured.
- **Yard to Track**: Requires a roll of `6`. Moves token from step `0` to step `1`.
- **Captures**: Landing on an unprotected opponent token on steps `1..51` sends the opponent back to yard (`step 0`) and awards a bonus roll.
- **Home Column & Goal**: Steps `52..56` are private home column tiles. Step `57` is the finished Home Goal. Exact roll is required to reach step `57`.
- **Winning**: The first player whose 4 tokens reach step `57` is declared the winner!

---

## 12. Server-Authoritative Game Architecture

```
[Device A: Player Client]           [Device B: Admin Client]
         |                                     |
         | --- (game:rollDice) --------------> |
         |                                     | --- (admin:setForcedDice: Rahul -> 6) -->
         |                                     |
                                  [Node.js / Express Server]
                                              |
                                  1. Validates Admin Token
                                  2. Sets Rahul.forcedNextDice = 6
                                  3. Broadcasts admin:forcedDiceUpdated
                                              |
         <-- (game:diceRolled: 6) ------------+
         <-- (game:state) --------------------+
```

All game operations flow through `src/server/services/ludoEngine.ts` and `src/server/services/gameStore.ts`. No client can determine a roll or jump a token unlawfully.

---

## 13. Automated Test Suite

The project includes unit and integration tests covering Section 27 of the specifications:

1. **Random dice generation**: Uniform distribution 1..6 when no forced value is set.
2. **Forced dice consumption**: Forced value is returned on the roll and immediately wiped.
3. **Player-specific independence**: Player A set to 6 and Player B set to 2; rolling A returns 6 without modifying B; subsequent rolls revert to random.
4. **Valid moves from yard**: Only 6 can exit the yard.
5. **Exact home goal validation**: Overshooting step 57 is disallowed.
6. **Safe zones detection**: Start tiles and star tiles prevent capture.
7. **Capture mechanics**: Opponents sent to yard, bonus roll awarded.
8. **Win condition**: All 4 tokens at home awards 1st rank.
9. **Turn advancement**: Turn rotates clockwise upon normal non-bonus roll.
10. **Room capacity enforcement**: Maximum 4 players per game.

Run tests:
```bash
npm test
```

---

## 14. Deployment Guide

### Deploying to Render / Railway / Google Cloud Run / Heroku:

1. Set Environment Variables on your hosting provider:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `MONGODB_URI=<your_mongodb_atlas_uri>`
   - `JWT_SECRET=<your_strong_random_secret>`
   - `ADMIN_PASSWORD=<your_admin_password>`
2. Build Command:
   ```bash
   npm install && npm run build
   ```
3. Start Command:
   ```bash
   npm start
   ```

---

## 15. Common Errors & Solutions

| Error | Cause | Solution |
|---|---|---|
| `Game room not found` | Typo in 6-character room code | Ensure code matches exactly (case-insensitive). |
| `Not your turn` | Player clicked roll/move outside their turn | Wait for your turn indicator (pulsing gold ring). |
| `Unauthorized: Admin token required` | Expired or missing admin session | Re-login at `/admin` using the correct admin password. |
| `WebSocket connection failed` | Firewall or reverse proxy blocking WS | Ensure WebSocket upgrades are enabled on port 3000. |
| `Room is already full` | Game reached max players (e.g. 2, 3, or 4) | Create a new room or increase max players when hosting. |

---

*Built with ❤️ for real-time multiplayer gaming.*
