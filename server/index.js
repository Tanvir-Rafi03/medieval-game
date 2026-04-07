// server/index.js
// Express server stub. Not wired to the client yet — Phase 5 will connect
// this via Socket.io for real-time multiplayer.
//
// Routes to be added in later phases:
//   POST /auth/register     — create account (Phase 5)
//   POST /auth/login        — issue JWT (Phase 5)
//   GET  /player/:id        — fetch player data (Phase 5)
//   POST /player/:id/habits — save habit/pomodoro state (Phase 6)
//   WS   /socket.io         — real-time world events (Phase 5)

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check — useful for uptime monitors and Docker readiness probes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});

module.exports = app;
