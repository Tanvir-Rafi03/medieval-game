// client/src/collisions.js
// WALLS — static physics bodies blocking buildings/fountain.
// FOREGROUND_REGIONS — rendered above player for depth illusion.
// All coords are fractions (0–1) of the background image dimensions.
//
// To visualise walls in-game, set DEBUG_WALLS = true below.

export const DEBUG_WALLS = false; // flip to true to see red outlines

export const WALLS = [
  // ── World boundary (keep player inside the cobblestone area) ────────────
  { x: 0.00, y: 0.00, w: 1.00, h: 0.05 }, // top sky — not walkable
  { x: 0.00, y: 0.92, w: 1.00, h: 0.08 }, // bottom edge
  { x: 0.00, y: 0.00, w: 0.02, h: 1.00 }, // left edge
  { x: 0.98, y: 0.00, w: 0.02, h: 1.00 }, // right edge

  // ── Potion Lab — top-left ────────────────────────────────────────────────
  { x: 0.02, y: 0.05, w: 0.28, h: 0.06 }, // back wall (roof line)
  { x: 0.02, y: 0.05, w: 0.03, h: 0.32 }, // left side wall
  { x: 0.02, y: 0.35, w: 0.28, h: 0.04 }, // front base — player stops here

  // ── Parchment & Quill — top-center ──────────────────────────────────────
  { x: 0.30, y: 0.04, w: 0.22, h: 0.05 }, // back wall
  { x: 0.30, y: 0.29, w: 0.22, h: 0.04 }, // front base

  // ── Lucky Cauldron — top-right ───────────────────────────────────────────
  { x: 0.60, y: 0.05, w: 0.36, h: 0.06 }, // back wall
  { x: 0.93, y: 0.05, w: 0.05, h: 0.34 }, // right side wall
  { x: 0.60, y: 0.36, w: 0.36, h: 0.04 }, // front base

  // ── Fountain — center ────────────────────────────────────────────────────
  { x: 0.38, y: 0.40, w: 0.20, h: 0.20 }, // fountain base solid block

  // ── Curiosities — bottom-left ────────────────────────────────────────────
  { x: 0.02, y: 0.50, w: 0.03, h: 0.28 }, // left side wall
  { x: 0.02, y: 0.50, w: 0.24, h: 0.05 }, // back wall
  { x: 0.02, y: 0.75, w: 0.24, h: 0.04 }, // front base

  // ── Broomstick Museum — bottom-right ─────────────────────────────────────
  { x: 0.54, y: 0.58, w: 0.40, h: 0.05 }, // back wall
  { x: 0.91, y: 0.58, w: 0.05, h: 0.30 }, // right side wall
  { x: 0.54, y: 0.88, w: 0.40, h: 0.04 }, // front base
];

export const FOREGROUND_REGIONS = [
  // Fountain front basin
  { x: 0.35, y: 0.50, w: 0.26, h: 0.12 },

  // Potion Lab front overhang
  { x: 0.02, y: 0.30, w: 0.30, h: 0.10 },

  // Parchment & Quill front overhang
  { x: 0.30, y: 0.24, w: 0.22, h: 0.08 },

  // Lucky Cauldron front overhang
  { x: 0.60, y: 0.30, w: 0.36, h: 0.10 },

  // Curiosities front overhang
  { x: 0.02, y: 0.66, w: 0.24, h: 0.12 },

  // Broomstick Museum front overhang
  { x: 0.54, y: 0.80, w: 0.40, h: 0.10 },
];
