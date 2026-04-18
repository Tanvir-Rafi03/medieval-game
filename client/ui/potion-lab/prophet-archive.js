// prophet-archive.js
// Archive view — lists all past stories sorted by date, with streak tracking.

const KEY_ARCHIVE = 'hp_prophet_archive';
const KEY_STREAK  = 'hp_prophet_streak';

// ── Public API ─────────────────────────────────────────────────────────────

/** Save a story object to the archive and update streak. */
export function archiveStory(story) {
  const archive = getArchive();
  archive.unshift({ ...story, archivedAt: Date.now() });
  // Keep last 100
  if (archive.length > 100) archive.splice(100);
  localStorage.setItem(KEY_ARCHIVE, JSON.stringify(archive));
  updateStreak();
}

/** Get today's stories (same calendar day). */
export function getTodayStories() {
  const today = todayKey();
  return getArchive().filter((s) => s.dateKey === today);
}

/** Get current streak (consecutive days with at least one story). */
export function getStreak() {
  try { return JSON.parse(localStorage.getItem(KEY_STREAK) || '{}'); }
  catch { return { current: 0, best: 0, lastDay: null }; }
}

/** Render the archive list into a container element. */
export function renderArchive(container) {
  if (!container) return;
  const archive = getArchive();

  if (archive.length === 0) {
    container.innerHTML = `
      <div class="dp-archive-empty">
        <div style="font-size:32px">📜</div>
        <p>No stories yet. Write your first headline to begin your archive.</p>
      </div>
    `;
    return;
  }

  // Group by dateKey
  const byDay = {};
  archive.forEach((s) => {
    const key = s.dateKey || 'Unknown';
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(s);
  });

  const streak = getStreak();
  container.innerHTML = `
    <div class="dp-streak-banner">
      🔥 Current streak: <strong>${streak.current}</strong> day${streak.current !== 1 ? 's' : ''}
      &nbsp;·&nbsp; Best: <strong>${streak.best}</strong>
    </div>
    ${Object.entries(byDay).map(([day, stories]) => `
      <div class="dp-archive-day">
        <div class="dp-archive-day-label">${formatDayLabel(day)}</div>
        ${stories.map((s) => `
          <div class="dp-archive-item">
            <div class="dp-archive-headline">${escHtml(s.headline)}</div>
            <div class="dp-archive-goal">Goal: ${escHtml(s.goal)}</div>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function getArchive() {
  try { return JSON.parse(localStorage.getItem(KEY_ARCHIVE) || '[]'); }
  catch { return []; }
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function updateStreak() {
  const streak  = getStreak();
  const today   = todayKey();
  const archive = getArchive();

  // Check if we have any story from yesterday
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const hasYesterday = archive.some((s) => s.dateKey === yesterday);

  if (streak.lastDay === today) {
    // Already counted today
    return;
  } else if (streak.lastDay === yesterday || hasYesterday) {
    streak.current = (streak.current || 0) + 1;
  } else if (streak.lastDay !== today) {
    streak.current = 1;
  }

  streak.best    = Math.max(streak.best || 0, streak.current);
  streak.lastDay = today;
  localStorage.setItem(KEY_STREAK, JSON.stringify(streak));
}

function formatDayLabel(dateKey) {
  const today     = todayKey();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateKey === today)     return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  return new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
