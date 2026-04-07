// client/src/scenes/PreloadScene.js
// Loads all game assets before WorldScene starts.
// Shows a loading bar so the player knows assets are being fetched.
//
// Spritesheet layout (player-sheet.jpg, 2816×1536):
//   6 columns × 4 rows, 4px margin around sheet, 0px spacing between frames
//   → frameWidth = 468, frameHeight = 382
//   Row 0: walk-down  (frames 0–5)
//   Row 1: walk-left  (frames 6–11)
//   Row 2: walk-right (frames 12–17)
//   Row 3: walk-up    (frames 18–23)

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, 400, 20, 0x3a3a5c);
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 0, 16, 0xc9a84c).setOrigin(0, 0.5);

    this.add.text(width / 2, height / 2 - 40, 'Loading world...', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#c9a84c',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.width = 400 * value;
    });

    this.load.image('world', 'assets/world.jpg');

    // 2816×1536 sheet, 6 cols × 4 rows, 4px outer margin, no inter-frame spacing
    this.load.spritesheet('player', 'assets/sprites/player-sheet.jpg', {
      frameWidth:  468,
      frameHeight: 382,
      margin:      4,
      spacing:     0,
    });
  }

  create() {
    // Define animations once here so they're available globally to all scenes
    const anims = this.anims;

    const rows = [
      { key: 'walk-down',  start: 0  },
      { key: 'walk-left',  start: 6  },
      { key: 'walk-right', start: 12 },
      { key: 'walk-up',    start: 18 },
    ];

    rows.forEach(({ key, start }) => {
      anims.create({
        key,
        frames: anims.generateFrameNumbers('player', { start, end: start + 5 }),
        frameRate: 8,
        repeat: -1,
      });
    });

    this.scene.start('WorldScene');
  }
}
