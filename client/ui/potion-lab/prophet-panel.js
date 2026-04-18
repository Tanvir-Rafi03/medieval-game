// prophet-panel.js
// Main entry point for The Daily Prophet overlay.
// Listens for zone:enter { id: 'potion-lab' } and opens the newspaper UI.

import './prophet-panel.css';
import { renderFrontPage, addStoryToEdition, isEditionFull } from './prophet-front-page.js';
import { openStoryCreator }         from './prophet-story-creator.js';
import { archiveStory, renderArchive, getStreak, todayKey } from './prophet-archive.js';
import { renderProphetAchievements, checkProphetAchievements } from './prophet-achievements.js';
import { dispatchProphetFullEdition, dispatchProphetStoryComplete } from './prophet-events.js';
import { initMorningEdition } from './prophet-morning-edition.js';

const KEY_STATS = 'hp_player_stats';
let _overlay    = null;
let _view       = 'front'; // 'front' | 'archive' | 'achievements'

// ── Public API ─────────────────────────────────────────────────────────────

export function initProphetPanel() {
  window.addEventListener('zone:enter', (e) => {
    if (e.detail?.id === 'potion-lab') openPanel();
  });
}

// ── Panel lifecycle ────────────────────────────────────────────────────────

function openPanel() {
  if (_overlay) return;

  // Track daily visit
  trackDailyVisit();

  _overlay = document.createElement('div');
  _overlay.id = 'dp-overlay';
  _overlay.innerHTML = `
    <div id="dp-panel">
      <div id="dp-nav">
        <div class="dp-nav-group">
          <button class="dp-nav-btn active" data-view="front">📰 Today</button>
          <button class="dp-nav-btn" data-view="archive">📜 Archive</button>
          <button class="dp-nav-btn" data-view="achievements">🏆 Achievements</button>
        </div>
        <button id="dp-close-btn">✕ Leave the Prophet</button>
      </div>
      <div id="dp-content"></div>
    </div>
  `;

  document.getElementById('ui-layer').appendChild(_overlay);

  _overlay.querySelector('#dp-close-btn').addEventListener('click', closePanel);

  // Click outside panel to close
  _overlay.addEventListener('click', (e) => {
    if (e.target === _overlay) closePanel();
  });

  // Nav tabs
  _overlay.querySelectorAll('.dp-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      _view = btn.dataset.view;
      _overlay.querySelectorAll('.dp-nav-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderView();
    });
  });

  _view = 'front';
  renderView();
}

function closePanel() {
  if (_overlay) {
    _overlay.remove();
    _overlay = null;
  }
}

// ── View renderer ──────────────────────────────────────────────────────────

function renderView() {
  const content = _overlay?.querySelector('#dp-content');
  if (!content) return;

  if (_view === 'front') {
    renderFrontPage(content, handleAddStory, () => { _view = 'archive'; renderView(); });
    initMorningEdition(content.querySelector('#dp-morning-wrap'), getStreak().current || 0);
  } else if (_view === 'archive') {
    content.innerHTML = '<div id="dp-archive-wrap"></div>';
    renderArchive(content.querySelector('#dp-archive-wrap'));
  } else if (_view === 'achievements') {
    content.innerHTML = '<div id="dp-ach-wrap"></div>';
    renderProphetAchievements(content.querySelector('#dp-ach-wrap'));
  }
}

// ── Story creation flow ────────────────────────────────────────────────────

function handleAddStory() {
  if (!_overlay) return;
  openStoryCreator(_overlay, (story) => {
    // Add to today's edition
    addStoryToEdition(story);

    // Archive it
    archiveStory(story);

    // Update stats
    const stats = loadStats();
    stats.stories_published = (stats.stories_published || 0) + 1;
    if (!story.fromFallback) stats.ai_headlines = (stats.ai_headlines || 0) + 1;

    // Night story check
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) stats.night_story = true;

    // Streak
    const streak = getStreak();
    stats.prophet_streak = streak.current;

    // Daily sessions
    stats.prophet_days = stats.prophet_days || {};
    stats.prophet_days[todayKey()] = true;

    // Full edition check
    if (isEditionFull()) {
      stats.full_editions = (stats.full_editions || 0) + 1;
      dispatchProphetFullEdition();
    }

    saveStats(stats);

    dispatchProphetStoryComplete(story);
    checkProphetAchievements();

    // Re-render front page
    renderView();
  });
}

// ── localStorage helpers ───────────────────────────────────────────────────

function loadStats() {
  try { return JSON.parse(localStorage.getItem(KEY_STATS) || '{}'); }
  catch { return {}; }
}

function saveStats(stats) {
  localStorage.setItem(KEY_STATS, JSON.stringify(stats));
}

function trackDailyVisit() {
  const stats = loadStats();
  stats.prophet_days = stats.prophet_days || {};
  stats.prophet_days[todayKey()] = true;
  saveStats(stats);
  checkProphetAchievements();
}
