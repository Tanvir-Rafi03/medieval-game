// parchment-achievements.js
// Achievement definitions, stat helpers, unlock logic, and panel renderer.

import { dispatchAchievementUnlocked } from './parchment-events.js';

// ── localStorage keys ─────────────────────────────────────────────────────
const KEY_ACHIEVEMENTS = 'hp_achievements';
const KEY_STATS        = 'hp_player_stats';

// ── Default stats shape ───────────────────────────────────────────────────
function defaultStats() {
  return {
    gold: 0,
    xp: 0,
    level: 1,
    total_rounds: 0,
    group_rounds: 0,
    group_sessions: 0,
    sessions_as_master: 0,
    sparks_sent: 0,
    max_concurrent_members: 0,
    consecutive_rounds: 0,
    max_focus_minutes: 0,
    night_rounds: 0,
    daily_sessions: {},
    mastered_topics: {},
  };
}

export function getStats() {
  try {
    const raw = localStorage.getItem(KEY_STATS);
    if (!raw) return defaultStats();
    return Object.assign(defaultStats(), JSON.parse(raw));
  } catch {
    return defaultStats();
  }
}

function saveStats(stats) {
  localStorage.setItem(KEY_STATS, JSON.stringify(stats));
}

function getUnlocked() {
  try {
    return JSON.parse(localStorage.getItem(KEY_ACHIEVEMENTS) || '{}');
  } catch {
    return {};
  }
}

function saveUnlocked(u) {
  localStorage.setItem(KEY_ACHIEVEMENTS, JSON.stringify(u));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ── Achievement definitions ────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  // ── Solo ──────────────────────────────────────────────────────────────────
  {
    id: 'first-inscription',
    name: 'First Inscription',
    emoji: '📜',
    flavour: 'Every great scroll begins with a single stroke of the quill.',
    hint: 'Complete your first focus round.',
    xp: 20,
    gold: 10,
    group: false,
    condition: (s) => s.total_rounds >= 1,
    progress: (s) => ({ value: s.total_rounds, max: 1 }),
  },
  {
    id: 'diligent-scholar',
    name: 'Diligent Scholar',
    emoji: '📖',
    flavour: 'Even Hermione started somewhere — page one of the library.',
    hint: 'Complete 10 focus rounds in total.',
    xp: 50,
    gold: 25,
    group: false,
    condition: (s) => s.total_rounds >= 10,
    progress: (s) => ({ value: Math.min(s.total_rounds, 10), max: 10 }),
  },
  {
    id: 'night-scribe',
    name: 'Night Scribe',
    emoji: '🌙',
    flavour: 'The library is quietest after midnight, when the portraits sleep.',
    hint: 'Complete a focus round between 23:00 and 04:00.',
    xp: 30,
    gold: 15,
    group: false,
    condition: (s) => s.night_rounds >= 1,
    progress: null,
  },
  {
    id: 'marathon-caster',
    name: 'Marathon Caster',
    emoji: '⚡',
    flavour: 'Some spells require sustained concentration — this was one of them.',
    hint: 'Complete a focus round of 90 minutes or longer.',
    xp: 80,
    gold: 40,
    group: false,
    condition: (s) => s.max_focus_minutes >= 90,
    progress: (s) => ({ value: Math.min(s.max_focus_minutes, 90), max: 90 }),
  },
  {
    id: 'unbroken-seal',
    name: 'Unbroken Seal',
    emoji: '🔥',
    flavour: 'The parchment holds firm when the ink never runs dry.',
    hint: 'Complete 4 consecutive rounds without skipping a break.',
    xp: 60,
    gold: 30,
    group: false,
    condition: (s) => s.consecutive_rounds >= 4,
    progress: (s) => ({ value: Math.min(s.consecutive_rounds, 4), max: 4 }),
  },
  {
    id: 'ink-stained',
    name: 'Ink-Stained Fingers',
    emoji: '🎯',
    flavour: 'Auror-level concentration. Your fingers are permanently ink-stained.',
    hint: 'Complete 3 or more sessions today.',
    xp: 100,
    gold: 50,
    group: false,
    condition: (s) => (s.daily_sessions[todayKey()] || 0) >= 3,
    progress: (s) => ({ value: Math.min(s.daily_sessions[todayKey()] || 0, 3), max: 3 }),
  },

  // ── Group ─────────────────────────────────────────────────────────────────
  {
    id: 'study-companion',
    name: 'Study Companion',
    emoji: '🤝',
    flavour: 'Even lone wolves need a study group sometimes.',
    hint: 'Complete a focus round with at least one other member.',
    xp: 25,
    gold: 15,
    group: true,
    condition: (s) => s.group_rounds >= 1,
    progress: (s) => ({ value: Math.min(s.group_rounds, 1), max: 1 }),
  },
  {
    id: 'full-scriptorium',
    name: 'Full Scriptorium',
    emoji: '👥',
    flavour: 'The more quills scratching, the louder the silence becomes.',
    hint: 'Be in a session with 5 or more members at once.',
    xp: 40,
    gold: 20,
    group: true,
    condition: (s) => s.max_concurrent_members >= 5,
    progress: (s) => ({ value: Math.min(s.max_concurrent_members, 5), max: 5 }),
  },
  {
    id: 'session-master',
    name: 'Session Master',
    emoji: '👑',
    flavour: 'Lead the group to the finish line, and they will follow anywhere.',
    hint: 'Host and complete a full group session as master.',
    xp: 60,
    gold: 30,
    group: true,
    condition: (s) => s.sessions_as_master >= 1,
    progress: (s) => ({ value: Math.min(s.sessions_as_master, 1), max: 1 }),
  },
  {
    id: 'spark-giver',
    name: 'Spark Giver',
    emoji: '⚡',
    flavour: 'A good word is worth more than all the gold in Gringotts.',
    hint: 'Send 10 sparks of encouragement to fellow scholars.',
    xp: 20,
    gold: 10,
    group: true,
    condition: (s) => s.sparks_sent >= 10,
    progress: (s) => ({ value: Math.min(s.sparks_sent, 10), max: 10 }),
  },
  {
    id: 'study-circle',
    name: 'The Study Circle',
    emoji: '🏆',
    flavour: 'Loyalty and dedication define a true scholar.',
    hint: 'Complete 5 group sessions from start to finish.',
    xp: 150,
    gold: 75,
    group: true,
    condition: (s) => s.group_sessions >= 5,
    progress: (s) => ({ value: Math.min(s.group_sessions, 5), max: 5 }),
  },

  // ── Subject mastery ────────────────────────────────────────────────────────
  {
    id: 'potions-master',
    name: 'Potions Master',
    emoji: '🧪',
    flavour: 'You have brewed excellence in this subject.',
    hint: 'Move the "Potions" card to Mastered 5 times.',
    xp: 50,
    gold: 0,
    group: false,
    condition: (s) => (s.mastered_topics['Potions'] || 0) >= 5,
    progress: (s) => ({ value: Math.min(s.mastered_topics['Potions'] || 0, 5), max: 5 }),
  },
  {
    id: 'charms-prodigy',
    name: 'Charms Prodigy',
    emoji: '✨',
    flavour: 'A flick of the wrist; a lifetime of practice.',
    hint: 'Move the "Charms" card to Mastered 5 times.',
    xp: 50,
    gold: 0,
    group: false,
    condition: (s) => (s.mastered_topics['Charms'] || 0) >= 5,
    progress: (s) => ({ value: Math.min(s.mastered_topics['Charms'] || 0, 5), max: 5 }),
  },
  {
    id: 'herbology-expert',
    name: 'Herbology Expert',
    emoji: '🌿',
    flavour: 'The Mandrake never stood a chance.',
    hint: 'Move the "Herbology" card to Mastered 5 times.',
    xp: 50,
    gold: 0,
    group: false,
    condition: (s) => (s.mastered_topics['Herbology'] || 0) >= 5,
    progress: (s) => ({ value: Math.min(s.mastered_topics['Herbology'] || 0, 5), max: 5 }),
  },
];

