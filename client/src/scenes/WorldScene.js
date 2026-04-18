// client/src/scenes/WorldScene.js
// Three-layer depth system:
//   depth 0     → world background image
//   depth 1–500 → player (y-sorted: walking down = higher depth = drawn in front)
//   depth 501   → name tag
//   depth 9999  → foreground mask (building fronts + lamp post — always above player)

import { ZONES }                              from '../zones.js';
import { WALLS, FOREGROUND_REGIONS, DEBUG_WALLS, DEBUG_FOREGROUND } from '../collisions.js';
import { playerState }                        from '../playerState.js';

const SPEED       = 180;
const PLAYER_NAME = 'Adventurer';

// Approximate fractional positions (0-1) of building windows & glows
const WINDOW_GLOWS = [
  // Potion Lab — amber + teal cauldron
  { fx: 0.075, fy: 0.20, tint: 0xff8833, s: 2.2, a: 0.22 },
  { fx: 0.092, fy: 0.27, tint: 0x00ffaa, s: 2.8, a: 0.20 },
  { fx: 0.062, fy: 0.33, tint: 0xffaa44, s: 1.8, a: 0.18 },
  { fx: 0.175, fy: 0.16, tint: 0xffcc55, s: 1.8, a: 0.16 },
  { fx: 0.215, fy: 0.24, tint: 0xff8833, s: 1.5, a: 0.17 },
  // Parchment & Quill
  { fx: 0.385, fy: 0.11, tint: 0xffcc66, s: 1.8, a: 0.18 },
  { fx: 0.440, fy: 0.15, tint: 0xffaa44, s: 1.6, a: 0.16 },
  { fx: 0.500, fy: 0.18, tint: 0xffcc55, s: 1.7, a: 0.15 },
  // Lucky Cauldron
  { fx: 0.720, fy: 0.11, tint: 0xffaa33, s: 2.2, a: 0.20 },
  { fx: 0.800, fy: 0.16, tint: 0xff8833, s: 2.0, a: 0.22 },
  { fx: 0.875, fy: 0.20, tint: 0xffcc44, s: 1.8, a: 0.18 },
  { fx: 0.678, fy: 0.19, tint: 0xffbb44, s: 1.6, a: 0.17 },
  // Curiosities Shop — purple magic
  { fx: 0.090, fy: 0.60, tint: 0xcc77ff, s: 2.5, a: 0.25 },
  { fx: 0.130, fy: 0.67, tint: 0xffaa44, s: 1.8, a: 0.18 },
  { fx: 0.072, fy: 0.73, tint: 0xaa55ff, s: 2.0, a: 0.20 },
  // Broomstick Museum
  { fx: 0.640, fy: 0.65, tint: 0xffcc44, s: 2.0, a: 0.18 },
  { fx: 0.745, fy: 0.69, tint: 0xffaa33, s: 1.8, a: 0.17 },
  { fx: 0.840, fy: 0.73, tint: 0xff9933, s: 1.6, a: 0.16 },
];

const IDLE_FRAMES = { down: 0, left: 4, right: 8, up: 12 };

// ── Harry Potter spell system ────────────────────────────────────────────────
const SPELLS = [
  { name: 'Lumos',              color: 0xffff88, count: 30, speed: 130 },
  { name: 'Expecto Patronum',   color: 0x88ffdd, count: 75, speed: 220 },
  { name: 'Expelliarmus',       color: 0xff5533, count: 45, speed: 170 },
  { name: 'Alohomora',          color: 0xffcc22, count: 28, speed: 110 },
  { name: 'Wingardium Leviosa', color: 0x88ff88, count: 55, speed: 190 },
  { name: 'Accio',              color: 0x4488ff, count: 42, speed: 230 },
  { name: 'Stupefy',            color: 0xff2255, count: 68, speed: 190 },
  { name: 'Nox',                color: 0x7788cc, count: 22, speed:  80 },
];

// ── Floating candle positions — central plaza only ───────────────────────────

const BODY_W        = 200;
const BODY_H        = 220;
const BODY_OFFSET_X = 156;
const BODY_OFFSET_Y = 260;

