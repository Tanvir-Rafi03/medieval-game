// client/src/scenes/BootScene.js
// Very first scene. Waits for web fonts to load, then transitions to PreloadScene.

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    const { width, height } = this.scale;

    const text = this.add
      .text(width / 2, height / 2, 'World loading...', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#c9a84c',
      })
      .setOrigin(0.5);

    // Wait for Google Fonts, then kick off asset preloading
    document.fonts.ready.then(() => {
      text.setStyle({ fontFamily: '"Cinzel", serif' });
      this.time.delayedCall(400, () => {
        this.scene.start('PreloadScene');
      });
    });
  }
}
