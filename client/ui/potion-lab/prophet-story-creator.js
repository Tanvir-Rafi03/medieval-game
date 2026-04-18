// prophet-story-creator.js
// 3-step modal: (1) goal input → (2) loading ink animation → (3) preview + edit.

import { generateStory }               from './prophet-api.js';
import { dispatchProphetStoryWritten, dispatchProphetHeadlineReady } from './prophet-events.js';

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Open the story creator modal inside `overlay`.
 * `onComplete(story)` is called when the user saves the story.
 */
export function openStoryCreator(overlay, onComplete) {
  const modal = document.createElement('div');
  modal.className = 'dp-modal-backdrop';
  modal.innerHTML = buildStep1();
  overlay.appendChild(modal);

  wireStep1(modal, onComplete);
}

// ── Step 1: Goal input ─────────────────────────────────────────────────────

function buildStep1() {
  return `
    <div class="dp-modal">
      <div class="dp-modal-header">
        <div class="dp-modal-title">Submit Your Story</div>
        <div class="dp-modal-sub">Tell the Prophet what you're working on today</div>
      </div>
      <div class="dp-modal-body">
        <label class="dp-label">Your goal or task today</label>
        <textarea class="dp-goal-input" id="dp-goal-input"
          placeholder="e.g. Finish chapter 3 of my Potions essay on the properties of Bezoars…"
          rows="4" maxlength="300"></textarea>
        <div class="dp-char-count"><span id="dp-char-count">0</span>/300</div>

        <label class="dp-label" style="margin-top:12px">Story type</label>
        <div class="dp-story-type-row" id="dp-type-row">
          <button class="dp-type-btn active" data-type="lead">Lead Story</button>
          <button class="dp-type-btn" data-type="secondary">Secondary</button>
          <button class="dp-type-btn" data-type="brief">Brief</button>
        </div>
      </div>
      <div class="dp-modal-footer">
        <button class="dp-btn-cancel" id="dp-cancel-btn">Cancel</button>
        <button class="dp-btn-submit" id="dp-submit-btn">Write the Story ✒️</button>
      </div>
    </div>
  `;
}

function wireStep1(modal, onComplete) {
  let selectedType = 'lead';
  const goalInput  = modal.querySelector('#dp-goal-input');
  const charCount  = modal.querySelector('#dp-char-count');

  goalInput.addEventListener('input', () => {
    charCount.textContent = goalInput.value.length;
  });

  modal.querySelectorAll('.dp-type-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.dp-type-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
    });
  });

  modal.querySelector('#dp-cancel-btn').addEventListener('click', () => modal.remove());

  modal.querySelector('#dp-submit-btn').addEventListener('click', async () => {
    const goal = goalInput.value.trim();
    if (!goal) { goalInput.focus(); return; }

    dispatchProphetStoryWritten(goal);
    showStep2(modal);

    try {
      const story = await generateStory(goal);
      story.goal      = goal;
      story.type      = selectedType;
      story.dateKey   = new Date().toISOString().slice(0, 10);
      story.id        = `dp_${Date.now()}`;
      dispatchProphetHeadlineReady(story.headline);
      showStep3(modal, story, onComplete);
    } catch {
      showError(modal);
    }
  });
}

// ── Step 2: Loading ────────────────────────────────────────────────────────

function showStep2(modal) {
  modal.querySelector('.dp-modal').innerHTML = `
    <div class="dp-modal-header">
      <div class="dp-modal-title">The Quill Is Writing…</div>
    </div>
    <div class="dp-modal-body dp-loading-body">
      <div class="dp-quill-anim">✒️</div>
      <div class="dp-loading-lines">
        <div class="dp-loading-line" style="animation-delay:0s"></div>
        <div class="dp-loading-line" style="animation-delay:0.3s"></div>
        <div class="dp-loading-line" style="animation-delay:0.6s"></div>
        <div class="dp-loading-line short" style="animation-delay:0.9s"></div>
      </div>
      <div class="dp-loading-text">Consulting the Ministry archives…</div>
    </div>
  `;
}

// ── Step 3: Preview + edit ─────────────────────────────────────────────────

function showStep3(modal, story, onComplete) {
  modal.querySelector('.dp-modal').innerHTML = `
    <div class="dp-modal-header">
      <div class="dp-modal-title">Preview Your Story</div>
      <div class="dp-modal-sub">Edit before publishing to the front page</div>
    </div>
    <div class="dp-modal-body">
      <label class="dp-label">Headline <span class="dp-ai-badge">${story.fromFallback ? '📝 template' : '✨ Gemini'}</span></label>
      <input class="dp-edit-headline" id="dp-edit-headline" value="${escHtml(story.headline)}" maxlength="150">

      <label class="dp-label" style="margin-top:10px">Sub-headline</label>
      <input class="dp-edit-sub" id="dp-edit-sub" value="${escHtml(story.subheadline || '')}" maxlength="120"
             placeholder="Brief teaser…">

      <label class="dp-label" style="margin-top:10px">Story body</label>
      <textarea class="dp-edit-body" id="dp-edit-body" rows="5">${escHtml(story.body)}</textarea>

      <label class="dp-label" style="margin-top:10px">Story type</label>
      <div class="dp-story-type-row" id="dp-type-row-preview">
        ${['lead','secondary','brief'].map((t) =>
          `<button class="dp-type-btn ${t === story.type ? 'active' : ''}" data-type="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`
        ).join('')}
      </div>
    </div>
    <div class="dp-modal-footer">
      <button class="dp-btn-cancel" id="dp-back-btn">← Back</button>
      <button class="dp-btn-submit" id="dp-publish-btn">Publish 📰</button>
    </div>
  `;

  modal.querySelectorAll('#dp-type-row-preview .dp-type-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('#dp-type-row-preview .dp-type-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      story.type = btn.dataset.type;
    });
  });

  modal.querySelector('#dp-back-btn').addEventListener('click', () => {
    modal.querySelector('.dp-modal').innerHTML = buildStep1();
    wireStep1(modal, onComplete);
  });

  modal.querySelector('#dp-publish-btn').addEventListener('click', () => {
    const finalStory = {
      ...story,
      headline:    modal.querySelector('#dp-edit-headline').value.trim() || story.headline,
      subheadline: modal.querySelector('#dp-edit-sub').value.trim(),
      body:        modal.querySelector('#dp-edit-body').value.trim() || story.body,
    };

    // Track if user edited the headline
    if (finalStory.headline !== story.headline) {
      try {
        const stats = JSON.parse(localStorage.getItem('hp_player_stats') || '{}');
        stats.headlines_edited = (stats.headlines_edited || 0) + 1;
        localStorage.setItem('hp_player_stats', JSON.stringify(stats));
      } catch {}
    }

    modal.remove();
    onComplete(finalStory);
  });
}

function showError(modal) {
  modal.querySelector('.dp-modal').innerHTML = `
    <div class="dp-modal-header">
      <div class="dp-modal-title">The Quill Has Failed</div>
    </div>
    <div class="dp-modal-body" style="text-align:center;padding:24px">
      <div style="font-size:32px">🪶</div>
      <p style="color:#5a4a2a;margin-top:8px">The owl carrying your story was intercepted by Dementors.<br>
      Please check your API key or try again.</p>
    </div>
    <div class="dp-modal-footer">
      <button class="dp-btn-submit" id="dp-close-err">Close</button>
    </div>
  `;
  modal.querySelector('#dp-close-err').addEventListener('click', () => modal.remove());
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
