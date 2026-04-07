// client/src/scenes/PreloadScene.js
// Loads all game assets before WorldScene starts.
// Shows a loading bar so the player knows assets are being fetched.
//
// Spritesheet layout assumption (player-sheet.jpg, 1024x1024):
//   3 columns × 4 rows → frameWidth = 341, frameHeight = 256
//   Row 0: walk-down  (frames 0–2)
//   Row 1: walk-left  (frames 3–5)
//   Row 2: walk-right (frames 6–8)
//   Row 3: walk-up    (frames 9–11)

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

    // 1024×1024 sheet, 3 cols × 4 rows
    this.load.spritesheet('player', 'assets/sprites/player-sheet.jpg', {
      frameWidth: 341,
      frameHeight: 256,
    });
  }

  create() {
    // Define animations once here so they're available globally to all scenes
    const anims = this.anims;

    const rows = [
      { key: 'walk-down',  start: 0  },
      { key: 'walk-left',  start: 3  },
      { key: 'walk-right', start: 6  },
      { key: 'walk-up',    start: 9  },
    ];

    rows.forEach(({ key, start }) => {
      anims.create({
        key,
        frames: anims.generateFrameNumbers('player', { start, end: start + 2 }),
        frameRate: 8,
        repeat: -1,
      });
    });

    this.scene.start('WorldScene');
  }
}
