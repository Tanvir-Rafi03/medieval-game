// parchment-panel.js
// Main entry point for the Parchment & Quill study system.
// Injected by client/main.js after initZonePanel().

import './parchment-panel.css';
import { initLobby }                from './parchment-lobby.js';
import { initSession, destroySession } from './parchment-session.js';
import { initStudyLog }             from './parchment-study-log.js';
import { renderAchievementsPanel }  from './parchment-achievements.js';

export function initParchmentPanel() {

  // ── Build overlay DOM ─────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'pq-overlay';
  overlay.innerHTML = `
    <div class="pq-container">

      <!-- LOBBY SCREEN -->
      <div id="pq-lobby-screen" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
        <div class="pq-header">
          <div class="pq-title"><span class="pq-quill">✒️</span> Parchment &amp; Quill</div>
          <div class="pq-subtitle">Study alone or join a session in progress</div>
          <button class="pq-close" id="pq-close-lobby">✕</button>
        </div>
        <div class="pq-lobby-body" id="pq-lobby-body"></div>
      </div>

      <!-- SESSION SCREEN -->
      <div id="pq-session-screen"
           style="display:none;flex:1;flex-direction:column;overflow:hidden;position:relative;">
        <div class="pq-header">
          <div class="pq-title"><span class="pq-quill">✒️</span> <span id="pq-sess-name"></span></div>
          <div class="pq-subtitle" id="pq-sess-meta"></div>
          <button class="pq-close" id="pq-close-session">✕</button>
        </div>
        <div class="pq-toast" id="pq-ach-toast"></div>
        <div class="pq-session-body" style="flex:1;overflow:hidden;">
          <div class="pq-panel" id="pq-log-panel"></div>
          <div class="pq-panel" id="pq-timer-panel"></div>
          <div class="pq-panel" id="pq-ach-panel"></div>
        </div>
      </div>

    </div>
  `;

  document.getElementById('ui-layer').appendChild(overlay);

  // ── Achievement toast listener ────────────────────────────────────────
  window.addEventListener('achievementUnlocked', (e) => {
    const toast = document.getElementById('pq-ach-toast');
    if (!toast) return;
    const ach = e.detail;
    toast.innerHTML = `
      <span style="font-size:22px">${ach.emoji}</span>
      Achievement unlocked: ${ach.name}
      <span style="font-weight:400;font-size:11px;opacity:.8;margin-left:8px">+${ach.xp} XP${ach.gold ? ` · +${ach.gold} Gold` : ''}</span>
    `;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
  });

  // ── Open lobby ────────────────────────────────────────────────────────
  function openLobby() {
    overlay.classList.add('visible');

    const lobbyScreen = document.getElementById('pq-lobby-screen');
    lobbyScreen.style.display        = 'flex';
    lobbyScreen.style.flexDirection  = 'column';
    lobbyScreen.style.flex           = '1';
    lobbyScreen.style.overflow       = 'hidden';

    document.getElementById('pq-session-screen').style.display = 'none';

    initLobby(
      document.getElementById('pq-lobby-body'),
      (session) => enterSession(session, false),
      (session) => enterSession(session, true),
    );
  }

  // ── Enter session room ────────────────────────────────────────────────
  function enterSession(session, isMaster) {
    document.getElementById('pq-lobby-screen').style.display = 'none';

    const ss = document.getElementById('pq-session-screen');
    ss.style.display       = 'flex';
    ss.style.flexDirection = 'column';
    ss.style.flex          = '1';
    ss.style.overflow      = 'hidden';

    document.getElementById('pq-sess-name').textContent = session.name;
    document.getElementById('pq-sess-meta').textContent =
      `${session.focusDuration}min focus · ${session.breakDuration}min break · ${session.totalRounds} rounds`;

    const playerName = (() => {
      try { return JSON.parse(localStorage.getItem('hp_player_stats') || '{}').name || 'Scholar'; }
      catch { return 'Scholar'; }
    })();

    initSession(
      document.getElementById('pq-timer-panel'),
      session,
      isMaster,
      playerName,
      () => openLobby(),   // onLeave
    );

    initStudyLog(
      document.getElementById('pq-log-panel'),
      session.id,
    );

    renderAchievementsPanel(
      document.getElementById('pq-ach-panel'),
    );
  }

  // ── Close panel ───────────────────────────────────────────────────────
  function closePanel() {
    overlay.classList.remove('visible');
    destroySession();
  }

  // ── Event listeners ───────────────────────────────────────────────────
  document.getElementById('pq-close-lobby').addEventListener('click', closePanel);
  document.getElementById('pq-close-session').addEventListener('click', closePanel);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePanel();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('visible')) closePanel();
  });

  // Open when player enters (via door proximity + Enter, or ZonePanel Enter button)
  window.addEventListener('zone:enter', (e) => {
    if (e.detail?.id === 'parchment-quill') openLobby();
  });
}