// ── Check & unlock ─────────────────────────────────────────────────────────
export function checkAchievements(context = {}) {
  const stats   = getStats();
  const unlocked = getUnlocked();
  const newlyUnlocked = [];

  // Merge context-supplied stat updates before checking
  if (context.focusDuration !== undefined) {
    stats.max_focus_minutes = Math.max(stats.max_focus_minutes, context.focusDuration);
  }
  if (context.memberCount !== undefined) {
    stats.max_concurrent_members = Math.max(stats.max_concurrent_members, context.memberCount);
  }
  if (context.currentHour !== undefined) {
    const h = context.currentHour;
    if (h >= 23 || h < 4) stats.night_rounds++;
  }

  for (const ach of ACHIEVEMENTS) {
    if (unlocked[ach.id]) continue;
    if (ach.condition(stats)) {
      unlocked[ach.id] = new Date().toISOString();
      stats.xp   = (stats.xp   || 0) + ach.xp;
      stats.gold = (stats.gold || 0) + ach.gold;
      dispatchAchievementUnlocked(ach);
      newlyUnlocked.push(ach);
    }
  }

  saveStats(stats);
  saveUnlocked(unlocked);
  return newlyUnlocked;
}

// ── Render panel ───────────────────────────────────────────────────────────
export function renderAchievementsPanel(container) {
  if (!container) return;
  const unlocked = getUnlocked();
  const stats    = getStats();

  const unlockedList = ACHIEVEMENTS.filter((a) => unlocked[a.id]);
  const lockedList   = ACHIEVEMENTS.filter((a) => !unlocked[a.id]);

  let html = `
    <div class="pq-panel-title">Achievements</div>
    <div class="pq-panel-scroll">
  `;

  if (unlockedList.length > 0) {
    html += `<div class="pq-section-divider">Unlocked (${unlockedList.length})</div>`;
    for (const ach of unlockedList) {
      const date = new Date(unlocked[ach.id]).toLocaleDateString();
      html += `
        <div class="pq-ach-card">
          <div class="pq-ach-top">
            <span class="pq-ach-emoji">${ach.emoji}</span>
            <span class="pq-ach-name">${ach.name}</span>
          </div>
          <div class="pq-ach-flavour">"${ach.flavour}"</div>
          <div class="pq-ach-rewards">+${ach.xp} XP${ach.gold ? ` &nbsp;·&nbsp; +${ach.gold} Gold` : ''}</div>
          <div class="pq-ach-date">Unlocked ${date}</div>
        </div>
      `;
    }
  }

  if (lockedList.length > 0) {
    html += `<div class="pq-section-divider">Locked (${lockedList.length})</div>`;
    for (const ach of lockedList) {
      const prog = ach.progress ? ach.progress(stats) : null;
      const pct  = prog ? Math.round((prog.value / prog.max) * 100) : 0;
      html += `
        <div class="pq-ach-card locked">
          <div class="pq-ach-top">
            <span class="pq-ach-emoji">???</span>
            <span class="pq-ach-locked-name">${ach.name}</span>
          </div>
          <div class="pq-ach-hint">${ach.hint}</div>
          ${prog ? `
            <div class="pq-progress-bar">
              <div class="pq-progress-fill" style="width:${pct}%"></div>
            </div>
            <div class="pq-ach-date" style="margin-top:4px">${prog.value} / ${prog.max}</div>
          ` : ''}
        </div>
      `;
    }
  }

  html += `</div>`;
  container.innerHTML = html;
}
