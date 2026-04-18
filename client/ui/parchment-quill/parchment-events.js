// parchment-events.js
// Simple event dispatchers — fire browser CustomEvents so Phaser listeners
// (and any other code) can react without coupling to the UI module tree.

export function dispatchSessionStarted() {
  window.dispatchEvent(new CustomEvent('parchmentSessionStarted'));
}

export function dispatchRoundComplete() {
  window.dispatchEvent(new CustomEvent('parchmentRoundComplete'));
}

export function dispatchSessionEnded() {
  window.dispatchEvent(new CustomEvent('parchmentSessionEnded'));
}

export function dispatchAchievementUnlocked(ach) {
  window.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: ach }));
}
