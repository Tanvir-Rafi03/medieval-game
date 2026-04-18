// parchment-session.js
// Core timer engine for the Parchment & Quill study session room.

import { addLogEntry, getStudySubject } from './parchment-study-log.js';
import { checkAchievements }            from './parchment-achievements.js';
import {
  dispatchSessionStarted,
  dispatchRoundComplete,
  dispatchSessionEnded,
} from './parchment-events.js';

const KEY_SESSIONS        = 'hp_parchment_sessions';
const KEY_CURRENT_SESSION = 'hp_parchment_current_session';
const KEY_STATS           = 'hp_player_stats';

const CIRCUMFERENCE = 2 * Math.PI * 52; // ≈ 326.73

let _tickInterval  = null;
let _timerPanel    = null;
let _session       = null;
let _isMaster      = false;
let _playerName    = '';
let _onLeave       = null;
let _consecutiveCt = 0;

// ── Public API ────────────────────────────────────────────────────────────

export function initSession(container, sessionData, isMaster, playerName, onLeave) {
  destroySession();

  _timerPanel  = container;
  _session     = loadSession(sessionData.id) || sessionData;
  _isMaster    = isMaster;
  _playerName  = playerName;
  _onLeave     = onLeave;

  renderTimerPanel();
  _tickInterval = setInterval(tick, 500);
}

export function destroySession() {
  if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
  _timerPanel = null;
  _session    = null;
}

// ── Tick ──────────────────────────────────────────────────────────────────

function tick() {
  _session = loadSession(_session?.id);
  if (!_session) return;

  const remaining = getRemainingMs(_session);
  updateRingAndCountdown(remaining);
  updateMemberCards();

  if (remaining <= 0 && (_session.phase === 'focus' || _session.phase === 'break')) {
    handlePhaseEnd();
  }
}

function handlePhaseEnd() {
  if (_session.phase === 'focus') {
    onRoundComplete();
    _session.phase         = 'break';
    _session.phaseStartTime = Date.now();
    saveSession(_session);
  } else if (_session.phase === 'break') {
    if (_session.currentRound < _session.totalRounds) {
      _session.currentRound++;
      _session.phase         = 'focus';
      _session.phaseStartTime = Date.now();
      saveSession(_session);
    } else {
      _session.phase = 'ended';
      saveSession(_session);
      onSessionEnd();
    }
  }

  renderTimerPanel();
}

// ── Phase completion callbacks ────────────────────────────────────────────

function onRoundComplete() {
  if (!_session) return;

  const durationMin = _session.focusDuration;
  const subject     = getStudySubject();
  addLogEntry(_session.currentRound, subject || 'Focus round', durationMin);

  // Update stats
  const stats = loadPlayerStats();
  stats.total_rounds   = (stats.total_rounds || 0) + 1;
  if (_session.members && _session.members.length > 1) {
    stats.group_rounds = (stats.group_rounds || 0) + 1;
  }
  _consecutiveCt++;
  stats.consecutive_rounds = Math.max(stats.consecutive_rounds || 0, _consecutiveCt);
  stats.max_focus_minutes  = Math.max(stats.max_focus_minutes  || 0, durationMin);

  const hour = new Date().getHours();
  if (hour >= 23 || hour < 4) stats.night_rounds = (stats.night_rounds || 0) + 1;

  savePlayerStats(stats);

  checkAchievements({
    isMaster: _isMaster,
    memberCount: (_session.members || []).length,
    focusDuration: durationMin,
    currentHour: hour,
  });

  dispatchRoundComplete();
}

function onSessionEnd() {
  if (!_session) return;
  const stats = loadPlayerStats();
  const today = new Date().toISOString().slice(0, 10);

  if (_isMaster) {
    stats.sessions_as_master = (stats.sessions_as_master || 0) + 1;
  }
  if (_session.members && _session.members.length > 1) {
    stats.group_sessions = (stats.group_sessions || 0) + 1;
  }
  stats.daily_sessions = stats.daily_sessions || {};
  stats.daily_sessions[today] = (stats.daily_sessions[today] || 0) + 1;

  savePlayerStats(stats);

  checkAchievements({
    isMaster: _isMaster,
    memberCount: (_session.members || []).length,
  });

  dispatchSessionEnded();

  if (_timerPanel) {
    const msg = _timerPanel.querySelector('.pq-waiting-msg');
    if (msg) msg.textContent = '✨ Session complete! Well done, Scholar.';
  }
}

// ── Timer math ────────────────────────────────────────────────────────────

function getRemainingMs(session) {
  if (!session) return 0;
  if (session.phase === 'waiting' || session.phase === 'ended') {
    const dur = session.phase === 'waiting'
      ? session.focusDuration * 60000
      : 0;
    return dur;
  }
  if (session.paused) return session.pausedRemaining || 0;

  const duration = session.phase === 'focus'
    ? session.focusDuration * 60000
    : session.breakDuration * 60000;
  const elapsed = Date.now() - session.phaseStartTime;
  return Math.max(0, duration - elapsed);
}

