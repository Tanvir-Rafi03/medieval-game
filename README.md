# Medieval Game

A medieval open-world social web app — Habitica meets Gather.town with a medieval skin. Combines a daily productivity utility (Pomodoro / habit tracker) with a multiplayer pixel RPG world built in Phaser.js.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS (ES modules) |
| Game Engine | Phaser.js 3 |
| Dev Server | Vite |
| Backend | Node.js + Express |
| Real-time | Socket.io (Phase 5+) |

## Getting Started

### Install dependencies

```bash
npm install
```

### Run the client (Phaser game)

```bash
npm run dev
```

Opens at `http://localhost:5173` — you should see "World loading..." on a dark navy background.

### Run the backend server (separate terminal)

```bash
npm run server
```

Starts Express on `http://localhost:3001`. Health check: `GET /health`.

### Production build

```bash
npm run build
```

Output goes to `/dist`.

## Folder Structure

```
/
├── client/
│   ├── src/
│   │   ├── scenes/       # Phaser Scene classes (BootScene, WorldScene, …)
│   │   └── ui/           # HTML overlay panel components
│   ├── assets/
│   │   ├── tilesets/     # Tiled tileset images
│   │   ├── sprites/      # Character & object spritesheets
│   │   └── audio/        # SFX and music
│   ├── index.html        # HTML shell (Phaser mounts here)
│   ├── main.js           # Phaser game config & entry point
│   └── style.css         # Global styles + CSS color palette variables
├── server/
│   └── index.js          # Express stub (auth, player data, Socket.io — Phase 5+)
├── vite.config.js
└── package.json
```

## Roadmap

1. **Phase 1** — Project scaffold (current)
2. **Phase 2** — Tilemap world (Tiled map + camera + player movement)
3. **Phase 3** — Player character (spritesheet, animations, collision)
4. **Phase 4** — Pomodoro / habit tracker UI overlay
5. **Phase 5** — Multiplayer (Socket.io, player syncing)
6. **Phase 6** — Persistence (auth, player data API)
7. **Phase 7** — Social features (guilds, chat, emotes)
8. **Phase 8** — Polish & deployment (CDN assets, CI/CD, mobile responsiveness)
