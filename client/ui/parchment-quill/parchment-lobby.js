// parchment-lobby.js
// Left column: live list of active sessions (polled from localStorage).
// Right column: create-session form.

const KEY_SESSIONS        = 'hp_parchment_sessions';
const KEY_CURRENT_SESSION = 'hp_parchment_current_session';
const KEY_STATS           = 'hp_player_stats';

let _pollInterval      = null;
let _countdownInterval = null;
let _onJoin            = null;
let _onCreate          = null;
let _container         = null;

// Form state
let _focusDur  = 25;
let _breakDur  = 5;
let _rounds    = 4;
let _tags      = [];
let _visibility = 'open';

// ── Public API ─────────────────────────────────────────────────────────────

export function initLobby(container, onJoin, onCreate) {
  // Clear any previous intervals
  if (_pollInterval)      { clearInterval(_pollInterval);      _pollInterval      = null; }
  if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }

  _container = container;
  _onJoin    = onJoin;
  _onCreate  = onCreate;

  // Reset form state
  _focusDur   = 25;
  _breakDur   = 5;
  _rounds     = 4;
  _tags       = [];
  _visibility = 'open';

  renderLobby();

  _pollInterval      = setInterval(refreshSessionList, 2000);
  _countdownInterval = setInterval(updateCountdownSpans, 1000);
}

// ── Full lobby render ──────────────────────────────────────────────────────

function renderLobby() {
  if (!_container) return;

  const savedName = getPlayerName();

  _container.innerHTML = `
    <!-- LEFT: active sessions -->
    <div class="pq-lobby-left">
      <div class="pq-section-title">Active Sessions</div>
      <div class="pq-session-list-wrap" id="pq-session-list"></div>
    </div>

    <!-- RIGHT: create form -->
    <div class="pq-lobby-right">
      <div class="pq-section-title">Your Scroll</div>

      <label class="pq-form-label">Your name</label>
      <input class="pq-form-input" id="pq-player-name"
             placeholder="e.g. Hermione" maxlength="30"
             value="${escHtml(savedName !== 'Scholar' ? savedName : '')}">

      <label class="pq-form-label">Session name</label>
      <input class="pq-form-input" id="pq-session-name"
             placeholder="e.g. OWL Exam Crunch" maxlength="60">

      <label class="pq-form-label">Focus duration</label>
      <div class="pq-pills" id="pq-focus-pills">
        ${[25, 45, 60, 90].map((v) => `
          <button class="pq-pill${v === _focusDur ? ' active' : ''}"
                  data-focus="${v}">${v} min</button>
        `).join('')}
      </div>

      <label class="pq-form-label">Break duration</label>
      <div class="pq-pills" id="pq-break-pills">
        ${[5, 10, 15].map((v) => `
          <button class="pq-pill${v === _breakDur ? ' active' : ''}"
                  data-break="${v}">${v} min</button>
        `).join('')}
      </div>

      <label class="pq-form-label">Rounds</label>
      <div class="pq-stepper">
        <button class="pq-step-btn" id="pq-rounds-dec">−</button>
        <span class="pq-step-val" id="pq-rounds-val">${_rounds}</span>
        <button class="pq-step-btn" id="pq-rounds-inc">+</button>
      </div>

      <label class="pq-form-label">Tags <span style="color:#5a4a2a;font-size:10px">(press Enter to add, max 5)</span></label>
      <div class="pq-tags-input-wrap">
        <div id="pq-tag-chips"></div>
        <input class="pq-form-input" id="pq-tag-input"
               placeholder="e.g. Potions" style="margin-bottom:0">
      </div>

      <label class="pq-form-label" style="margin-top:12px">Visibility</label>
      <div class="pq-toggle" id="pq-visibility-toggle">
        <button class="pq-toggle-btn active" data-vis="open">Open</button>
        <button class="pq-toggle-btn" data-vis="friends">Friends</button>
      </div>

      <button class="pq-create-btn" id="pq-create-btn">Unroll the Parchment 📜</button>
      <div id="pq-form-error" style="color:#c97a7a;font-size:11px;margin-top:8px;min-height:16px"></div>
    </div>
  `;

  renderSessionList();
  wireForm();

  // Auto-focus session name (not player name — player name is secondary)
  setTimeout(() => _container?.querySelector('#pq-session-name')?.focus(), 60);
}

// ── Session list ───────────────────────────────────────────────────────────

