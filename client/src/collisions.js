// client/src/collisions.js
// Defines two layers of spatial data, all as fractions of the background image (0–1):
//
// WALLS — static physics bodies that block the player from entering buildings/fountain.
//         x,y = top-left corner, w,h = size.
//
// FOREGROUND_REGIONS — areas rendered ON TOP of the player (front faces of buildings
//         and the fountain base). When the player walks "behind" one of these,
//         the masked world image covers them, faking isometric depth.

export const WALLS = [
  // ── Screen boundaries ───────────────────────────────────────────────────
  { x: 0.00, y: 0.00, w: 1.00, h: 0.04 }, // top
  { x: 0.00, y: 0.96, w: 1.00, h: 0.04 }, // bottom
  { x: 0.00, y: 0.00, w: 0.02, h: 1.00 }, // left
  { x: 0.98, y: 0.00, w: 0.02, h: 1.00 }, // right

  // ── Potion Lab (top-left building) ───────────────────────────────────────
  { x: 0.02, y: 0.08, w: 0.04, h: 0.36 }, // left wall
  { x: 0.02, y: 0.08, w: 0.30, h: 0.08 }, // back wall (top edge)
  { x: 0.02, y: 0.40, w: 0.30, h: 0.05 }, // front wall base — player stops here

  // ── Parchment & Quill (top-center) ──────────────────────────────────────
  { x: 0.28, y: 0.04, w: 0.26, h: 0.06 }, // back wall
  { x: 0.28, y: 0.31, w: 0.26, h: 0.05 }, // front wall base

  // ── Lucky Cauldron (top-right) ───────────────────────────────────────────
  { x: 0.90, y: 0.06, w: 0.08, h: 0.36 }, // right wall
  { x: 0.60, y: 0.06, w: 0.38, h: 0.07 }, // back wall
  { x: 0.60, y: 0.39, w: 0.38, h: 0.05 }, // front wall base

  // ── Fountain (center) ────────────────────────────────────────────────────
  { x: 0.37, y: 0.42, w: 0.22, h: 0.18 }, // fountain base — solid block

  // ── Curiosities Shop (bottom-left) ──────────────────────────────────────
  { x: 0.02, y: 0.52, w: 0.04, h: 0.30 }, // left wall
  { x: 0.02, y: 0.52, w: 0.26, h: 0.06 }, // back wall
  { x: 0.02, y: 0.77, w: 0.26, h: 0.05 }, // front wall base

  // ── Broomstick Museum (bottom-right) ────────────────────────────────────
  { x: 0.90, y: 0.58, w: 0.08, h: 0.34 }, // right wall
  { x: 0.52, y: 0.58, w: 0.46, h: 0.07 }, // back wall
  { x: 0.52, y: 0.90, w: 0.46, h: 0.05 }, // front wall base
];

// These regions are rendered as a masked foreground layer (depth > player).
// When the player walks above the region's y midpoint they are "behind" it.
export const FOREGROUND_REGIONS = [
  // Fountain front basin — most important, player walks behind this
  { x: 0.34, y: 0.48, w: 0.28, h: 0.16 },

  // Potion Lab front overhang / roof edge
  { x: 0.02, y: 0.33, w: 0.32, h: 0.12 },

  // Parchment & Quill front overhang
  { x: 0.28, y: 0.26, w: 0.26, h: 0.10 },

  // Lucky Cauldron front overhang
  { x: 0.60, y: 0.32, w: 0.38, h: 0.12 },

  // Curiosities front overhang
  { x: 0.02, y: 0.68, w: 0.26, h: 0.12 },

  // Broomstick Museum front overhang
  { x: 0.52, y: 0.82, w: 0.46, h: 0.12 },
];
