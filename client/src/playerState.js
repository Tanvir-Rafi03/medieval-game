// client/src/playerState.js
// Global player state. Import this anywhere to read or change state.
// Other modules (Pomodoro timer, ZonePanel, etc.) set state here
// and WorldScene reacts to it each frame.
//
// Usage (browser console to test):
//   window.playerState.set('working')   → locks movement, starts bobbing
//   window.playerState.set('free')      → unlocks movement
//   window.playerState.get()            → returns current state string

const _state = { current: 'free' };
const _listeners = [];

export const playerState = {
  get() {
    return _state.current;
  },
  set(newState) {
    if (!['free', 'working', 'on-break'].includes(newState)) {
      console.warn(`[playerState] Unknown state: ${newState}`);
      return;
    }
    const prev = _state.current;
    _state.current = newState;
    _listeners.forEach((fn) => fn(newState, prev));
    console.log(`[playerState] ${prev} → ${newState}`);
  },
  onChange(fn) {
    _listeners.push(fn);
    return () => {
      const i = _listeners.indexOf(fn);
      if (i !== -1) _listeners.splice(i, 1);
    };
  },
};

// Expose to browser console for easy testing
window.playerState = playerState;