function renderSessionList() {
  const listEl = _container?.querySelector('#pq-session-list');
  if (!listEl) return;

  const sessions = getSessions().filter((s) => s.phase !== 'ended');

  if (sessions.length === 0) {
    listEl.innerHTML = `
      <div class="pq-empty">
        <div class="pq-empty-quill">✒️</div>
        <div class="pq-empty-text">
          No sessions in progress.<br>
          Be the first to unroll the parchment.
        </div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = sessions.map((s) => buildSessionCard(s)).join('');

  // Wire join buttons
  listEl.querySelectorAll('.pq-join-btn[data-session-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.sessionId;
      joinSession(id);
    });
  });
}

function buildSessionCard(s) {
  const memberAvatars = (s.members || []).map((m) => {
    const init = (m.name || '?').slice(0, 2).toUpperCase();
    return `<div class="pq-avatar">${init}</div>`;
  }).join('');

  const tagsHtml = (s.tags || []).map((t) => `<span class="pq-tag">${escHtml(t)}</span>`).join('');
  const joining  = s.phase === 'focus';
  const phaseStr = s.phase === 'focus'    ? '🟢 Focus'
                 : s.phase === 'break'    ? '☕ Break'
                 : s.phase === 'waiting'  ? '⏳ Waiting'
                 : '✓ Ended';

  return `
    <div class="pq-session-card">
      <div class="pq-card-name">${escHtml(s.name)}</div>
      <div class="pq-card-meta">
        <span>by ${escHtml(s.masterName)}</span>
        <span>${s.focusDuration}min / ${s.breakDuration}min break</span>
        <span>Round ${s.currentRound || 1}/${s.totalRounds}</span>
      </div>
      <div class="pq-card-phase">
        ${phaseStr}
        <span class="pq-cd-span" data-session-id="${s.id}" data-phase="${s.phase}"
              data-phase-start="${s.phaseStartTime || 0}"
              data-focus-dur="${s.focusDuration}"
              data-break-dur="${s.breakDuration}"
              data-paused="${s.paused ? '1' : '0'}"
              data-paused-rem="${s.pausedRemaining || 0}">
        </span>
      </div>
      ${tagsHtml ? `<div class="pq-tags">${tagsHtml}</div>` : ''}
      <div class="pq-card-members">${memberAvatars}
        <span style="font-size:11px;color:#5a4a2a">${(s.members || []).length} member${(s.members || []).length !== 1 ? 's' : ''}</span>
      </div>
      <button class="pq-join-btn" data-session-id="${s.id}"
              ${joining ? 'disabled title="Wait for the next break"' : ''}>
        ${joining ? 'In session…' : 'Join Session'}
      </button>
    </div>
  `;
}

function refreshSessionList() {
  if (!_container?.querySelector('#pq-session-list')) return;
  renderSessionList();
}

function updateCountdownSpans() {
  document.querySelectorAll('.pq-cd-span[data-session-id]').forEach((span) => {
    const phase       = span.dataset.phase;
    const phaseStart  = parseInt(span.dataset.phaseStart, 10);
    const focusDur    = parseInt(span.dataset.focusDur,   10) * 60000;
    const breakDur    = parseInt(span.dataset.breakDur,   10) * 60000;
    const paused      = span.dataset.paused === '1';
    const pausedRem   = parseInt(span.dataset.pausedRem, 10);

    if (phase === 'waiting' || phase === 'ended') { span.textContent = ''; return; }

    let remaining;
    if (paused) {
      remaining = pausedRem;
    } else {
      const duration = phase === 'focus' ? focusDur : breakDur;
      remaining = Math.max(0, duration - (Date.now() - phaseStart));
    }

    const totalSec = Math.ceil(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    span.textContent = ` — ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });
}

// ── Join session ───────────────────────────────────────────────────────────

function joinSession(id) {
  const sessions = getSessions();
  const idx      = sessions.findIndex((s) => s.id === id);
  if (idx === -1) return;

  const session    = sessions[idx];
  const playerName = getPlayerName();

  // Avoid duplicate member
  const already = (session.members || []).some((m) => m.name === playerName);
  if (!already) {
    session.members = session.members || [];
    session.members.push({ name: playerName, house: '#1a472a', subject: '', status: 'active' });
    sessions[idx] = session;
    localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(KEY_CURRENT_SESSION, JSON.stringify(session));
  }

  clearIntervals();
  _onJoin?.(session, false);
}

