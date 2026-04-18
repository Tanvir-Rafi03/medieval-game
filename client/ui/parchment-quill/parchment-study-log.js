// parchment-study-log.js
// Study log (Tab 1) + Kanban board (Tab 2) rendered inside the left panel
// of the session screen.

const KEY_LOG   = 'hp_study_log';
const KEY_BOARD = 'hp_study_board';
const KEY_STATS = 'hp_player_stats';

let _sessionId  = null;
let _dragState  = null; // { card, clone, colKey, startX, startY }

// ── Public API ─────────────────────────────────────────────────────────────

export function initStudyLog(container, sessionId) {
  _sessionId = sessionId;
  container.innerHTML = `
    <div class="pq-tabs" id="pq-log-tabs">
      <div class="pq-tab active" data-tab="log">Study Log</div>
      <div class="pq-tab" data-tab="kanban">Kanban</div>
    </div>
    <div class="pq-panel-scroll" style="padding:12px 14px;">
      <div id="pq-tab-log" class="pq-tab-content active"></div>
      <div id="pq-tab-kanban" class="pq-tab-content"></div>
    </div>
  `;

  // Tab switching
  container.querySelectorAll('.pq-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.pq-tab').forEach((t) => t.classList.remove('active'));
      container.querySelectorAll('.pq-tab-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      const id = `pq-tab-${tab.dataset.tab}`;
      const el = container.querySelector(`#${id}`);
      if (el) el.classList.add('active');

      if (tab.dataset.tab === 'kanban') renderKanban(container.querySelector('#pq-tab-kanban'));
    });
  });

  renderLog(container.querySelector('#pq-tab-log'));
}

export function addLogEntry(roundNum, label, durationMin) {
  if (!_sessionId) return;
  const log = getLog();
  const now = new Date();
  const time = now.toTimeString().slice(0, 5);
  log.push({
    sessionId: _sessionId,
    round: roundNum,
    label: label || 'Focus round',
    durationMin,
    time,
    id: `le_${Date.now()}`,
  });
  saveLog(log);

  // Refresh if visible — use the overlay container, not global getElementById
  const overlay = document.getElementById('pq-overlay');
  if (!overlay) return;
  const logTab = overlay.querySelector('#pq-tab-log');
  if (logTab && logTab.classList.contains('active')) renderLog(logTab);
}

export function getStudySubject() {
  return sessionStorage.getItem('pq_current_subject') || '';
}

// ── Study Log renderer ─────────────────────────────────────────────────────

