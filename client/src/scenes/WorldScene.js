// client/src/scenes/WorldScene.js
// Main game scene. World background, animated player sprite, WASD movement,
// interactive building zones, name tag, camera polish.

import { ZONES } from '../zones.js';
import { playerState } from '../playerState.js';

const SPEED = 180;
const PLAYER_NAME = 'Adventurer'; // Phase 5: replace with real username

// Spritesheet layout (768×616, 4 cols × 4 rows, 192×154 per frame, no margin):
//   Row 0 → walk-down  (frames 0–3)
//   Row 1 → walk-left  (frames 4–7)
//   Row 2 → walk-right (frames 8–11)
//   Row 3 → walk-up    (frames 12–15)
const IDLE_FRAMES = { down: 0, left: 4, right: 8, up: 12 };

// Hitbox — values in unscaled frame pixels (192×154 frame).
// Character occupies roughly the middle 42% horizontally, bottom 60% vertically.
const BODY_W        = 80;   // ~42% of 192
const BODY_H        = 80;   // ~52% of 154
const BODY_OFFSET_X = 56;   // (192 - 80) / 2 → horizontally centered
const BODY_OFFSET_Y = 60;   // upper 40% is head/hair, body starts ~y=60

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
    this._zoneObjects  = [];
    this._lastDir      = 'down';
    this._bobbingTween = null;
    this._unsubState   = null;
  }

  create() {
    const { width, height } = this.scale;

    // ── World background ────────────────────────────────────────────────────
    const bg = this.add.image(0, 0, 'world').setOrigin(0, 0);
    const bgScale = Math.max(width / bg.width, height / bg.height);
    const bgW = bg.width  * bgScale;
    const bgH = bg.height * bgScale;
    const bgX = (width  - bgW) / 2;
    const bgY = (height - bgH) / 2;
    bg.setScale(bgScale).setPosition(bgX, bgY).setDepth(0);
    this._bgLayout = { x: bgX, y: bgY, w: bgW, h: bgH };

    // ── Player sprite ───────────────────────────────────────────────────────
    this._sprite = this.physics.add.sprite(width / 2, height * 0.52, 'player', 0);
    this._sprite.setScale(0.6);           // 192px frame → ~115px on screen
    this._sprite.body.setSize(BODY_W, BODY_H);
    this._sprite.body.setOffset(BODY_OFFSET_X, BODY_OFFSET_Y);
    this._sprite.body.setCollideWorldBounds(true);
    this._sprite.setDepth(10);

    // ── Name tag ────────────────────────────────────────────────────────────
    this._nameTag = this.add.text(0, 0, PLAYER_NAME, {
      fontFamily: '"Cinzel", serif',
      fontSize:   '10px',
      color:      '#c9a84c',
      stroke:     '#1a1a2e',
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(11);

    // ── Input ────────────────────────────────────────────────────────────────
    this._cursors = this.input.keyboard.createCursorKeys();
    this._wasd    = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // ── Camera ───────────────────────────────────────────────────────────────
    // Bound to world image so camera never shows empty space beyond edges
    this.cameras.main.setBounds(bgX, bgY, bgW, bgH);
    this.cameras.main.startFollow(this._sprite, true, 0.1, 0.1);

    // ── Interactive zones ────────────────────────────────────────────────────
    this._createZones();

    // ── Tooltip DOM element ──────────────────────────────────────────────────
    this._tooltipEl = document.createElement('div');
    this._tooltipEl.id = 'zone-tooltip';
    Object.assign(this._tooltipEl.style, {
      position:    'fixed',
      padding:     '8px 14px',
      background:  'rgba(26,26,46,0.92)',
      border:      '1px solid #c9a84c',
      color:       '#c9a84c',
      fontFamily:  '"Cinzel", serif',
      fontSize:    '14px',
      borderRadius:'4px',
      pointerEvents:'none',
      display:     'none',
      zIndex:      '20',
      whiteSpace:  'nowrap',
    });
    document.getElementById('ui-layer').appendChild(this._tooltipEl);

    // ── Vignette overlay ─────────────────────────────────────────────────────
    this._createVignette();

    // ── React to playerState changes ─────────────────────────────────────────
    this._unsubState = playerState.onChange((state) => {
      if (state === 'working')  this._enterWorking();
      if (state === 'free')     this._exitWorking();
      if (state === 'on-break') this._exitWorking();
    });

    // Apply initial state in case something set it before scene loaded
    if (playerState.get() === 'working') this._enterWorking();
  }

  // ── Vignette ──────────────────────────────────────────────────────────────
  _createVignette() {
    const el = document.createElement('div');
    el.id = 'vignette';
    Object.assign(el.style, {
      position:     'fixed',
      inset:        '0',
      pointerEvents:'none',
      zIndex:       '9',
      background:   'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.72) 100%)',
    });
    document.getElementById('ui-layer').appendChild(el);
    this._vignetteEl = el;
  }

  // ── Working state ─────────────────────────────────────────────────────────
  _enterWorking() {
    this._sprite.anims.stop();
    this._sprite.setFrame(IDLE_FRAMES.down + 1); // mid-walk frame as "sit"
    this._sprite.body.setVelocity(0);

    this._bobbingTween = this.tweens.add({
      targets:  this._sprite,
      y:        this._sprite.y - 2,
      duration: 1500,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  _exitWorking() {
    if (this._bobbingTween) {
      this._bobbingTween.stop();
      this._bobbingTween = null;
    }
    this._sprite.setFrame(IDLE_FRAMES[this._lastDir]);
  }

  // ── Zones ─────────────────────────────────────────────────────────────────
  _createZones() {
    const { x: bx, y: by, w: bw, h: bh } = this._bgLayout;

    ZONES.forEach((zone) => {
      const rx = bx + zone.x * bw;
      const ry = by + zone.y * bh;
      const rw = zone.w * bw;
      const rh = zone.h * bh;

      const rect = this.add
        .rectangle(rx + rw / 2, ry + rh / 2, rw, rh, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);

      rect.on('pointerover',  (p) => { this._showTooltip(p.x, p.y, zone.name); this._highlightZone(rect, true); });
      rect.on('pointermove',  (p) => { this._moveTooltip(p.x, p.y); });
      rect.on('pointerout',   ()  => { this._hideTooltip(); this._highlightZone(rect, false); });
      rect.on('pointerdown',  ()  => { this._openZonePanel(zone); });

      this._zoneObjects.push({ rect, zone });
    });
  }

  _highlightZone(rect, on) {
    on
      ? rect.setFillStyle(0xc9a84c, 0.12).setStrokeStyle(2, 0xc9a84c, 0.7)
      : rect.setFillStyle(0xffffff, 0).setStrokeStyle(0);
  }

  _showTooltip(x, y, name) {
    this._tooltipEl.textContent = name;
    this._tooltipEl.style.display = 'block';
    this._moveTooltip(x, y);
  }

  _moveTooltip(x, y) {
    this._tooltipEl.style.left = `${x + 14}px`;
    this._tooltipEl.style.top  = `${y - 10}px`;
  }

  _hideTooltip() {
    this._tooltipEl.style.display = 'none';
  }

  _openZonePanel(zone) {
    window.dispatchEvent(new CustomEvent('zone:open', { detail: zone }));
  }

  // ── Update loop ───────────────────────────────────────────────────────────
  update() {
    // Name tag follows sprite, 18px above head
    this._nameTag.setPosition(
      this._sprite.x,
      this._sprite.y - this._sprite.displayHeight / 2 - 18,
    );

    // Lock movement when working
    if (playerState.get() === 'working') {
      this._sprite.body.setVelocity(0);
      return;
    }

    const left  = this._cursors.left.isDown  || this._wasd.left.isDown;
    const right = this._cursors.right.isDown || this._wasd.right.isDown;
    const up    = this._cursors.up.isDown    || this._wasd.up.isDown;
    const down  = this._cursors.down.isDown  || this._wasd.down.isDown;

    let vx = 0, vy = 0;

    if (left)  { vx -= SPEED;       vy += SPEED * 0.25; }
    if (right) { vx += SPEED;       vy -= SPEED * 0.25; }
    if (up)    { vx += SPEED * 0.5; vy -= SPEED; }
    if (down)  { vx -= SPEED * 0.5; vy += SPEED; }

    if ((left || right) && (up || down)) { vx *= 0.707; vy *= 0.707; }

    this._sprite.body.setVelocity(vx, vy);

    // ── Animations ────────────────────────────────────────────────────────
    const moving = vx !== 0 || vy !== 0;

    if (moving) {
      // Determine dominant direction for animation
      if      (left  && !right) { this._sprite.anims.play('walk-left',  true); this._lastDir = 'left'; }
      else if (right && !left)  { this._sprite.anims.play('walk-right', true); this._lastDir = 'right'; }
      else if (up    && !down)  { this._sprite.anims.play('walk-up',    true); this._lastDir = 'up'; }
      else if (down  && !up)    { this._sprite.anims.play('walk-down',  true); this._lastDir = 'down'; }
    } else {
      // Idle: stop on first frame of last-used direction
      this._sprite.anims.stop();
      this._sprite.setFrame(IDLE_FRAMES[this._lastDir]);
    }
  }

  shutdown() {
    this._unsubState?.();
    this._tooltipEl?.remove();
    this._vignetteEl?.remove();
  }
}