// ── Create session ─────────────────────────────────────────────────────────

function createSession() {
  const nameInput   = _container?.querySelector('#pq-session-name');
  const playerInput = _container?.querySelector('#pq-player-name');
  const errorEl     = _container?.querySelector('#pq-form-error');
  const name        = nameInput?.value.trim();

  // Save player name if provided
  const typedName = playerInput?.value.trim();
  if (typedName) {
    try {
      const stats = JSON.parse(localStorage.getItem(KEY_STATS) || '{}');
      stats.name = typedName;
      localStorage.setItem(KEY_STATS, JSON.stringify(stats));
    } catch {}
  }

  if (!name) {
    if (errorEl) errorEl.textContent = 'Give your session a name first.';
    nameInput?.focus();
    return;
  }
  if (errorEl) errorEl.textContent = '';

  const playerName = typedName || getPlayerName();
  const session = {
    id:             `pq_${Date.now()}`,
    name,
    masterName:     playerName,
    focusDuration:  _focusDur,
    breakDuration:  _breakDur,
    totalRounds:    _rounds,
    currentRound:   1,
    phase:          'waiting',
    phaseStartTime: null,
    paused:         false,
    pausedAt:       null,
    pausedRemaining:0,
    tags:           [..._tags],
    visibility:     _visibility,
    members:        [{ name: playerName, house: '#1a472a', subject: '', status: 'active' }],
    createdAt:      Date.now(),
  };

  const sessions = getSessions();
  sessions.push(session);
  localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions));
  localStorage.setItem(KEY_CURRENT_SESSION, JSON.stringify(session));

  clearIntervals();
  _onCreate?.(session, true);
}

// ── Form wiring ────────────────────────────────────────────────────────────

function wireForm() {
  const $ = (id) => _container.querySelector(`#${id}`);
  const $$ = (sel) => _container.querySelectorAll(sel);

  // Focus pills
  $$('#pq-focus-pills .pq-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      _focusDur = parseInt(btn.dataset.focus, 10);
      $$('#pq-focus-pills .pq-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Break pills
  $$('#pq-break-pills .pq-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      _breakDur = parseInt(btn.dataset.break, 10);
      $$('#pq-break-pills .pq-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Rounds stepper
  $('pq-rounds-dec')?.addEventListener('click', () => {
    _rounds = Math.max(1, _rounds - 1);
    const el = $('pq-rounds-val');
    if (el) el.textContent = _rounds;
  });
  $('pq-rounds-inc')?.addEventListener('click', () => {
    _rounds = Math.min(8, _rounds + 1);
    const el = $('pq-rounds-val');
    if (el) el.textContent = _rounds;
  });

  // Tags input — Enter adds chip (but NOT if tag input is focused, prevent double-fire)
  const tagInput = $('pq-tag-input');
  tagInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const val = tagInput.value.trim();
      if (val && _tags.length < 5 && !_tags.includes(val)) {
        _tags.push(val);
        renderTagChips();
      }
      tagInput.value = '';
    }
  });

  // Session name — Enter submits
  $('pq-session-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); createSession(); }
  });

  // Visibility toggle
  $$('#pq-visibility-toggle .pq-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      _visibility = btn.dataset.vis;
      $$('#pq-visibility-toggle .pq-toggle-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Create button
  $('pq-create-btn')?.addEventListener('click', createSession);

  renderTagChips();
}

function renderTagChips() {
  const wrap = _container?.querySelector('#pq-tag-chips');
  if (!wrap) return;
  wrap.innerHTML = _tags.map((t, i) => `
    <span class="pq-chip">
      ${escHtml(t)}
      <span class="pq-chip-remove" data-idx="${i}">✕</span>
    </span>
  `).join('');
  wrap.querySelectorAll('.pq-chip-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      _tags.splice(parseInt(btn.dataset.idx, 10), 1);
      renderTagChips();
    });
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getSessions() {
  try { return JSON.parse(localStorage.getItem(KEY_SESSIONS) || '[]'); }
  catch { return []; }
}

function getPlayerName() {
  try {
    return JSON.parse(localStorage.getItem(KEY_STATS) || '{}').name || 'Scholar';
  } catch { return 'Scholar'; }
}

function clearIntervals() {
  if (_pollInterval)      { clearInterval(_pollInterval);      _pollInterval      = null; }
  if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
