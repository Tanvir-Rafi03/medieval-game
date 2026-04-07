// client/src/scenes/PreloadScene.js
// Loads all game assets before WorldScene starts.
// Shows a loading bar so the player knows assets are being fetched.

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    const { width, height } = this.scale;

    // Loading bar background
    const barBg = this.add.rectangle(width / 2, height / 2, 400, 20, 0x3a3a5c);
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 0, 16, 0xc9a84c).setOrigin(0, 0.5);

    this.add.text(width / 2, height / 2 - 40, 'Loading world...', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#c9a84c',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.width = 400 * value;
    });

    // World background image — user must place this file
    this.load.image('world', 'assets/world.jpg');

    // Player spritesheet — 3 cols x 4 rows, each frame ~341x256
    this.load.spritesheet('player', 'assets/sprites/player-sheet.jpg', {
      frameWidth: 341,
      frameHeight: 256,
    });
  }

  create() {
    this.scene.start('WorldScene');
  }
}
