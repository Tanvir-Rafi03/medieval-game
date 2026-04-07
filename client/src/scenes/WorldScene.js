// client/src/scenes/WorldScene.js
// Main game scene. Displays the isometric world, handles player movement (WASD),
// and manages interactive building zones with hover tooltips and click panels.

import { ZONES } from '../zones.js';

const SPEED = 180; // pixels per second

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
    this._zoneObjects = [];
    this._tooltip = null;
    this._activeZone = null;
  }

  create() {
    const { width, height } = this.scale;

    // --- World background ---
    const bg = this.add.image(0, 0, 'world').setOrigin(0, 0);
    const scale = Math.max(width / bg.width, height / bg.height);
    const bgW = bg.width * scale;
    const bgH = bg.height * scale;
    const bgX = (width - bgW) / 2;
    const bgY = (height - bgH) / 2;
    bg.setScale(scale).setPosition(bgX, bgY);

    // Store layout so zones can reference it
    this._bgLayout = { x: bgX, y: bgY, w: bgW, h: bgH, scale };

    // --- Player ---
    this._player = this._createPlayer();
    // Start near the fountain (center of world)
    this._player.setPosition(width / 2, height * 0.52);

    // --- Physics body on player container ---
    this.physics.add.existing(this._player);
    this._player.body.setSize(28, 28);
    this._player.body.setCollideWorldBounds(true);

    // --- Input ---
    this._cursors = this.input.keyboard.createCursorKeys();
    this._wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // --- Camera ---
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this._player, true, 0.08, 0.08);

    // --- Interactive zones ---
    this._createZones();

    // --- Tooltip (DOM overlay) ---
    this._tooltipEl = document.createElement('div');
    this._tooltipEl.id = 'zone-tooltip';
    Object.assign(this._tooltipEl.style, {
      position: 'fixed',
      padding: '8px 14px',
      background: 'rgba(26,26,46,0.92)',
      border: '1px solid #c9a84c',
      color: '#c9a84c',
      fontFamily: '"Cinzel", serif',
      fontSize: '14px',
      borderRadius: '4px',
      pointerEvents: 'none',
      display: 'none',
      zIndex: '20',
      whiteSpace: 'nowrap',
    });
    document.getElementById('ui-layer').appendChild(this._tooltipEl);

    // --- Depth sort: player always above background, below UI ---
    bg.setDepth(0);
    this._player.setDepth(10);
  }

  // -----------------------------------------------------------------------
  // Player — Graphics-based placeholder. Phase 3 will swap in the spritesheet.
  // -----------------------------------------------------------------------
  _createPlayer() {
    const container = this.add.container(0, 0);

    // Shadow
    const shadow = this.add.ellipse(0, 14, 24, 8, 0x000000, 0.35);

    // Cape / body
    const body = this.add.graphics();
    body.fillStyle(0x2a4a8a, 1);      // navy cape
    body.fillEllipse(0, 2, 22, 28);

    // Armor torso
    const torso = this.add.graphics();
    torso.fillStyle(0x8b6914, 1);     // leather brown
    torso.fillRect(-8, -6, 16, 14);
    torso.fillStyle(0xc9a84c, 1);     // gold trim
    torso.fillRect(-8, -6, 16, 2);

    // Head
    const head = this.add.ellipse(0, -16, 18, 18, 0xd4a574, 1);

    // Hair
    const hair = this.add.graphics();
    hair.fillStyle(0x8b4513, 1);
    hair.fillEllipse(0, -20, 18, 10);

    container.add([shadow, body, torso, head, hair]);
    return container;
  }

  // -----------------------------------------------------------------------
  // Interactive zones — invisible rectangles over each building/location
  // -----------------------------------------------------------------------
  _createZones() {
    const { x: bx, y: by, w: bw, h: bh } = this._bgLayout;
    const { width, height } = this.scale;

    // Each zone is defined as fractions of the background image dimensions
    ZONES.forEach((zone) => {
      const rx = bx + zone.x * bw;
      const ry = by + zone.y * bh;
      const rw = zone.w * bw;
      const rh = zone.h * bh;

      // Invisible rectangle — interactive
      const rect = this.add
        .rectangle(rx + rw / 2, ry + rh / 2, rw, rh, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);

      // Debug: show zone outline (comment out when done)
      // this.add.rectangle(rx + rw/2, ry + rh/2, rw, rh).setStrokeStyle(2, 0xc9a84c, 0.5).setDepth(5);

      rect.on('pointerover', (pointer) => {
        this._showTooltip(pointer.x, pointer.y, zone.name);
        this._highlightZone(rect, true);
      });

      rect.on('pointermove', (pointer) => {
        this._moveTooltip(pointer.x, pointer.y);
      });

      rect.on('pointerout', () => {
        this._hideTooltip();
        this._highlightZone(rect, false);
      });

      rect.on('pointerdown', () => {
        this._openZonePanel(zone);
      });

      this._zoneObjects.push({ rect, zone });
    });
  }

  _highlightZone(rect, on) {
    if (on) {
      rect.setFillStyle(0xc9a84c, 0.12).setStrokeStyle(2, 0xc9a84c, 0.7);
    } else {
      rect.setFillStyle(0xffffff, 0).setStrokeStyle(0);
    }
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
    // Dispatch a custom DOM event — the UI layer (index.html) listens for this
    // and renders the appropriate panel. Keeps game logic and UI decoupled.
    window.dispatchEvent(new CustomEvent('zone:open', { detail: zone }));
  }

  // -----------------------------------------------------------------------
  // Update loop — WASD / arrow movement with light isometric skew
  // -----------------------------------------------------------------------
  update() {
    const body = this._player.body;
    body.setVelocity(0);

    const left  = this._cursors.left.isDown  || this._wasd.left.isDown;
    const right = this._cursors.right.isDown || this._wasd.right.isDown;
    const up    = this._cursors.up.isDown    || this._wasd.up.isDown;
    const down  = this._cursors.down.isDown  || this._wasd.down.isDown;

    let vx = 0, vy = 0;

    // Isometric movement: horizontal keys carry a small vertical component
    // so movement feels aligned with the world's perspective angle.
    if (left)  { vx -= SPEED;       vy += SPEED * 0.25; }
    if (right) { vx += SPEED;       vy -= SPEED * 0.25; }
    if (up)    { vx += SPEED * 0.5; vy -= SPEED; }
    if (down)  { vx -= SPEED * 0.5; vy += SPEED; }

    // Normalize diagonal
    if ((left || right) && (up || down)) {
      vx *= 0.707;
      vy *= 0.707;
    }

    body.setVelocity(vx, vy);

    // Flip the container to face left/right
    if (vx < 0) this._player.setScale(-1, 1);
    else if (vx > 0) this._player.setScale(1, 1);
  }

  shutdown() {
    this._tooltipEl?.remove();
  }
}
