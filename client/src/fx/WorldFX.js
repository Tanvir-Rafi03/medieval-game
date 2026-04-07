// client/src/fx/WorldFX.js
// Adds living animations on top of the static world image:
//   - Torch flames (flickering orange/yellow particles)
//   - Potion Lab glow (pulsing green/blue/purple light)
//   - Fountain shimmer (rotating golden sparkles + ripple ring)
//   - Window candlelight (slow warm pulse)
//   - Floating magical fireflies
//
// All positions are fractions of the background layout (0–1),
// matching the same coordinate system as zones.js and collisions.js.

export function initWorldFX(scene, bgLayout) {
  const { x: bx, y: by, w: bw, h: bh } = bgLayout;

  // Helper: convert fractional coords to world pixels
  const px = (fx, fy) => ({ x: bx + fx * bw, y: by + fy * bh });

  _addTorches(scene, bw, bh, px);
  _addFountainFX(scene, bw, bh, px);
  _addFountainWater(scene, bw, bh, px);
  _addPotionGlow(scene, bw, bh, px);
  _addWindowPulse(scene, bw, bh, px);
  _addFireflies(scene, bx, by, bw, bh);
}

// ── Torch flames ─────────────────────────────────────────────────────────────
function _addTorches(scene, bw, bh, px) {
  // Torch positions in the world (fractional)
  const torches = [
    { fx: 0.31, fy: 0.53 }, // left torch near curiosities
    { fx: 0.57, fy: 0.36 }, // center-right lamp post
    { fx: 0.19, fy: 0.42 }, // potion lab area
  ];

  torches.forEach(({ fx, fy }) => {
    const pos = px(fx, fy);
    _spawnFlame(scene, pos.x, pos.y, bw);
  });
}

function _spawnFlame(scene, x, y, bw) {
  const size = bw * 0.012; // scale flame to world size

  // Inner bright core
  const core = scene.add.ellipse(x, y, size, size * 1.4, 0xffdd44, 0.9).setDepth(8);
  // Outer warm glow
  const glow = scene.add.ellipse(x, y, size * 2.5, size * 2.5, 0xff6600, 0.18).setDepth(7);

  // Flicker: randomise scale and alpha rapidly
  scene.tweens.add({
    targets: core,
    scaleX: { from: 0.85, to: 1.15 },
    scaleY: { from: 0.9,  to: 1.1  },
    alpha:  { from: 0.75, to: 1.0  },
    duration: 120,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: Phaser.Math.Between(0, 200),
  });

  // Glow pulse — slower than the core flicker
  scene.tweens.add({
    targets: glow,
    alpha:   { from: 0.10, to: 0.28 },
    scaleX:  { from: 0.9,  to: 1.2  },
    scaleY:  { from: 0.9,  to: 1.2  },
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: Phaser.Math.Between(0, 400),
  });
}

