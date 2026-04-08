// client/src/collisions.js
// Walls measured against lines.png — all coords are fractions (0–1) of the world image.
// Set DEBUG_WALLS = true to see coloured outlines in-game.

export const DEBUG_WALLS = true;
export const DEBUG_FOREGROUND = true; // flip to false to hide foreground outlines

export const WALLS = [
  // ── World edges ───────────────────────────────────────────────────────────
  { x: 0.00, y: 0.00, w: 1.00, h: 0.04 }, // sky — not walkable
  { x: 0.00, y: 0.98, w: 1.00, h: 0.06 }, // bottom edge
  { x: 0.00, y: 0.00, w: 0.03, h: 1.00 }, // far-left building (blocks full left side)
  { x: 0.95, y: 0.00, w: 0.07, h: 1.00 }, // far-right building

  // ── Shared back wall — all three top buildings ────────────────────────────
  { x: 0.10, y: 0.04, w: 0.83, h: 0.06 },

  // ── Potion Lab — top-left ─────────────────────────────────────────────────
  { x: 0.30, y: 0.41, w: 0.08, h: 0.10}, 
  { x: 0.53, y: 0.59, w: 0.04, h: 0.03},
  { x: 0.39, y: 0.41, w: 0.07, h: 0.07},// front wall
  { x: 0.26, y: 0.1, w: 0.03, h: 0.4 }, // right side wall — seals gap to P&Q

  // ── Parchment & Quill — top-centre ───────────────────────────────────────
  { x: 0.27, y: 0.36, w: 0.26, h: 0.04 }, // front wall
  { x: 0.51, y: 0.04, w: 0.04, h: 0.33 }, // right side wall — seals gap to LC

  // ── Lucky Cauldron — top-right (diagonal front wall, 8-step staircase) ───
  { x: 0.540, y: 0.330, w: 0.050, h: 0.04 },
  { x: 0.590, y: 0.368, w: 0.050, h: 0.04 },
  { x: 0.635, y: 0.395, w: 0.050, h: 0.04 },
  { x: 0.675, y: 0.380, w: 0.075, h: 0.05 },
  { x: 0.750, y: 0.420, w: 0.050, h: 0.07 },
  { x: 0.800, y: 0.470, w: 0.050, h: 0.04 },
  { x: 0.840, y: 0.490, w: 0.050, h: 0.04 },
  { x: 0.890, y: 0.510, w: 0.060, h: 0.04 },

  // ── Lamp post — plaza obstacle ────────────────────────────────────────────


  // ── Curiosities — bottom-left ─────────────────────────────────────────────

  { x: 0.25, y: 0.52, w: 0.03, h: 0.29 }, // right side wall (extends to front)
  { x: 0.10, y: 0.73, w: 0.20, h: 0.09 }, // front wall
  { x: 0.05, y: 0.83, w: 0.10, h: 0.05 },
  // ── Broomstick Museum — back wall (diagonal ↘) ───────────────────────────
  { x: 0.523, y: 0.810, w: 0.070, h: 0.04 },
  { x: 0.510, y: 0.840, w: 0.070, h: 0.04 },
  { x: 0.550, y: 0.780, w: 0.051, h: 0.04 },
  { x: 0.557, y: 0.759, w: 0.051, h: 0.04 },
  { x: 0.610, y: 0.745, w: 0.29, h: 0.1 },
  { x: 0.651, y: 0.710, w: 0.24, h: 0.04 },
  { x: 0.683, y: 0.670, w: 0.21, h: 0.04 },
  { x: 0.718, y: 0.652, w: 0.17, h: 0.04 },
  { x: 0.760, y: 0.630, w: 0.12, h: 0.04 },
  { x: 0.800, y: 0.590, w: 0.05, h: 0.06 },
  { x: 0.790, y: 0.615, w: 0.05, h: 0.04 },

  // ── Broomstick Museum — left side wall (diagonal ↘) ──────────────────────
  
  


  // ── Broomstick Museum — front wall (diagonal ↘, shallow to stay in bounds)
  { x: 0.853, y: 0.840, w: 0.055, h: 0.12 },
  { x: 0.571, y: 0.888, w: 0.051, h: 0.04 },


  // ── Bottom-centre dark rooftop ────────────────────────────────────────────
  { x: 0.32, y: 0.88, w: 0.24, h: 0.13 },
  { x: 0.30, y: 0.93, w: 0.04, h: 0.04 },
];

export const FOREGROUND_REGIONS = [
  // Lamp post — always rendered in front of player
  { x: 0.53, y: 0.43, w: 0.04, h: 0.07 },
  { x: 0.545, y: 0.41, w: 0.013, h: 0.18 },
  { x: 0.90, y: 0.79, w: 0.04, h: 0.04 },
];