function renderLog(container) {
  if (!container) return;
  const subject = getStudySubject();
  const log     = getLog().filter((e) => e.sessionId === _sessionId);

  const totalMin = log.reduce((acc, e) => acc + (e.durationMin || 0), 0);
  const hours    = Math.floor(totalMin / 60);
  const mins     = totalMin % 60;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <span style="font-size:11px;color:#5a4a2a;white-space:nowrap;font-family:'Cinzel',serif;">Studying:</span>
      <input class="pq-subject-input" id="pq-subject-input" style="flex:1;padding:5px 8px;min-height:0;resize:none;"
             placeholder="What are you working on?" value="${escHtml(subject)}">
    </div>
    <div style="display:flex;gap:6px;margin-bottom:12px">
      <input class="pq-subject-input" id="pq-note-input" style="flex:1;padding:6px 8px;min-height:0;"
             placeholder="Add a log note… (press Enter to save)">
      <button id="pq-note-add" style="
        padding:6px 12px;background:linear-gradient(135deg,#1a472a,#0f2d1a);
        color:#7ab894;border:1px solid #1a472a;border-radius:3px;cursor:pointer;
        font-family:'Cinzel',serif;font-size:11px;white-space:nowrap;
      ">+ Log</button>
    </div>
    <div id="pq-log-list"></div>
    <div class="pq-log-total">Session total: ${hours}h ${mins}m</div>
  `;

  // Subject input — auto-save on type
  container.querySelector('#pq-subject-input').addEventListener('input', (e) => {
    sessionStorage.setItem('pq_current_subject', e.target.value);
  });

  // Note input — Enter OR button click saves a manual log entry
  const noteInput = container.querySelector('#pq-note-input');
  const addNote = () => {
    const text = noteInput.value.trim();
    if (!text) return;
    addLogEntry(0, text, 0);  // round 0 = manual note
    noteInput.value = '';
    noteInput.focus();
  };
  noteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addNote(); }
  });
  container.querySelector('#pq-note-add').addEventListener('click', addNote);

  // Log list
  const list = container.querySelector('#pq-log-list');
  if (log.length === 0) {
    list.innerHTML = `<div class="pq-log-entry" style="color:#4a3a2a;font-style:italic">No entries yet — add a note or complete a focus round.</div>`;
    return;
  }

  log.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'pq-log-entry';
    row.dataset.id = entry.id;
    const badge = entry.round === 0 ? '📝' : `R${entry.round}`;
    row.innerHTML = `
      <span class="round-badge" title="${entry.round === 0 ? 'Manual note' : 'Focus round'}">${badge}</span>
      <span class="log-label">${escHtml(entry.label)}</span>
      ${entry.durationMin ? `<span style="flex-shrink:0">${entry.durationMin}min</span>` : ''}
      <span style="flex-shrink:0">${entry.time}</span>
    `;
    // Click label to edit inline
    row.querySelector('.log-label').addEventListener('click', (e) => {
      const span = e.target;
      span.contentEditable = 'true';
      span.focus();
      span.addEventListener('blur', () => {
        span.contentEditable = 'false';
        updateLogEntry(entry.id, span.textContent.trim() || entry.label);
      }, { once: true });
      span.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); span.blur(); }
      });
    });
    list.appendChild(row);
  });
}

// ── Kanban renderer ────────────────────────────────────────────────────────

function renderKanban(container) {
  if (!container) return;
  const board = getBoard();

  container.innerHTML = `
    <div class="pq-kanban">
      ${['todo', 'inprogress', 'mastered'].map((col) => renderColumn(col, board[col] || [])).join('')}
    </div>
  `;

  // Wire drag-and-drop and add-topic for each column
  ['todo', 'inprogress', 'mastered'].forEach((col) => {
    wireColumn(container, col);
  });
}

function colLabel(col) {
  return col === 'todo' ? 'To Study' : col === 'inprogress' ? 'In Progress' : 'Mastered ✓';
}

function renderColumn(col, cards) {
  const cardsHtml = cards.map((card) => `
    <div class="pq-card-chip${col === 'mastered' ? ' mastered' : ''}"
         data-card-id="${card.id}" data-col="${col}">
      ${escHtml(card.label)}
      ${col === 'inprogress' && card.focusMin ? `<div class="pq-card-time">⏱ ${card.focusMin}min</div>` : ''}
    </div>
  `).join('');

  return `
    <div class="pq-kanban-col" id="pq-col-${col}">
      <div class="pq-kanban-title">${colLabel(col)}</div>
      ${cardsHtml}
      <div class="pq-add-topic" data-col="${col}">+ Add topic</div>
      <input class="pq-add-input" data-col="${col}"
             placeholder="Topic name…" style="display:none">
    </div>
  `;
}

function wireColumn(container, col) {
  const colEl = container.querySelector(`#pq-col-${col}`);
  if (!colEl) return;

  // Dragging cards
  colEl.querySelectorAll('.pq-card-chip').forEach((chip) => {
    chip.addEventListener('mousedown', (e) => startDrag(e, chip, col, container));
  });

  // Add topic
  const addBtn = colEl.querySelector(`.pq-add-topic[data-col="${col}"]`);
  const addInput = colEl.querySelector(`.pq-add-input[data-col="${col}"]`);

  addBtn.addEventListener('click', () => {
    addInput.style.display = 'block';
    addInput.focus();
  });

  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const label = addInput.value.trim();
      if (label) {
        const board = getBoard();
        if (!board[col]) board[col] = [];
        board[col].push({ id: `card_${Date.now()}`, label, focusMin: 0 });
        saveBoard(board);
      }
      addInput.value = '';
      addInput.style.display = 'none';
      renderKanban(container);
    }
    if (e.key === 'Escape') {
      addInput.value = '';
      addInput.style.display = 'none';
    }
  });

  addInput.addEventListener('blur', () => {
    const label = addInput.value.trim();
    if (label) {
      const board = getBoard();
      if (!board[col]) board[col] = [];
      board[col].push({ id: `card_${Date.now()}`, label, focusMin: 0 });
      saveBoard(board);
    }
    addInput.value = '';
    addInput.style.display = 'none';
    renderKanban(container);
  });
}

