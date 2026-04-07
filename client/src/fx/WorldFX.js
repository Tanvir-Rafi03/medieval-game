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

// ── Fountain water simulation ─────────────────────────────────────────────────
// Uses Phaser's particle emitter to fake animated water:
//   1. Upward spray jets from the dragon statue top
//   2. Droplets arcing outward and landing in the basin
//   3. Splash rings where droplets land
//   4. Basin surface shimmer (fast glinting particles)
function _addFountainWater(scene, bw, bh, px) {
  const center = px(0.48, 0.51); // top of fountain statue
  const basin  = px(0.48, 0.56); // water surface of basin

  // Create a tiny white circle texture for water particles
  const gfx = scene.make.graphics({ add: false });

  // Drop shape — small soft circle
  gfx.fillStyle(0xffffff, 1);
  gfx.fillCircle(4, 4, 4);
  gfx.generateTexture('water-drop', 8, 8);

  // Shimmer shape — tiny bright dot
  gfx.clear();
  gfx.fillStyle(0xffffff, 1);
  gfx.fillCircle(2, 2, 2);
  gfx.generateTexture('water-shimmer', 4, 4);
  gfx.destroy();

  const scale = bw / 800; // normalise to reference width

  // ── 1. Central upward jet — straight up spray ──────────────────────────
  scene.add.particles(center.x, center.y, 'water-drop', {
    speed:     { min: 40 * scale, max: 80 * scale },
    angle:     { min: 250, max: 290 },   // mostly upward (270 = up in Phaser)
    gravityY:  160 * scale,
    lifespan:  { min: 400, max: 700 },
    scale:     { start: 0.6 * scale, end: 0 },
    alpha:     { start: 0.85, end: 0 },
    tint:      [0xaaddff, 0xc8e8ff, 0xffd700, 0xffe566], // blue-white + gold glint
    frequency: 30,
    quantity:  2,
    depth:     9998,
  });

  // ── 2. Arcing droplets — spray out in an isometric arc pattern ──────────
  // Four jets angled outward to simulate the dragon statue spraying around
  const jetAngles = [230, 250, 290, 310]; // angled up-left, up, up-right
  jetAngles.forEach((angle) => {
    scene.add.particles(center.x, center.y, 'water-drop', {
      speed:    { min: 55 * scale, max: 95 * scale },
      angle:    { min: angle - 8, max: angle + 8 },
      gravityY: 200 * scale,
      lifespan: { min: 500, max: 850 },
      scale:    { start: 0.45 * scale, end: 0 },
      alpha:    { start: 0.7, end: 0 },
      tint:     [0x88ccff, 0xaaddff, 0xffd700],
      frequency: 60,
      quantity:  1,
      depth:     9998,
    });
  });

  // ── 3. Basin surface shimmer — fast glinting dots on the water surface ──
  const basinR = bw * 0.055;
  scene.add.particles(basin.x, basin.y, 'water-shimmer', {
    // Spawn across the elliptical basin surface
    emitZone: {
      type:   'random',
      source: new Phaser.Geom.Ellipse(0, 0, basinR * 2, basinR * 0.7),
    },
    speed:    { min: 0, max: 4 * scale },
    angle:    { min: 0, max: 360 },
    lifespan: { min: 200, max: 500 },
    scale:    { start: 0.8 * scale, end: 0 },
    alpha:    { start: 0, end: 0 },  // controlled by tween below via custom alpha
    tint:     [0xaaddff, 0xffd700, 0xffffff, 0x88ccff],
    frequency: 40,
    quantity:  3,
    depth:     9002, // above bg, behind foreground mask
    alpha:     { start: 0.9, end: 0 },
  });

  // ── 4. Ripple rings on basin surface — water landing effect ─────────────
  // More frequent, smaller, blue-tinted version of the gold ripples
  for (let i = 0; i < 4; i++) {
    _spawnWaterRipple(scene, basin.x, basin.y, basinR * 0.9, i * 600);
  }
}

function _spawnWaterRipple(scene, cx, cy, maxR, delay) {
  // Offset each ring randomly within the basin so they look natural
  const ox = Phaser.Math.Between(-maxR * 0.3, maxR * 0.3);
  const oy = Phaser.Math.Between(-maxR * 0.15, maxR * 0.15);
  const ring = scene.add.ellipse(cx + ox, cy + oy, 0, 0, 0x88ccff, 0)
    .setStrokeStyle(1.5, 0x88ccff, 0.7)
    .setDepth(9001);

  const expand = () => {
    // Re-randomise position each cycle
    ring.x = cx + Phaser.Math.Between(-maxR * 0.3, maxR * 0.3);
    ring.y = cy + Phaser.Math.Between(-maxR * 0.15, maxR * 0.15);
    ring.width  = 0;
    ring.height = 0;
    ring.setAlpha(0.7);
    scene.tweens.add({
      targets:  ring,
      width:    maxR * 2,
      height:   maxR * 0.65,
      alpha:    0,
      duration: 1200,
      ease:     'Quad.easeOut',
      onComplete: () => scene.time.delayedCall(Phaser.Math.Between(200, 600), expand),
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