// Door proximity triggers — fractional coords align with building front walls
const DOOR_ZONES = [
  { id: 'parchment-quill', fx: 0.40, fy: 0.41, label: '✒️  Parchment & Quill' },
  { id: 'potion-lab',      fx: 0.16, fy: 0.52, label: '⚗️  Potion Lab' },
  { id: 'lucky-cauldron',  fx: 0.73, fy: 0.50, label: '🍺  The Lucky Cauldron' },
  { id: 'curiosities',     fx: 0.16, fy: 0.75, label: '🔮  Curiosities Shop' },
  { id: 'broomstick-museum', fx: 0.62, fy: 0.80, label: '🏆  Broomstick Museum' },
];

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
    this._zoneObjects   = [];
    this._lastDir       = 'down';
    this._bobbingTween  = null;
    this._unsubState    = null;
    this._doorZones     = [];
    this._nearDoor      = null;
    this._doorPrompt    = null;
    this._doorGlow      = null;
    this._promptTween   = null;
    this._glowTween     = null;
    this._doorBobObj    = null;
  }

  create() {
    const { width, height } = this.scale;

    // ── Background (depth 0) ─────────────────────────────────────────────────
    const bg = this.add.image(0, 0, 'world').setOrigin(0, 0);
    const bgScale = Math.max(width / bg.width, height / bg.height);
    const bgW = bg.width  * bgScale;
    const bgH = bg.height * bgScale;
    const bgX = (width  - bgW) / 2;
    const bgY = (height - bgH) / 2;
    bg.setScale(bgScale).setPosition(bgX, bgY).setDepth(0);
    this._bgLayout = { x: bgX, y: bgY, w: bgW, h: bgH, scale: bgScale };

    // Physics world bounds must match the scaled background, not the viewport
    this.physics.world.setBounds(bgX, bgY, bgW, bgH);

    // ── Physics walls ────────────────────────────────────────────────────────
    this._createWalls();

    // ── Player (depth = sprite.y) ────────────────────────────────────────────
    this._sprite = this.physics.add.sprite(width / 2, height * 0.52, 'player', 0);
    this._sprite.setScale(0.13);
    this._sprite.body.setSize(BODY_W, BODY_H);
    this._sprite.body.setOffset(BODY_OFFSET_X, BODY_OFFSET_Y);
    this._sprite.body.setCollideWorldBounds(true);
    this._sprite.setDepth(this._sprite.y);

    this.physics.add.collider(this._sprite, this._walls);

    // ── Foreground mask (lamp post — always above player) ────────────────────
    this._createForeground();

    // ── Name tag ─────────────────────────────────────────────────────────────
    this._nameTagBg = this.add.graphics();
    this._nameTag   = this.add.text(0, 0, PLAYER_NAME, {
      fontFamily: '"Cinzel", serif',
      fontSize:   '9px',
      color:      '#2a1a00',
      resolution: 2,
    }).setOrigin(0.5, 0.5);
    this._drawNameTag();

    // ── Input ─────────────────────────────────────────────────────────────────
    // enableCapture: false → Phaser reads the keys but does NOT call
    // event.preventDefault(), so W/A/S/D/Enter/Space can still be typed
    // inside HTML input fields when an overlay panel is open.
    this._cursors = this.input.keyboard.createCursorKeys();
    this._wasd    = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }, false);  // ← false = no preventDefault

    // Also clear the captures that createCursorKeys() added (arrows + space)
    this.input.keyboard.clearCaptures();

    // ── Enter key ────────────────────────────────────────────────────────────
    this._enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER, false);

    // ── Door proximity zones ─────────────────────────────────────────────────
    const { x: bx, y: by, w: bw, h: bh } = this._bgLayout;
    this._doorZones = DOOR_ZONES.map((d) => ({
      ...d,
      wx:     bx + d.fx * bw,
      wy:     by + d.fy * bh,
      radius: bw * 0.07,
    }));

    // Glowing prompt — two layers: outer glow + main text
    this._doorGlow = this.add.text(0, 0, '', {
      fontFamily: '"Cinzel", serif',
      fontSize:   '14px',
      color:      '#c9a84c',
      stroke:     '#c9a84c',
      strokeThickness: 12,
    }).setOrigin(0.5, 1).setDepth(9988).setAlpha(0);

    this._doorPrompt = this.add.text(0, 0, '', {
      fontFamily: '"Cinzel", serif',
      fontSize:   '13px',
      color:      '#f0d89a',
      stroke:     '#1a0f00',
      strokeThickness: 5,
      padding:    { x: 14, y: 7 },
    }).setOrigin(0.5, 1).setDepth(9990).setAlpha(0);

    // ── Camera ───────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(bgX, bgY, bgW, bgH);
    this.cameras.main.startFollow(this._sprite, true, 0.1, 0.1);

    // ── Parallax ─────────────────────────────────────────────────────────────
    this._parallaxMax     = 18;
    this._parallaxTarget  = { x: 0, y: 0 };
    this._parallaxCurrent = { x: 0, y: 0 };
    this.input.on('pointermove', (ptr) => {
      const cx = this.scale.width  / 2;
      const cy = this.scale.height / 2;
      this._parallaxTarget.x = ((ptr.x - cx) / cx) * -this._parallaxMax;
      this._parallaxTarget.y = ((ptr.y - cy) / cy) * -this._parallaxMax;
    });

    // ── Interactive zones ─────────────────────────────────────────────────────
    this._createZones();

    // ── Tooltip ──────────────────────────────────────────────────────────────
    this._tooltipEl = document.createElement('div');
    this._tooltipEl.id = 'zone-tooltip';
    Object.assign(this._tooltipEl.style, {
      position:     'fixed',
      padding:      '8px 14px',
      background:   'rgba(26,26,46,0.92)',
      border:       '1px solid #c9a84c',
      color:        '#c9a84c',
      fontFamily:   '"Cinzel", serif',
      fontSize:     '14px',
      borderRadius: '4px',
      pointerEvents:'none',
      display:      'none',
      zIndex:       '20',
      whiteSpace:   'nowrap',
    });
    document.getElementById('ui-layer').appendChild(this._tooltipEl);

    // ── Vignette ─────────────────────────────────────────────────────────────
    this._createVignette();

    // ── Atmosphere ───────────────────────────────────────────────────────────
    this._createGlowTextures();
    this._createLampGlow();
    this._createWindowGlows();
    this._createFireflies();
    this._createMagicSparkles();
    this._createStarParticles();
    this._createGroundFog();
    this._createPlayerShadow();
    this._createFootstepEmitter();
    this._createZoneAuras();
    this._createSpellSystem();
    // Removed: candles, owls, shooting stars, click ripple (crash sources)
    this._createPlayerAura();

    // ── Daily Prophet Phaser events ───────────────────────────────────────────
    window.addEventListener('prophet:headlineReady', (e) => {
      this._floatText(`📰 "${e.detail.headline.slice(0, 50)}…"`, '#c9a84c');
    });
    window.addEventListener('prophet:fullEdition', () => {
      this._floatText('📰 Full edition published!', '#7ab894');
    });
    window.addEventListener('morningChallengeComplete', (e) => {
      const { xp, gold } = e.detail;
      this._floatText(`+${xp} XP  ✦  +${gold} Gold`, '#c9a84c');
      this._goldSparkle();
      this.tweens.add({
        targets:  this._sprite,
        y:        this._sprite.y - 14,
        duration: 180,
        yoyo:     true,
        ease:     'Power2',
      });
    });

    // ── Player state ──────────────────────────────────────────────────────────
    this._unsubState = playerState.onChange((state) => {
      if (state === 'working')  this._enterWorking();
      if (state === 'free')     this._exitWorking();
      if (state === 'on-break') this._exitWorking();
    });
    if (playerState.get() === 'working') this._enterWorking();
  }

  // ── Physics walls ──────────────────────────────────────────────────────────
  _createWalls() {
    const { x: bx, y: by, w: bw, h: bh } = this._bgLayout;
    this._walls = this.physics.add.staticGroup();

    WALLS.forEach((wall) => {
      const wx = bx + wall.x * bw;
      const wy = by + wall.y * bh;
      const ww = wall.w * bw;
      const wh = wall.h * bh;

      const body = this.add.rectangle(wx + ww / 2, wy + wh / 2, ww, wh, 0x000000, 0);
      this.physics.add.existing(body, true);
      this._walls.add(body);

      if (DEBUG_WALLS) {
        this.add.rectangle(wx + ww / 2, wy + wh / 2, ww, wh)
          .setStrokeStyle(2, 0xff0000, 0.8)
          .setDepth(9998);
      }
    });
  }

  // ── Name tag ──────────────────────────────────────────────────────────────
  // ── Foreground mask ────────────────────────────────────────────────────────
  _createForeground() {
    const { x: bx, y: by, w: bw, h: bh, scale: bgScale } = this._bgLayout;

    const fg = this.add.image(bx, by, 'world')
      .setOrigin(0, 0)
      .setScale(bgScale)
      .setDepth(9999);

    const mask = this.make.graphics({ add: false });
    mask.fillStyle(0xffffff);

    FOREGROUND_REGIONS.forEach((r) => {
      const rx = bx + r.x * bw, ry = by + r.y * bh;
      const rw = r.w * bw,      rh = r.h * bh;
      mask.fillRect(rx, ry, rw, rh);

      if (DEBUG_FOREGROUND) {
        this.add.rectangle(rx + rw / 2, ry + rh / 2, rw, rh)
          .setStrokeStyle(2, 0xff0000, 0.8)
          .setDepth(10000);
      }
    });

    fg.setMask(mask.createGeometryMask());
  }

  _drawNameTag() {
    const pad = { x: 8, y: 3 };
    const tw  = this._nameTag.width  + pad.x * 2;
    const th  = this._nameTag.height + pad.y * 2;
    const g   = this._nameTagBg;
    g.clear();
    g.fillStyle(0xf0d89a, 0.92);
    g.fillRoundedRect(-tw / 2, -th / 2, tw, th, 3);
    g.lineStyle(1, 0xc9a84c, 1);
    g.strokeRoundedRect(-tw / 2, -th / 2, tw, th, 3);
    g.fillStyle(0xc9a84c, 0.8);
    g.fillRect(-tw / 2 - 2, -2, 3, 4);
    g.fillRect( tw / 2 - 1, -2, 3, 4);
    this._nameTagH = th;
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
    this._sprite.setFrame(IDLE_FRAMES.down + 1);
    this._sprite.body.setVelocity(0);
    this._bobbingTween = this.tweens.add({
      targets: this._sprite, y: this._sprite.y - 2,
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  _exitWorking() {
    this._bobbingTween?.stop();
    this._bobbingTween = null;
    this._sprite.setFrame(IDLE_FRAMES[this._lastDir]);
  }

  // ── Zones ─────────────────────────────────────────────────────────────────
  _createZones() {
    const { x: bx, y: by, w: bw, h: bh } = this._bgLayout;

    ZONES.forEach((zone) => {
      const rx = bx + zone.x * bw, ry = by + zone.y * bh;
      const rw = zone.w * bw,      rh = zone.h * bh;

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
    on ? rect.setFillStyle(0xc9a84c, 0.12).setStrokeStyle(2, 0xc9a84c, 0.7)
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
  _hideTooltip() { this._tooltipEl.style.display = 'none'; }
  _openZonePanel(zone) { window.dispatchEvent(new CustomEvent('zone:open', { detail: zone })); }

  // ── Door proximity prompt ─────────────────────────────────────────────────
  _showDoorPrompt(door) {
    const label = `[ Enter ]  ${door.label}`;
    this._doorGlow.setText(label);
    this._doorPrompt.setText(label);
    this._doorGlow.setAlpha(0.22);
    this._doorPrompt.setAlpha(1);
    this._doorBobOffset = 0; // reset bob

    // Kill previous tweens
    if (this._promptTween)  { this._promptTween.stop();  this._promptTween  = null; }
    if (this._glowTween)    { this._glowTween.stop();    this._glowTween    = null; }

    // Bob via a plain object so update() can read the offset without fighting the tween
    this._doorBobObj = { v: 0 };
    this._promptTween = this.tweens.add({
      targets:  this._doorBobObj,
      v:        -6,
      duration: 700,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
    // Glow pulses opacity
    this._glowTween = this.tweens.add({
      targets:  this._doorGlow,
      alpha:    0.45,
      duration: 700,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  _hideDoorPrompt() {
    if (this._promptTween) { this._promptTween.stop(); this._promptTween = null; }
    if (this._glowTween)   { this._glowTween.stop();   this._glowTween   = null; }
    this._doorPrompt.setAlpha(0);
    this._doorGlow.setAlpha(0);
    this._doorBobObj = null;
  }

  // ── Update ────────────────────────────────────────────────────────────────
  update() {
   try {
    // Parallax
    this._parallaxCurrent.x = Phaser.Math.Linear(this._parallaxCurrent.x, this._parallaxTarget.x, 0.05);
    this._parallaxCurrent.y = Phaser.Math.Linear(this._parallaxCurrent.y, this._parallaxTarget.y, 0.05);
    this.cameras.main.setFollowOffset(this._parallaxCurrent.x, this._parallaxCurrent.y);

    // Depth sort
    this._sprite.setDepth(this._sprite.y);
    const tagY = this._sprite.y - this._sprite.displayHeight / 2 - 10;
    this._nameTagBg.setPosition(this._sprite.x, tagY).setDepth(this._sprite.y + 1);
    this._nameTag.setPosition(this._sprite.x, tagY).setDepth(this._sprite.y + 2);

    // ── Door proximity ───────────────────────────────────────────────────────
    const pqOverlayOpen = document.getElementById('pq-overlay')?.classList.contains('visible')
                       || !!document.getElementById('dp-overlay');
    if (!pqOverlayOpen) {
      let nearDoor = null;
      for (const door of this._doorZones) {
        if (Math.hypot(this._sprite.x - door.wx, this._sprite.y - door.wy) < door.radius) {
          nearDoor = door;
          break;
        }
      }

      if (nearDoor !== this._nearDoor) {
        this._nearDoor = nearDoor;
        if (nearDoor) this._showDoorPrompt(nearDoor);
        else          this._hideDoorPrompt();
      }

      // Position prompt above player head — includes bob offset from tween
      if (this._nearDoor) {
        const bob = this._doorBobObj ? this._doorBobObj.v : 0;
        const promptY = this._sprite.y - this._sprite.displayHeight / 2 - 30 + bob;
        this._doorPrompt.setPosition(this._sprite.x, promptY);
        this._doorGlow.setPosition(this._sprite.x, promptY);
      }

      // Enter key opens the zone (blocked while casting so it can't crash mid-animation)
      if (this._nearDoor && !this._isCasting && Phaser.Input.Keyboard.JustDown(this._enterKey)) {
        window.dispatchEvent(new CustomEvent('zone:enter', { detail: { id: this._nearDoor.id } }));
      }
    } else {
      // Panel is open — hide prompt and clear near state so it re-triggers on close
      if (this._nearDoor) {
        this._hideDoorPrompt();
        this._nearDoor = null;
      }
    }

    // Freeze player while any full-screen overlay is open
    if (pqOverlayOpen || playerState.get() === 'working') {
      this._sprite.body.setVelocity(0);
      this._sprite.anims.stop();
      this._sprite.setFrame(IDLE_FRAMES[this._lastDir]);
      return;
    }

    const left  = this._cursors.left.isDown  || this._wasd.left.isDown;
    const right = this._cursors.right.isDown || this._wasd.right.isDown;
    const up    = this._cursors.up.isDown    || this._wasd.up.isDown;
    const down  = this._cursors.down.isDown  || this._wasd.down.isDown;

    let vx = 0, vy = 0;
    if (left)  { vx -= SPEED; }
    if (right) { vx += SPEED; }
    if (up)    { vy -= SPEED; }
    if (down)  { vy += SPEED; }
    if ((left || right) && (up || down)) { vx *= 0.707; vy *= 0.707; }

    this._sprite.body.setVelocity(vx, vy);

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      if      (left  && !right) { this._sprite.anims.play('walk-left',  true); this._lastDir = 'left'; }
      else if (right && !left)  { this._sprite.anims.play('walk-right', true); this._lastDir = 'right'; }
      else if (up    && !down)  { this._sprite.anims.play('walk-up',    true); this._lastDir = 'up'; }
      else if (down  && !up)    { this._sprite.anims.play('walk-down',  true); this._lastDir = 'down'; }
    } else {
      this._sprite.anims.stop();
      this._sprite.setFrame(IDLE_FRAMES[this._lastDir]);
    }

    this._updateShadow();
    this._updateFootsteps(moving);
    this._updatePlayerAura();

    // Spell cooldown tick
    if (this._spellCooldown > 0) {
      this._spellCooldown -= this.game.loop.delta;
    }
    if (Phaser.Input.Keyboard.JustDown(this._qKey)) {
      this._castSpell();
    }
    if (Phaser.Input.Keyboard.JustDown(this._eKey)) {
      this._cycleSpell();
    }
   } catch (err) {
     console.error('[WorldScene] update error:', err);
   }
  }

  // ── Gold sparkle burst (Morning Edition decree complete) ──────────────────
  _goldSparkle() {
    const cx = this._sprite.x;
    const cy = this._sprite.y - this._sprite.displayHeight / 3;
    for (let i = 0; i < 10; i++) {
      const angle  = (i / 10) * Math.PI * 2;
      const dist   = 40 + Math.random() * 30;
      const dot    = this.add.circle(cx, cy, 2 + Math.random() * 2, 0xc9a84c).setDepth(9996);
      this.tweens.add({
        targets:  dot,
        x:        cx + Math.cos(angle) * dist,
        y:        cy + Math.sin(angle) * dist,
        alpha:    0,
        duration: 500 + Math.random() * 200,
        ease:     'Power2',
        onComplete: () => { if (dot.active) dot.destroy(); },
      });
    }
  }

  // ── Floating text notification (from Prophet events etc.) ─────────────────
  _floatText(msg, color = '#f0d89a') {
    const t = this.add.text(this._sprite.x, this._sprite.y - 80, msg, {
      fontFamily: '"Cinzel", serif',
      fontSize:   '11px',
      color,
      stroke:     '#1a0f00',
      strokeThickness: 4,
      wordWrap:   { width: 300 },
      align:      'center',
    }).setOrigin(0.5, 1).setDepth(9995);

    this.tweens.add({
      targets:  t,
      y:        t.y - 40,
      alpha:    { from: 1, to: 0 },
      duration: 2500,
      ease:     'Power2',
      onComplete: () => { if (t.active) t.destroy(); },
    });
  }

  // ── Glow textures — radial canvas gradients ─────────────────────────────────
  _createGlowTextures() {
    const make = (key, size, r, g, b) => {
      if (this.textures.exists(key)) return;
      const c   = document.createElement('canvas');
      c.width   = c.height = size;
      const ctx = c.getContext('2d');
      const h   = size / 2;
      const g2  = ctx.createRadialGradient(h, h, 0, h, h, h);
      g2.addColorStop(0,    `rgba(${r},${g},${b},1)`);
      g2.addColorStop(0.35, `rgba(${r},${g},${b},0.55)`);
      g2.addColorStop(0.70, `rgba(${r},${g},${b},0.12)`);
      g2.addColorStop(1,    `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, size, size);
      this.textures.addCanvas(key, c);
    };
    make('glow-white', 64,  255, 255, 255);
    make('glow-gold',  96,  255, 210,  80);
    make('glow-smoke', 48,  180, 150, 100);
  }

  // ── Lamp post golden halo + rising sparkles ──────────────────────────────────
  _createLampGlow() {
    const { x: bx, y: by, w: bw, h: bh } = this._bgLayout;
    const lx = bx + 0.497 * bw;
    const ly = by + 0.535 * bh;

    // Large breathing halo
    const halo = this.add.image(lx, ly, 'glow-gold')
      .setScale(5.0).setAlpha(0.20)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
    this.tweens.add({
      targets: halo,
      alpha: { from: 0.16, to: 0.26 },
      scale: { from: 4.6,  to: 5.4 },
      duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Tight bright core
    this.add.image(lx, ly, 'glow-gold')
      .setScale(1.4).setAlpha(0.40)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(3);

    // Light cone on cobblestones (triangle pointing down)
    const cone = this.add.graphics().setDepth(2);
    cone.fillStyle(0xffdd88, 0.07);
    cone.fillTriangle(lx, ly + 10, lx - bw * 0.07, ly + bh * 0.20, lx + bw * 0.07, ly + bh * 0.20);
    this.tweens.add({
      targets: cone, alpha: { from: 0.5, to: 1.0 },
      duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Rising gold sparkles
    this.add.particles(lx, ly - 18, 'glow-white', {
      lifespan:  { min: 1000, max: 2400 },
      speedY:    { min: -38,  max: -10 },
      speedX:    { min: -14,  max:  14 },
      scale:     { start: 0.18, end: 0 },
      alpha:     { start: 0.75, end: 0 },
      quantity:  1, frequency: 160,
      tint:      [0xffee88, 0xffdd44, 0xfff4bb, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      depth:     4,
    });
  }

  // ── Building window warm glow halos ──────────────────────────────────────────
  _createWindowGlows() {
    const { x: bx, y: by, w: bw, h: bh } = this._bgLayout;

    WINDOW_GLOWS.forEach((w) => {
      const wx  = bx + w.fx * bw;
      const wy  = by + w.fy * bh;
      const img = this.add.image(wx, wy, 'glow-gold')
        .setScale(w.s).setAlpha(w.a).setTint(w.tint)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(2);

      // Flicker tween with randomised timing per window
      this.tweens.add({
        targets:  img,
        alpha:    { from: w.a * 0.72, to: Math.min(w.a * 1.15, 0.35) },
        duration: 700 + Math.random() * 1400,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay:    Math.random() * 1000,
      });
    });
  }

  // ── Ambient fireflies drifting across the whole scene ────────────────────────
  _createFireflies() {
    const { x: bx, y: by, w: bw, h: bh } = this._bgLayout;

    this.add.particles(0, 0, 'glow-white', {
      lifespan:  { min: 4000, max: 8000 },
      speedX:    { min: -14, max:  14 },
      speedY:    { min: -20, max:  -4 },
      scale:     { start: 0.13, end: 0.04 },
      alpha:     { start: 0.70, end: 0 },
      quantity:  1, frequency: 320,
      tint:      [0xaaffaa, 0xeeffaa, 0xffeeaa, 0xaaffdd, 0xccffcc],
      blendMode: Phaser.BlendModes.ADD,
      depth:     6,
      emitZone:  {
        type:   'random',
        source: new Phaser.Geom.Rectangle(bx, by, bw, bh * 0.78),
      },
    });
  }

  // ── Magic sparkles: Potion Lab cauldrons + Curiosities orb ───────────────────
  _createMagicSparkles() {
    const { x: bx, y: by, w: bw, h: bh } = this._bgLayout;

    // Cauldron teal sparks
    this.add.particles(bx + 0.11 * bw, by + 0.29 * bh, 'glow-white', {
      lifespan:  { min: 500,  max: 1100 },
      speedX:    { min: -28,  max:  28 },
      speedY:    { min: -65,  max: -18 },
      scale:     { start: 0.16, end: 0 },
      alpha:     { start: 0.85, end: 0 },
      quantity:  1, frequency: 110,
      tint:      [0x00ffcc, 0x44ffaa, 0x00ccff, 0x88ffdd],
      blendMode: Phaser.BlendModes.ADD,
      depth:     7,
    });

    // Second cauldron (visible in image)
    this.add.particles(bx + 0.155 * bw, by + 0.27 * bh, 'glow-white', {
      lifespan:  { min: 400,  max: 900 },
      speedX:    { min: -20,  max:  20 },
      speedY:    { min: -50,  max: -12 },
      scale:     { start: 0.13, end: 0 },
      alpha:     { start: 0.75, end: 0 },
      quantity:  1, frequency: 150,
      tint:      [0x44eeff, 0x00aaff, 0x22ccdd],
      blendMode: Phaser.BlendModes.ADD,
      depth:     7,
    });

    // Curiosities purple orb
    this.add.particles(bx + 0.092 * bw, by + 0.61 * bh, 'glow-white', {
      lifespan:  { min: 450,  max: 850 },
      speedX:    { min: -22,  max:  22 },
      speedY:    { min: -42,  max: -10 },
      scale:     { start: 0.13, end: 0 },
      alpha:     { start: 0.65, end: 0 },
      quantity:  1, frequency: 190,
      tint:      [0xcc66ff, 0x9944ff, 0xdd88ff, 0xaa44cc],
      blendMode: Phaser.BlendModes.ADD,
      depth:     7,
    });
  }

  // ── Twinkling stars in sky area ───────────────────────────────────────────────
  _createStarParticles() {
    const { x: bx, y: by, w: bw, h: bh } = this._bgLayout;

    this.add.particles(0, 0, 'glow-white', {
      lifespan:  { min: 1800, max: 4200 },
      speedX:    0, speedY: 0,
      scale:     { start: 0.07, end: 0 },
      alpha:     { start: 0.90, end: 0 },
      quantity:  1, frequency: 220,
      tint:      [0xffffff, 0xeeeeff, 0xffeedd, 0xddffff, 0xaaffee],
      blendMode: Phaser.BlendModes.ADD,
      depth:     1,
      emitZone:  {
        type:   'random',
        source: new Phaser.Geom.Rectangle(bx, by, bw, bh * 0.30),
      },
    });
  }

  // ── Mysterious multi-layer rolling fog ───────────────────────────────────────
  _createGroundFog() {
    // Fog removed — world atmosphere handled by candles, particles, and auras.
  }

  // ── Spell casting (SPACE key) ─────────────────────────────────────────────
  _createSpellSystem() {
    this._qKey              = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q, false);
    this._eKey              = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, false);
    this._spellCooldown     = 0;
    this._isCasting         = false;
    this._selectedSpellIdx  = 0;

    // Tell the HUD which spell is active on load
    this._dispatchSpellSelect();
  }

  _cycleSpell() {
    if (this._isCasting) return;
    this._selectedSpellIdx = (this._selectedSpellIdx + 1) % SPELLS.length;
    this._dispatchSpellSelect();
  }

  _dispatchSpellSelect() {
    const spell = SPELLS[this._selectedSpellIdx];
    window.dispatchEvent(new CustomEvent('spell:select', {
      detail: { name: spell.name, color: spell.color, index: this._selectedSpellIdx, total: SPELLS.length },
    }));
  }

  // ── Wand raise → flick → bolt fires in facing direction ──────────────────
  _castSpell() {
    try {
      if (this._spellCooldown > 0 || this._isCasting) return;
      if (document.getElementById('pq-overlay')?.classList.contains('visible')) return;
      if (document.getElementById('dp-overlay')?.classList.contains('visible')) return;
      if (playerState.get() === 'working') return;

      const spell = SPELLS[this._selectedSpellIdx];
      this._spellCooldown = 1600;
      this._isCasting     = true;

      window.dispatchEvent(new CustomEvent('spell:cast', {
        detail: { name: spell.name, color: spell.color },
      }));

      // Angle from player facing direction
      const DIR_ANGLES = { right: 0, down: Math.PI * 0.5, left: Math.PI, up: -Math.PI * 0.5 };
      const angle = DIR_ANGLES[this._lastDir] ?? 0;

      // Wand offset so it appears at the player's hand side
      const WAND_OFFSETS = {
        right: { ox:  8, oy:  2 },
        left:  { ox: -8, oy:  2 },
        up:    { ox:  5, oy: -8 },
        down:  { ox:  5, oy:  5 },
      };
      const off = WAND_OFFSETS[this._lastDir] ?? { ox: 8, oy: 2 };

      const px  = this._sprite.x + off.ox;
      const py  = this._sprite.y - this._sprite.displayHeight * 0.18 + off.oy;

      // Tip position for bolt spawn
      const WAND_LEN = 20;
      const tipX = px + Math.cos(angle) * WAND_LEN;
      const tipY = py + Math.sin(angle) * WAND_LEN;

      // Draw wand
      const wand = this.add.graphics().setPosition(px, py).setDepth(9994);
      wand.lineStyle(2.5, 0xb07830, 1);
      wand.lineBetween(0, 0, WAND_LEN, 0);
      wand.lineStyle(1, 0xf0d080, 0.45);
      wand.lineBetween(1, -0.8, WAND_LEN - 2, -0.8);
      wand.fillStyle(spell.color, 0.65);
      wand.fillCircle(WAND_LEN, 0, 3);
      wand.setRotation(angle);

      // Fire bolt immediately — no nested tween chains
      this._fireSpellBolt(spell, tipX, tipY, angle);

      // Fade wand out
      this.tweens.add({
        targets:  wand,
        alpha:    0,
        delay:    120,
        duration: 260,
        ease:     'Power2',
        onComplete: () => { if (wand.active) wand.destroy(); },
      });

      // Unlock casting after wand fade starts
      this.time.delayedCall(150, () => { this._isCasting = false; });
    } catch (err) {
      console.error('[spell] _castSpell error:', err);
      this._isCasting = false;
    }
  }

  // ── Bolt travels forward, leaves glowing trail, explodes at end ───────────
  _fireSpellBolt(spell, tipX, tipY, angle) {
    try {
      const MAX_DIST = 90;
      const DURATION = 210;

      const endX = tipX + Math.cos(angle) * MAX_DIST;
      const endY = tipY + Math.sin(angle) * MAX_DIST;

      // Image-based bolt
      const bolt = this.add.image(tipX, tipY, 'glow-white')
        .setTint(spell.color)
        .setScale(0.35)
        .setAlpha(0.9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(9993);

      // Bright white core
      const core = this.add.image(tipX, tipY, 'glow-white')
        .setScale(0.12)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(9994);

      // Particle trail
      const trail = this.add.particles(tipX, tipY, 'glow-white', {
        scale:     { start: 0.13, end: 0 },
        alpha:     { start: 0.7,  end: 0 },
        lifespan:  150,
        quantity:  2,
        frequency: 16,
        tint:      spell.color,
        blendMode: Phaser.BlendModes.ADD,
        depth:     9992,
      });

      // Cleanup helper — ensures everything dies no matter what
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (bolt.active)  bolt.destroy();
        if (core.active)  core.destroy();
        if (trail.active) trail.destroy();
      };

      // Hard safety timeout — if tween never completes, still clean up
      this.time.delayedCall(DURATION + 500, cleanup);

      this.tweens.add({
        targets:  bolt,
        x:        endX,
        y:        endY,
        duration: DURATION,
        ease:     'Linear',
        onUpdate: () => {
          if (core.active) core.setPosition(bolt.x, bolt.y);
          if (trail.active) trail.setPosition(bolt.x, bolt.y);
        },
        onComplete: () => {
          const ix = bolt.x;
          const iy = bolt.y;
          cleanup();
          this._spellImpact(spell, ix, iy);
        },
      });
    } catch (err) {
      console.error('[spell] _fireSpellBolt error:', err);
    }
  }

  // ── Impact: rings + particles + spell name ────────────────────────────────
  _spellImpact(spell, ix, iy) {
    try {
      // 2 small expanding rings
      for (let i = 0; i < 2; i++) {
        const ring = this.add.graphics()
          .setPosition(ix, iy)
          .setDepth(9991);
        ring.lineStyle(1.5, spell.color, 0.8 - i * 0.2);
        ring.strokeCircle(0, 0, 4);
        this.tweens.add({
          targets:  ring,
          scaleX:   5 + i * 2,
          scaleY:   5 + i * 2,
          alpha:    0,
          duration: 350 + i * 80,
          ease:     'Power2',
          delay:    i * 55,
          onComplete: () => { if (ring.active) ring.destroy(); },
        });
        // Safety: destroy ring if tween doesn't complete
        this.time.delayedCall(600, () => { if (ring.active) ring.destroy(); });
      }

      // Particle burst
      const burstCount = Math.max(8, Math.floor(spell.count * 0.45));
      const em = this.add.particles(ix, iy, 'glow-white', {
        speed:     { min: 20, max: Math.floor(spell.speed * 0.55) },
        angle:     { min: 0, max: 360 },
        scale:     { start: 0.16, end: 0 },
        alpha:     { start: 1, end: 0 },
        lifespan:  { min: 280, max: 550 },
        tint:      spell.color,
        blendMode: Phaser.BlendModes.ADD,
        depth:     9993,
        emitting:  false,
      });
      em.explode(burstCount, ix, iy);
      this.time.delayedCall(700, () => { if (em.active) em.destroy(); });

      // Spell name floats up at impact
      const hex = '#' + spell.color.toString(16).padStart(6, '0');
      const txt = this.add.text(ix, iy - 6, spell.name.toUpperCase(), {
        fontFamily:      '"Cinzel", serif',
        fontSize:        '11px',
        color:           hex,
        stroke:          '#05030f',
        strokeThickness: 3,
        shadow:          { color: hex, blur: 8, fill: true },
      }).setOrigin(0.5, 1).setDepth(9995);

      this.tweens.add({
        targets:  txt,
        y:        iy - 48,
        alpha:    { from: 1, to: 0 },
        scale:    { from: 1.0, to: 0.75 },
        duration: 1100,
        ease:     'Power3',
        onComplete: () => { if (txt.active) txt.destroy(); },
      });
      // Safety for text
      this.time.delayedCall(1300, () => { if (txt.active) txt.destroy(); });

      if (spell.count >= 55) this.cameras.main.shake(120, 0.003);
    } catch (err) {
      console.error('[spell] _spellImpact error:', err);
    }
  }


  // ── Player house aura ─────────────────────────────────────────────────────
  _createPlayerAura() {
    const HOUSE_COLORS = {
      gryffindor: 0xff3300,
      slytherin:  0x00cc44,
      ravenclaw:  0x2255ee,
      hufflepuff: 0xffcc00,
    };
    const house = localStorage.getItem('hp-house') || 'gryffindor';
    const color = HOUSE_COLORS[house] ?? 0xcc8800;

    this._playerAura = this.add.image(0, 0, 'glow-white')
      .setScale(3.6).setAlpha(0.13)
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this._sprite.depth - 0.5);

    this.tweens.add({
      targets:  this._playerAura,
      alpha:    { from: 0.09, to: 0.19 },
      scale:    { from: 3.3, to: 3.9 },
      duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Re-tint if the player picks a house after loading
    window.addEventListener('house:selected', (e) => {
      const c = HOUSE_COLORS[e.detail.house] ?? 0xcc8800;
      this._playerAura?.setTint(c);
    });
  }

  _updatePlayerAura() {
    if (!this._playerAura || !this._sprite) return;
    this._playerAura
      .setPosition(this._sprite.x, this._sprite.y + 6)
      .setDepth(this._sprite.depth - 0.5);
  }

  // ── Cobblestone fog motes — react to player proximity ────────────────────
  // ── Soft shadow ellipse under the player ─────────────────────────────────────
  _createPlayerShadow() {
    this._shadow = this.add.ellipse(0, 0, 46, 14, 0x000000, 0.42);
  }

  _updateShadow() {
    if (!this._shadow) return;
    this._shadow
      .setPosition(this._sprite.x, this._sprite.y + this._sprite.displayHeight * 0.37)
      .setDepth(this._sprite.depth - 0.5);
  }

  // ── Footstep dust puffs ───────────────────────────────────────────────────────
  _createFootstepEmitter() {
    this._footEmitter   = this.add.particles(0, 0, 'glow-smoke', {
      lifespan:  380,
      speedX:    { min: -16, max: 16 },
      speedY:    { min: -22, max:  4 },
      scale:     { start: 0.14, end: 0.04 },
      alpha:     { start: 0.38, end: 0 },
      tint:      0x997755,
      frequency: -1,   // manual fire only
      depth:     1,
    });
    this._lastFootstep  = 0;
  }

  _updateFootsteps(moving) {
    if (!moving || !this._footEmitter) return;
    const now = this.time.now;
    if (now - this._lastFootstep < 130) return;
    this._lastFootstep = now;
    const fx = this._sprite.x + (Math.random() - 0.5) * 10;
    const fy = this._sprite.y + this._sprite.displayHeight * 0.40;
    this._footEmitter.setDepth(this._sprite.depth - 0.5);
    this._footEmitter.emitParticleAt(fx, fy, 3);
  }

  // ── Pulsing aura rings at zone entrances ─────────────────────────────────────
  _createZoneAuras() {
    const { x: bx, y: by, w: bw, h: bh } = this._bgLayout;

    ZONES.forEach((zone, i) => {
      // Place ring near the door (lower-centre of zone)
      const cx    = bx + (zone.x + zone.w * 0.5) * bw;
      const cy    = by + (zone.y + zone.h * 0.72) * bh;
      const baseR = Math.min(zone.w * bw, zone.h * bh) * 0.10;

      for (let ring = 0; ring < 2; ring++) {
        const gfx = this.add.graphics()
          .lineStyle(1.5, 0xc9a84c, 0.6)
          .strokeCircle(0, 0, baseR)
          .setPosition(cx, cy)
          .setDepth(3)
          .setAlpha(0);

        this.tweens.add({
          targets:  gfx,
          scaleX:   2.4, scaleY: 2.4,
          alpha:    { from: 0.55, to: 0 },
          duration: 2400,
          repeat:   -1, ease: 'Sine.Out',
          delay:    ring * 1200 + i * 180,
        });
      }

      // Tiny gold sparkle cluster at each door
      this.add.particles(cx, cy, 'glow-white', {
        lifespan:  { min: 600, max: 1200 },
        speedX:    { min: -18, max: 18 },
        speedY:    { min: -30, max: -8 },
        scale:     { start: 0.10, end: 0 },
        alpha:     { start: 0.55, end: 0 },
        quantity:  1, frequency: 380,
        tint:      [0xffee88, 0xffe044, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        depth:     3,
      });
    });
  }

  shutdown() {
    this._unsubState?.();
    this._tooltipEl?.remove();
    this._vignetteEl?.remove();
  }
}