// ── Drag-and-drop ──────────────────────────────────────────────────────────

function startDrag(e, chip, col, container) {
  e.preventDefault();
  const rect = chip.getBoundingClientRect();

  const clone = document.createElement('div');
  clone.className = 'pq-card-chip dragging';
  clone.textContent = chip.textContent;
  clone.style.cssText = `
    position:fixed;width:${rect.width}px;pointer-events:none;z-index:9999;
    left:${rect.left}px;top:${rect.top}px;opacity:0.85;
  `;
  document.body.appendChild(clone);

  chip.style.opacity = '0.3';

  _dragState = {
    chip,
    clone,
    cardId: chip.dataset.cardId,
    fromCol: col,
    container,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
  };

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
}

function onDragMove(e) {
  if (!_dragState) return;
  _dragState.clone.style.left = `${e.clientX - _dragState.offsetX}px`;
  _dragState.clone.style.top  = `${e.clientY - _dragState.offsetY}px`;
}

function onDragEnd(e) {
  if (!_dragState) return;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);

  _dragState.clone.remove();
  _dragState.chip.style.opacity = '';

  // Find which column the mouse is over
  const cols = ['todo', 'inprogress', 'mastered'];
  let toCol = null;
  for (const col of cols) {
    const colEl = _dragState.container.querySelector(`#pq-col-${col}`);
    if (!colEl) continue;
    const r = colEl.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      toCol = col;
      break;
    }
  }

  if (toCol && toCol !== _dragState.fromCol) {
    moveCard(_dragState.cardId, _dragState.fromCol, toCol, _dragState.container);
  }

  _dragState = null;
}

function moveCard(cardId, fromCol, toCol, container) {
  const board = getBoard();
  const fromArr = board[fromCol] || [];
  const idx = fromArr.findIndex((c) => c.id === cardId);
  if (idx === -1) return;

  const [card] = fromArr.splice(idx, 1);
  if (!board[toCol]) board[toCol] = [];
  board[toCol].push(card);
  saveBoard(board);

  // Update mastered_topics stat when moved to mastered
  if (toCol === 'mastered') {
    try {
      const stats = JSON.parse(localStorage.getItem(KEY_STATS) || '{}');
      if (!stats.mastered_topics) stats.mastered_topics = {};
      stats.mastered_topics[card.label] = (stats.mastered_topics[card.label] || 0) + 1;
      localStorage.setItem(KEY_STATS, JSON.stringify(stats));
    } catch {}
  }

  renderKanban(container);
}

// ── LocalStorage helpers ───────────────────────────────────────────────────

function getLog() {
  try { return JSON.parse(localStorage.getItem(KEY_LOG) || '[]'); }
  catch { return []; }
}

function saveLog(log) {
  localStorage.setItem(KEY_LOG, JSON.stringify(log));
}

function updateLogEntry(id, newLabel) {
  const log = getLog();
  const entry = log.find((e) => e.id === id);
  if (entry) { entry.label = newLabel; saveLog(log); }
}

function getBoard() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_BOARD) || '{}');
    return { todo: raw.todo || [], inprogress: raw.inprogress || [], mastered: raw.mastered || [] };
  } catch {
    return { todo: [], inprogress: [], mastered: [] };
  }
}

function saveBoard(board) {
  localStorage.setItem(KEY_BOARD, JSON.stringify(board));
}

// ── Utility ────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
