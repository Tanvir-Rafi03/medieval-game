// client/main.js
// Phaser game entry point. Registers all scenes and bootstraps the UI layer.

import Phaser from 'phaser';
import BootScene from './src/scenes/BootScene.js';
import PreloadScene from './src/scenes/PreloadScene.js';
import WorldScene from './src/scenes/WorldScene.js';
import { initZonePanel } from './src/ui/ZonePanel.js';
import { RipplePipeline } from './src/fx/RipplePipeline.js';
import './src/playerState.js'; // attaches window.playerState for console testing

// Initialize HTML overlay panels (they listen for events from Phaser scenes)
initZonePanel();

const config = {
  type: Phaser.WEBGL, // shader requires WebGL — falls back gracefully if unavailable
  pipeline: { RipplePipeline }, // register globally so any scene can use it
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    WorldScene,
  ],
};

const game = new Phaser.Game(config);

export default game;