function getTotalMs(session) {
  if (!session) return 1;
  if (session.phase === 'break') return session.breakDuration * 60000;
  return session.focusDuration * 60000;
}

// ── DOM rendering ─────────────────────────────────────────────────────────

function renderTimerPanel() {
  if (!_timerPanel || !_session) return;

  const s = _session;
  const phaseLabel = s.phase === 'focus'    ? 'FOCUS'
                   : s.phase === 'break'    ? 'BREAK'
                   : s.phase === 'waiting'  ? 'WAITING TO START'
                   : 'SESSION COMPLETE';

  const masterControls = _isMaster ? buildMasterControls(s) : '';

  _timerPanel.innerHTML = `
    <div class="pq-panel-title">
      Round ${s.currentRound} of ${s.totalRounds}
    </div>
    <div class="pq-timer-center">
      <div class="pq-ring-wrap">
        <svg viewBox="0 0 120 120" class="pq-ring" width="180" height="180">
          <circle class="pq-ring-bg" cx="60" cy="60" r="52"/>
          <circle class="pq-ring-progress" id="pq-ring-prog" cx="60" cy="60" r="52"
                  stroke-dasharray="${CIRCUMFERENCE.toFixed(2)}"
                  stroke-dashoffset="${CIRCUMFERENCE.toFixed(2)}"/>
        </svg>
        <div class="pq-ring-inner">
          <div class="pq-countdown" id="pq-countdown">--:--</div>
          <div class="pq-phase-label">${phaseLabel}</div>
          <div class="pq-streak" id="pq-streak">${_consecutiveCt > 0 ? '🔥 ' + _consecutiveCt : ''}</div>
        </div>
      </div>

      <div class="pq-controls" id="pq-controls">
        ${masterControls}
        <button class="pq-ctrl-btn danger" id="pq-leave-btn">Leave Session</button>
      </div>
      ${s.phase === 'waiting' && !_isMaster
        ? `<div class="pq-waiting-msg">Waiting for the master to start…</div>`
        : ''}
      ${s.phase === 'ended'
        ? `<div class="pq-waiting-msg">✨ Session complete! Well done, Scholar.</div>`
        : ''}
    </div>

    <div class="pq-members-row" id="pq-members-row">
      ${buildMemberCards(s)}
    </div>
  `;

  // Wire controls — scoped to _timerPanel so IDs never collide
  const $ = (id) => _timerPanel.querySelector(`#${id}`);
  $('pq-leave-btn')?.addEventListener('click', leaveSession);

  if (_isMaster) {
    $('pq-start-btn')?.addEventListener('click',     masterStart);
    $('pq-pause-btn')?.addEventListener('click',     masterPause);
    $('pq-resume-btn')?.addEventListener('click',    masterResume);
    $('pq-skipbreak-btn')?.addEventListener('click', masterSkipBreak);
  }

  wireMemberCards();
  updateRingAndCountdown(getRemainingMs(s));
}

function buildMasterControls(s) {
  if (s.phase === 'waiting') {
    return `<button class="pq-ctrl-btn primary" id="pq-start-btn">Start Session</button>`;
  }
  if (s.phase === 'ended') return '';

  let html = '';
  if (!s.paused) {
    html += `<button class="pq-ctrl-btn secondary" id="pq-pause-btn">Pause</button>`;
  } else {
    html += `<button class="pq-ctrl-btn primary" id="pq-resume-btn">Resume</button>`;
  }
  if (s.phase === 'break') {
    html += `<button class="pq-ctrl-btn secondary" id="pq-skipbreak-btn">Skip Break</button>`;
  }
  return html;
}

function buildMemberCards(s) {
  const members = s.members || [];
  return members.map((m) => {
    const initials = (m.name || '?').slice(0, 2).toUpperCase();
    const isMasterCard = m.name === s.masterName;
    return `
      <div class="pq-member-card" data-member="${escHtml(m.name)}">
        ${isMasterCard ? `<div class="pq-crown">👑</div>` : ''}
        <div class="pq-status-dot ${m.status || 'active'}"></div>
        <div class="pq-member-avatar">${initials}</div>
        <div class="pq-member-name">${escHtml(m.name)}</div>
        <div class="pq-member-subject" data-editable="${m.name === _playerName}"
          ${m.name === _playerName ? 'contenteditable="true"' : ''}>
          ${escHtml(m.subject || 'studying…')}
        </div>
        ${m.name !== _playerName
          ? `<button class="pq-spark-btn" data-member="${escHtml(m.name)}">⚡ Spark</button>`
          : ''}
        <div class="pq-quill-count" id="pq-sparks-${escHtml(m.name)}"></div>
      </div>
    `;
  }).join('');
}

function wireMemberCards() {
  // Editable subject
  const subjectEl = _timerPanel?.querySelector('.pq-member-subject[contenteditable="true"]');
  if (subjectEl) {
    subjectEl.addEventListener('blur', () => {
      updateMemberSubject(subjectEl.textContent.trim());
    });
    subjectEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); subjectEl.blur(); }
    });
  }

  // Spark buttons
  _timerPanel?.querySelectorAll('.pq-spark-btn').forEach((btn) => {
    btn.addEventListener('click', () => sendSpark(btn.dataset.member));
  });
}