// ── Fountain golden shimmer ───────────────────────────────────────────────────
function _addFountainFX(scene, bw, bh, px) {
  const center = px(0.48, 0.54);
  const r = bw * 0.075; // radius of ripple ring

  // Central golden glow orb
  const glow = scene.add.ellipse(center.x, center.y, r * 1.2, r * 0.5, 0xffd700, 0.22).setDepth(8);
  scene.tweens.add({
    targets: glow,
    alpha:   { from: 0.12, to: 0.32 },
    scaleX:  { from: 0.9,  to: 1.15 },
    scaleY:  { from: 0.9,  to: 1.15 },
    duration: 1800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Ripple rings — 3 rings expanding outward and fading
  for (let i = 0; i < 3; i++) {
    _spawnRipple(scene, center.x, center.y, r, i * 900);
  }

  // Sparkle particles orbiting the fountain
  _spawnFountainSparkles(scene, center.x, center.y, r * 0.6);
}

function _spawnRipple(scene, cx, cy, maxR, delay) {
  const ring = scene.add.ellipse(cx, cy, 0, 0, 0xffd700, 0).setDepth(7);
  ring.setStrokeStyle(2, 0xffd700, 0.6);

  const expand = () => {
    ring.width  = 0;
    ring.height = 0;
    ring.setAlpha(0.6);
    scene.tweens.add({
      targets:  ring,
      width:    maxR * 2,
      height:   maxR * 0.7,
      alpha:    0,
      duration: 2000,
      ease:     'Quad.easeOut',
      onComplete: () => scene.time.delayedCall(300, expand),
    });
  };
  scene.time.delayedCall(delay, expand);
}

function _spawnFountainSparkles(scene, cx, cy, radius) {
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle  = (i / count) * Math.PI * 2;
    const sx = cx + Math.cos(angle) * radius;
    const sy = cy + Math.sin(angle) * radius * 0.4; // flatten for isometric
    const star = scene.add.star(sx, sy, 4, 1, 3, 0xffd700, 0.8).setDepth(9);

    scene.tweens.add({
      targets:  star,
      alpha:    { from: 0.2, to: 0.9 },
      scaleX:   { from: 0.5, to: 1.2 },
      scaleY:   { from: 0.5, to: 1.2 },
      duration: 600 + i * 80,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
      delay:    i * 120,
    });

    // Slowly orbit
    scene.tweens.add({
      targets:  star,
      angle:    360,
      duration: 8000,
      repeat:   -1,
      ease:     'Linear',
    });
  }
}

// ── Fountain water animation ──────────────────────────────────────────────────
// Animates the golden water in the basin using layered tweened ellipses.
// All objects are at depth 10000+ so they render ABOVE the foreground mask (9999).
// The fountain basin in the world image sits at roughly (0.48, 0.57).
function _addFountainWater(scene, bw, bh, px) {
  const basin  = px(0.48, 0.57); // center of the golden water surface
  const rw     = bw * 0.10;      // basin half-width
  const rh     = rw * 0.38;      // flatten for isometric perspective
  const DEPTH  = 10000;          // must be above foreground mask (9999)

  // ── Layer 1: base golden glow — slow breathe ────────────────────────────
  const base = scene.add.ellipse(basin.x, basin.y, rw * 2, rh * 2, 0xffc200, 0.28).setDepth(DEPTH);
  scene.tweens.add({
    targets:  base,
    alpha:    { from: 0.18, to: 0.38 },
    scaleX:   { from: 0.95, to: 1.05 },
    duration: 1600,
    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  // ── Layer 2: bright core — faster shimmer ───────────────────────────────
  const core = scene.add.ellipse(basin.x, basin.y, rw * 1.1, rh * 1.1, 0xffe566, 0.35).setDepth(DEPTH + 1);
  scene.tweens.add({
    targets:  core,
    alpha:    { from: 0.20, to: 0.50 },
    scaleX:   { from: 0.88, to: 1.12 },
    scaleY:   { from: 0.88, to: 1.12 },
    duration: 900,
    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    delay: 200,
  });

  // ── Layer 3: wave bands — 4 horizontal ellipses sweeping across ─────────
  // Each one slides left→right at a different phase, simulating water movement
  const waveColors = [0xffd700, 0xffcc00, 0xffe080, 0xffc840];
  waveColors.forEach((color, i) => {
    const wave = scene.add.ellipse(
      basin.x - rw * 0.3 + i * rw * 0.2,
      basin.y - rh * 0.1 + i * rh * 0.06,
      rw * 0.7, rh * 0.4,
      color, 0.18,
    ).setDepth(DEPTH + 2);

    scene.tweens.add({
      targets:  wave,
      x:        { from: basin.x - rw * 0.4, to: basin.x + rw * 0.4 },
      alpha:    { from: 0.08, to: 0.28 },
      duration: 1800 + i * 300,
      yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
      delay: i * 220,
    });
  });

  // ── Layer 4: highlight streak — bright line sliding across surface ───────
  const streak = scene.add.ellipse(basin.x, basin.y - rh * 0.1, rw * 0.5, rh * 0.18, 0xffffff, 0.22).setDepth(DEPTH + 3);
  scene.tweens.add({
    targets:  streak,
    x:        { from: basin.x - rw * 0.5, to: basin.x + rw * 0.5 },
    alpha:    { from: 0.0, to: 0.30 },
    duration: 1200,
    yoyo: true, repeat: -1,
    ease: 'Quad.easeInOut',
    delay: 600,
  });

  // ── Layer 5: expanding ripple rings ─────────────────────────────────────
  for (let i = 0; i < 4; i++) {
    _spawnWaterRipple(scene, basin.x, basin.y, rw, rh, i * 700, DEPTH + 4);
  }
}

function _spawnWaterRipple(scene, cx, cy, rw, rh, delay, depth) {
  const ring = scene.add.ellipse(cx, cy, 0, 0, 0xffd700, 0)
    .setStrokeStyle(1.5, 0xffd700, 0.7)
    .setDepth(depth);

  const expand = () => {
    const ox = Phaser.Math.FloatBetween(-rw * 0.25, rw * 0.25);
    const oy = Phaser.Math.FloatBetween(-rh * 0.2, rh * 0.2);
    ring.x = cx + ox;
    ring.y = cy + oy;
    ring.width  = rw * 0.2;
    ring.height = rh * 0.2;
    ring.setAlpha(0.8);
    scene.tweens.add({
      targets:  ring,
      width:    rw * 1.8,
      height:   rh * 1.8,
      alpha:    0,
      duration: 1400,
      ease:     'Quad.easeOut',
      onComplete: () => scene.time.delayedCall(Phaser.Math.Between(100, 500), expand),
    });
  };
  scene.time.delayedCall(delay, expand);
}

// ── Potion Lab glow ───────────────────────────────────────────────────────────
function _addPotionGlow(scene, bw, bh, px) {
  const potions = [
    { fx: 0.10, fy: 0.32, color: 0x00ff88, label: 'green'  }, // bubbling cauldron
    { fx: 0.14, fy: 0.28, color: 0x8844ff, label: 'purple' }, // potion bottle
    { fx: 0.17, fy: 0.30, color: 0x44aaff, label: 'blue'   }, // potion bottle
  ];

  potions.forEach(({ fx, fy, color }) => {
    const pos  = px(fx, fy);
    const size = bw * 0.03;

    const blob = scene.add.ellipse(pos.x, pos.y, size, size * 0.6, color, 0.25).setDepth(8);
    scene.tweens.add({
      targets:  blob,
      alpha:    { from: 0.12, to: 0.40 },
      scaleX:   { from: 0.8,  to: 1.3  },
      scaleY:   { from: 0.8,  to: 1.3  },
      duration: 1200 + Phaser.Math.Between(0, 600),
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
      delay:    Phaser.Math.Between(0, 800),
    });
  });

  // Cauldron smoke puffs
  _spawnSmoke(scene, px(0.12, 0.27), bw);
}

function _spawnSmoke(scene, pos, bw) {
  const emit = () => {
    const puff = scene.add.ellipse(
      pos.x + Phaser.Math.Between(-4, 4),
      pos.y,
      bw * 0.015,
      bw * 0.015,
      0x88cc88,
      0.35,
    ).setDepth(9);

    scene.tweens.add({
      targets:  puff,
      y:        pos.y - bw * 0.06,
      alpha:    0,
      scaleX:   2,
      scaleY:   2,
      duration: 1800,
      ease:     'Quad.easeOut',
      onComplete: () => puff.destroy(),
    });

    scene.time.delayedCall(700 + Phaser.Math.Between(0, 400), emit);
  };
  emit();
}

// ── Window candlelight pulse ──────────────────────────────────────────────────
function _addWindowPulse(scene, bw, bh, px) {
  const windows = [
    { fx: 0.07, fy: 0.20 },
    { fx: 0.07, fy: 0.33 },
    { fx: 0.72, fy: 0.18 },
    { fx: 0.82, fy: 0.22 },
    { fx: 0.08, fy: 0.60 },
    { fx: 0.08, fy: 0.70 },
    { fx: 0.65, fy: 0.68 },
  ];

  windows.forEach(({ fx, fy }, i) => {
    const pos  = px(fx, fy);
    const size = bw * 0.028;
    const glow = scene.add.ellipse(pos.x, pos.y, size, size * 0.6, 0xffaa33, 0.14).setDepth(3);

    scene.tweens.add({
      targets:  glow,
      alpha:    { from: 0.08, to: 0.22 },
      duration: 2000 + i * 300,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
      delay:    i * 200,
    });
  });
}

// ── Magical fireflies ─────────────────────────────────────────────────────────
function _addFireflies(scene, bx, by, bw, bh) {
  const count = 12;
  for (let i = 0; i < count; i++) {
    const fx = scene.add.star(
      bx + Phaser.Math.FloatBetween(0.2, 0.8) * bw,
      by + Phaser.Math.FloatBetween(0.2, 0.7) * bh,
      4, 1, 2.5,
      0xffeebb,
      0,
    ).setDepth(9);

    // Drift randomly + fade in/out
    const drift = () => {
      scene.tweens.add({
        targets:  fx,
        x:        fx.x + Phaser.Math.Between(-30, 30),
        y:        fx.y + Phaser.Math.Between(-20, 20),
        alpha:    { from: 0, to: Phaser.Math.FloatBetween(0.5, 0.9) },
        duration: Phaser.Math.Between(1500, 3000),
        yoyo:     true,
        ease:     'Sine.easeInOut',
        onComplete: drift,
      });
    };
    scene.time.delayedCall(i * 300, drift);
  }
}
