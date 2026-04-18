// prophet-achievements.js
// 8 achievements for The Daily Prophet feature.

const KEY_ACHIEVEMENTS = 'hp_prophet_achievements';
const KEY_STATS        = 'hp_player_stats';

const DEFINITIONS = [
  {
    id: 'first_scoop',
    title: 'First Scoop',
    desc: 'Publish your very first Daily Prophet story.',
    icon: '🗞️',
    check: (stats) => (stats.stories_published || 0) >= 1,
  },
  {
    id: 'front_page',
    title: 'Front Page News',
    desc: 'Fill all 5 story slots in a single edition.',
    icon: '📰',
    check: (stats) => (stats.full_editions || 0) >= 1,
  },
  {
    id: 'daily_reader',
    title: 'Daily Reader',
    desc: 'Open The Daily Prophet on 3 different days.',
    icon: '📅',
    check: (stats) => Object.keys(stats.prophet_days || {}).length >= 3,
  },
  {
    id: 'streak_seeker',
    title: 'Streak Seeker',
    desc: 'Maintain a 5-day publishing streak.',
    icon: '🔥',
    check: (stats) => (stats.prophet_streak || 0) >= 5,
  },
  {
    id: 'ai_correspondent',
    title: 'AI Correspondent',
    desc: 'Generate 10 AI-powered headlines.',
    icon: '🪄',
    check: (stats) => (stats.ai_headlines || 0) >= 10,
  },
  {
    id: 'archivist',
    title: 'Archivist',
    desc: 'Accumulate 20 stories in the archive.',
    icon: '📜',
    check: (stats) => (stats.stories_published || 0) >= 20,
  },
  {
    id: 'night_owl',
    title: 'Night Owl Reporter',
    desc: 'Publish a story between midnight and 4 AM.',
    icon: '🦉',
    check: (stats) => stats.night_story === true,
  },
  {
    id: 'truth_seeker',
    title: 'Truth Seeker',
    desc: 'Edit a published headline after seeing the AI version.',
    icon: '✏️',
    check: (stats) => stats.headlines_edited >= 1,
  },
];

// ── Public API ─────────────────────────────────────────────────────────────

export function checkProphetAchievements(statsOverrides = {}) {
  const raw      = localStorage.getItem(KEY_STATS);
  const stats    = { ...(raw ? JSON.parse(raw) : {}), ...statsOverrides };
  const unlocked = getUnlocked();
  const newOnes  = [];

  for (const def of DEFINITIONS) {
    if (!unlocked[def.id] && def.check(stats)) {
      unlocked[def.id] = { at: Date.now() };
      newOnes.push(def);
    }
  }

  if (newOnes.length) {
    localStorage.setItem(KEY_ACHIEVEMENTS, JSON.stringify(unlocked));
    newOnes.forEach(showToast);
  }
}

export function renderProphetAchievements(container) {
  if (!container) return;
  const unlocked = getUnlocked();

  container.innerHTML = `
    <div class="dp-ach-grid">
      ${DEFINITIONS.map((def) => {
        const done = !!unlocked[def.id];
        return `
          <div class="dp-ach-item ${done ? 'done' : 'locked'}">
            <div class="dp-ach-icon">${done ? def.icon : '🔒'}</div>
            <div class="dp-ach-title">${def.title}</div>
            <div class="dp-ach-desc">${def.desc}</div>
            ${done ? `<div class="dp-ach-date">${new Date(unlocked[def.id].at).toLocaleDateString()}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getUnlocked() {
  try { return JSON.parse(localStorage.getItem(KEY_ACHIEVEMENTS) || '{}'); }
  catch { return {}; }
}

function showToast(def) {
  const toast = document.createElement('div');
  toast.className = 'dp-achievement-toast';
  toast.innerHTML = `
    <span class="dp-toast-icon">${def.icon}</span>
    <div>
      <div class="dp-toast-title">Achievement Unlocked</div>
      <div class="dp-toast-name">${def.title}</div>
    </div>
  `;
  document.body.appendChild(toast);
  // Animate in
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}