function updateMemberCards() {
  const row = document.getElementById('pq-members-row');
  if (!row || !_session) return;
  row.innerHTML = buildMemberCards(_session);
  wireMemberCards();
}

function updateRingAndCountdown(remainingMs) {
  const countdown = document.getElementById('pq-countdown');
  const ring      = document.getElementById('pq-ring-prog');
  if (!countdown || !ring || !_session) return;

  const totalMs = getTotalMs(_session);
  const ratio   = totalMs > 0 ? remainingMs / totalMs : 0;
  const offset  = CIRCUMFERENCE * (1 - ratio);

  ring.style.strokeDashoffset = offset.toFixed(2);
  // Colour: green for focus, slate for break
  ring.style.stroke = _session.phase === 'break' ? '#94a3b8' : '#1a472a';

  const totalSec   = Math.ceil(remainingMs / 1000);
  const mins       = Math.floor(totalSec / 60);
  const secs       = totalSec % 60;
  countdown.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ── Master controls ────────────────────────────────────────────────────────

function masterStart() {
  if (!_session || _session.phase !== 'waiting') return;
  _session.phase          = 'focus';
  _session.phaseStartTime = Date.now();
  _session.paused         = false;
  saveSession(_session);
  dispatchSessionStarted();
  renderTimerPanel();
}

function masterPause() {
  if (!_session || _session.paused) return;
  _session.pausedRemaining = getRemainingMs(_session);
  _session.paused          = true;
  _session.pausedAt        = Date.now();
  saveSession(_session);
  renderTimerPanel();
}

function masterResume() {
  if (!_session || !_session.paused) return;
  const duration = _session.phase === 'focus'
    ? _session.focusDuration * 60000
    : _session.breakDuration * 60000;
  _session.phaseStartTime = Date.now() - (duration - (_session.pausedRemaining || 0));
  _session.paused         = false;
  _session.pausedAt       = null;
  saveSession(_session);
  renderTimerPanel();
}

function masterSkipBreak() {
  if (!_session || _session.phase !== 'break') return;
  _consecutiveCt = 0; // broken streak — skip resets streak

  if (_session.currentRound < _session.totalRounds) {
    _session.currentRound++;
    _session.phase          = 'focus';
    _session.phaseStartTime = Date.now();
  } else {
    _session.phase = 'ended';
    onSessionEnd();
  }
  saveSession(_session);
  renderTimerPanel();
}

// ── Leave / remove self ────────────────────────────────────────────────────

function leaveSession() {
  if (!_session) { _onLeave?.(); return; }

  if (_isMaster) {
    _session.phase = 'ended';
    saveSession(_session);
    onSessionEnd();
  } else {
    _session.members = (_session.members || []).filter((m) => m.name !== _playerName);
    saveSession(_session);
  }

  destroySession();
  _onLeave?.();
}

// ── Send spark ─────────────────────────────────────────────────────────────

function sendSpark(memberName) {
  const stats = loadPlayerStats();
  stats.sparks_sent = (stats.sparks_sent || 0) + 1;
  savePlayerStats(stats);

  // Animate ✨ on the card
  const card = _timerPanel?.querySelector(`.pq-member-card[data-member="${memberName}"]`);
  if (card) {
    const sparkEl = document.createElement('span');
    sparkEl.textContent = '✨';
    sparkEl.style.cssText = 'position:absolute;top:-14px;font-size:18px;animation:pq-float 0.8s ease forwards;pointer-events:none;';
    card.style.position = 'relative';
    card.appendChild(sparkEl);
    setTimeout(() => sparkEl.remove(), 900);
  }

  checkAchievements({});
}

// ── Member subject update ──────────────────────────────────────────────────

function updateMemberSubject(subject) {
  if (!_session) return;
  const member = (_session.members || []).find((m) => m.name === _playerName);
  if (member) {
    member.subject = subject;
    saveSession(_session);
  }
  sessionStorage.setItem('pq_current_subject', subject);
}

// ── localStorage helpers ───────────────────────────────────────────────────

function loadSession(id) {
  try {
    const sessions = JSON.parse(localStorage.getItem(KEY_SESSIONS) || '[]');
    return sessions.find((s) => s.id === id) || null;
  } catch { return null; }
}

function saveSession(session) {
  try {
    const sessions = JSON.parse(localStorage.getItem(KEY_SESSIONS) || '[]');
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.push(session);
    localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(KEY_CURRENT_SESSION, JSON.stringify(session));
  } catch {}
}

function loadPlayerStats() {
  try { return JSON.parse(localStorage.getItem(KEY_STATS) || '{}'); }
  catch { return {}; }
}

function savePlayerStats(stats) {
  localStorage.setItem(KEY_STATS, JSON.stringify(stats));
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
