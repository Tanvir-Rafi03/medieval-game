// client/src/scenes/PreloadScene.js

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

    this.load.on('progress', v => { bar.width = 400 * v; });

    this.load.image('world', 'assets/world.png');
    this.load.image('fog',   'assets/fog.jpg');

    this.load.spritesheet('player', 'assets/sprites/player-sheet.png', {
      frameWidth:  512,
      frameHeight: 512,
    });
  }

  create() {
    const rows = [
      { key: 'walk-down',  start: 0  },
      { key: 'walk-left',  start: 4  },
      { key: 'walk-right', start: 8  },
      { key: 'walk-up',    start: 12 },
    ];

    rows.forEach(({ key, start }) => {
      this.anims.create({
        key,
        frames:    this.anims.generateFrameNumbers('player', { start, end: start + 3 }),
        frameRate: 8,
        repeat:    -1,
      });
    });

    this.scene.start('WorldScene');
  }
}
