// prophet-front-page.js
// Renders the newspaper front page with up to 5 story slots.

const KEY_TODAY = 'hp_prophet_today';

// ── Public API ─────────────────────────────────────────────────────────────

/** Add a story to today's edition (max 5 total: 1 lead, 2 secondary, 2 brief). */
export function addStoryToEdition(story) {
  const today = getTodayEdition();

  // Enforce slot limits
  const countByType = (type) => today.filter((s) => s.type === type).length;

  let placed = false;
  if (story.type === 'lead' && countByType('lead') < 1) {
    today.unshift({ ...story });
    placed = true;
  } else if (story.type === 'secondary' && countByType('secondary') < 2) {
    const leadIdx = today.findIndex((s) => s.type !== 'lead');
    today.splice(leadIdx === -1 ? today.length : leadIdx + 1, 0, { ...story });
    placed = true;
  } else if (story.type === 'brief' && countByType('brief') < 2) {
    today.push({ ...story });
    placed = true;
  } else {
    // Auto-downgrade: try secondary then brief
    if (story.type === 'lead' && countByType('secondary') < 2) {
      story.type = 'secondary';
      return addStoryToEdition(story);
    }
    if (countByType('brief') < 2) {
      story.type = 'brief';
      today.push({ ...story });
      placed = true;
    }
  }

  if (placed) saveTodayEdition(today);
  return placed;
}

/** Return true if all 5 slots are filled. */
export function isEditionFull() {
  const today = getTodayEdition();
  const lead      = today.filter((s) => s.type === 'lead').length;
  const secondary = today.filter((s) => s.type === 'secondary').length;
  const brief     = today.filter((s) => s.type === 'brief').length;
  return lead >= 1 && secondary >= 2 && brief >= 2;
}

/** Get today's stories. */
export function getTodayEdition() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_TODAY) || '{}');
    // Invalidate if saved on a different day
    if (raw.dateKey !== new Date().toISOString().slice(0, 10)) return [];
    return raw.stories || [];
  } catch { return []; }
}

/** Clear today's edition (used for testing). */
export function clearTodayEdition() {
  localStorage.removeItem(KEY_TODAY);
}

/** Render the full front page into a container. */
export function renderFrontPage(container, onAddStory, onViewArchive) {
  if (!container) return;
  const stories = getTodayEdition();
  const today   = new Date();
  const dateStr = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const lead      = stories.find((s) => s.type === 'lead');
  const secondary = stories.filter((s) => s.type === 'secondary');
  const briefs    = stories.filter((s) => s.type === 'brief');
  const full      = isEditionFull();

  container.innerHTML = `
    <div class="dp-front-page">
      <!-- Masthead -->
      <div class="dp-masthead">
        <div class="dp-masthead-motto">Salerio · Azkabanus · Veritatis</div>
        <div class="dp-masthead-title">The Daily Prophet</div>
        <div class="dp-masthead-date">${escHtml(dateStr)} · One Knut</div>
      </div>
      <div class="dp-masthead-rule"></div>

      <!-- Morning Edition — populated async by initMorningEdition() in prophet-panel.js -->
      <div id="dp-morning-wrap"></div>

      <!-- Add story / archive controls -->
      <div class="dp-controls-bar">
        ${!full
          ? `<button class="dp-btn-add" id="dp-add-story-btn">✒️ Submit a Story</button>`
          : `<div class="dp-edition-full">📰 Today's edition is complete!</div>`}
        <button class="dp-btn-archive" id="dp-archive-btn">📜 Archive</button>
      </div>

      <!-- Lead story -->
      <div class="dp-lead-slot ${lead ? '' : 'empty'}">
        ${lead ? buildLeadStory(lead) : buildEmptySlot('lead', 'Lead Story')}
      </div>

      <!-- Secondary + Briefs row -->
      <div class="dp-lower-row">
        <div class="dp-secondary-col">
          ${secondary[0] ? buildSecondaryStory(secondary[0]) : buildEmptySlot('secondary', 'Secondary Story')}
          ${secondary[1] ? buildSecondaryStory(secondary[1]) : buildEmptySlot('secondary', 'Secondary Story')}
        </div>
        <div class="dp-brief-col">
          <div class="dp-brief-header">In Brief</div>
          ${briefs[0] ? buildBrief(briefs[0]) : buildEmptyBrief()}
          ${briefs[1] ? buildBrief(briefs[1]) : buildEmptyBrief()}
        </div>
      </div>
    </div>
  `;

  container.querySelector('#dp-add-story-btn')?.addEventListener('click', onAddStory);
  container.querySelector('#dp-archive-btn')?.addEventListener('click', onViewArchive);
}

// ── Story renderers ────────────────────────────────────────────────────────

function buildLeadStory(s) {
  return `
    <div class="dp-story dp-story-lead">
      <div class="dp-story-kicker">LEAD STORY</div>
      <div class="dp-story-headline ink-reveal">${escHtml(s.headline)}</div>
      ${s.subheadline ? `<div class="dp-story-sub ink-reveal" style="animation-delay:0.4s">${escHtml(s.subheadline)}</div>` : ''}
      <div class="dp-story-photo">
        <div class="dp-moving-photo"></div>
      </div>
      <div class="dp-story-body ink-reveal" style="animation-delay:0.8s">${formatBody(s.body)}</div>
      <div class="dp-story-byline">By Our Own Correspondent · ${escHtml(s.goal)}</div>
    </div>
  `;
}

function buildSecondaryStory(s) {
  return `
    <div class="dp-story dp-story-secondary">
      <div class="dp-story-kicker">REPORT</div>
      <div class="dp-story-headline ink-reveal">${escHtml(s.headline)}</div>
      ${s.subheadline ? `<div class="dp-story-sub">${escHtml(s.subheadline)}</div>` : ''}
      <div class="dp-story-body ink-reveal" style="animation-delay:0.3s">${formatBody(firstParagraph(s.body))}</div>
      <div class="dp-story-byline">Goal: ${escHtml(s.goal)}</div>
    </div>
  `;
}

function buildBrief(s) {
  return `
    <div class="dp-brief-item">
      <div class="dp-brief-headline">${escHtml(s.headline)}</div>
      <div class="dp-brief-goal">Re: ${escHtml(s.goal)}</div>
    </div>
  `;
}

function buildEmptySlot(type, label) {
  return `
    <div class="dp-story dp-story-${type} dp-story-empty">
      <div class="dp-empty-slot-label">${label}</div>
      <div class="dp-empty-slot-hint">Submit a story to fill this slot</div>
    </div>
  `;
}

function buildEmptyBrief() {
  return `
    <div class="dp-brief-item dp-brief-empty">
      <div class="dp-empty-slot-hint">No brief yet</div>
    </div>
  `;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function saveTodayEdition(stories) {
  localStorage.setItem(KEY_TODAY, JSON.stringify({
    dateKey: new Date().toISOString().slice(0, 10),
    stories,
  }));
}

function formatBody(text) {
  return escHtml(text).replace(/\n\n/g, '</p><p class="dp-para">').replace(/\n/g, ' ');
}

function firstParagraph(text) {
  return (text || '').split('\n\n')[0];
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
