// prophet-morning-edition.js
// Fetches/renders the 3-part Morning Edition above story slots.
// Uses Gemini API exclusively — cached per day in localStorage.

import './prophet-morning-edition.css';

const KEY         = 'hp_morning_edition';
const KEY_STATS   = 'hp_player_stats';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const LETTER_SENDERS = {
  Monday:    'Professor Severus Snape',
  Tuesday:   'Hermione Granger',
  Wednesday: 'Ron Weasley',
  Thursday:  'Professor Minerva McGonagall',
  Friday:    'Fred and George Weasley',
  Saturday:  'Rubeus Hagrid',
  Sunday:    'Albus Dumbledore',
};

// ── Fallback content ───────────────────────────────────────────────────────

const WISDOM_FALLBACKS = [
  {
    quote:   'It is our choices that show what we truly are, far more than our abilities.',
    context: 'I have found, over many years, that the quiet moments of decision define us most.',
  },
  {
    quote:   'Happiness can be found even in the darkest of times, if one only remembers to turn on the light.',
    context: 'I have shared these words on many a difficult evening in this very office.',
  },
  {
    quote:   'It does not do to dwell on dreams and forget to live.',
    context: 'A young student reminded me of this truth once, without ever knowing they did so.',
  },
  {
    quote:   'We are only as strong as we are united, as weak as we are divided.',
    context: 'The greatest magic I ever witnessed was not a spell — it was a group of people choosing each other.',
  },
  {
    quote:   'To the well-organised mind, death is but the next great adventure.',
    context: 'And so too is every Monday morning, if you approach it with the right spirit.',
  },
  {
    quote:   'It takes a great deal of bravery to stand up to our enemies, but a great deal more to stand up to our friends.',
    context: 'Courage, I have learned, wears many disguises.',
  },
  {
    quote:   'The truth is a beautiful and terrible thing, and should therefore be treated with great caution.',
    context: 'I say this not to discourage honesty, but to encourage wisdom.',
  },
];

function buildFallback() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayN  = Math.floor((now - start) / 86400000);
  const wisdom = WISDOM_FALLBACKS[dayN % 7];

  return {
    date: todayStr(),
    dumbledore_wisdom: wisdom,
    owl_post: {
      sender:   'Albus Dumbledore',
      subject:  'A Note of Confidence, Delivered by Fawkes',
      body:     'Our owls appear to have been delayed by particularly stubborn storm clouds this morning, Adventurer — even the finest Hogwarts post has its difficult days. Consider this a reminder that persistence through disruption is itself a form of magic. A Slytherin who keeps going when conditions are imperfect is a Slytherin who will go very far indeed.',
      sign_off: 'With unwavering confidence in your potential, Albus Dumbledore, Headmaster',
    },
    ministry_decree: {
      decree_number:  'Ministry Wellness Directive No. 1',
      issued_by:      'Department of Magical Wellness and Vitality',
      decree_title:   'The Mandatory Hydration Order',
      decree_text:    'By order of the Ministry of Magic, all witches and wizards are hereby directed to consume no fewer than one full goblet of water immediately upon reading this decree. The Ministry has determined through extensive research that hydrated wizards cast significantly more effective spells.',
      penalty_clause: 'Non-compliance shall be noted in your permanent Hogwarts record.',
      reward_flavour: 'Earn the Vitality of a Well-Rested Prefect',
      xp:   10,
      gold: 5,
    },
    challenge_complete: false,
  };
}

// ── Gemini API ─────────────────────────────────────────────────────────────

function extractJSON(raw) {
  try { return JSON.parse(raw); }
  catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return null;
  }
}

async function fetchFromGemini(streak) {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || '';
  if (!apiKey) throw new Error('No Gemini API key');

  const dayOfWeek = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
  const sender    = LETTER_SENDERS[dayOfWeek] || 'Albus Dumbledore';
  const dateStr   = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr   = new Date().toLocaleTimeString();

  const fullPrompt = `You are generating content for a Harry Potter themed productivity app called The Daily Prophet.
The player is a Slytherin student named Adventurer.
Today is ${dayOfWeek}, ${dateStr}.
Current time: ${timeStr}
Player streak: ${streak} days writing in their Prophet.

Generate today's Morning Edition.
Return ONLY valid JSON, no markdown, no backticks, nothing else.

{
  "dumbledore_wisdom": {
    "quote": "A brand new quote written IN THE VOICE OF ALBUS DUMBLEDORE — wise, warm, slightly cryptic, about life, growth, ambition, or courage. Must sound authentically like Dumbledore. 2-3 sentences maximum. Do NOT use any real Dumbledore quotes.",
    "context": "One sentence from Dumbledore explaining when or why he is sharing this wisdom — sets the scene, e.g. 'I shared these words with a young student once, on an evening much like this one...'"
  },
  "owl_post": {
    "sender": "${sender}",
    "subject": "short letter subject line, max 8 words, written in character e.g. 'Regarding Your Progress This Week, Scholar' or 'Oi, Just Wanted to Say' or 'An Urgent Matter of Considerable Importance'",
    "body": "A personal letter of 3-4 sentences written ENTIRELY in ${sender}'s voice and personality. Must reference: the player being a Slytherin, something about ${dayOfWeek} energy (new week / midweek / end of week), a piece of real encouragement about studying or personal growth framed in wizarding language. Character voice guides: Snape: cold opener, backhanded compliment, secretly impressed, formal sign-off. Hermione: enthusiastic, references books or studying, warm but slightly bossy, proud of player. Ron: casual, funny, says mate or bloody hell, wholesome and genuine. McGonagall: formal, firm, fair, unexpectedly warm at the end. Fred and George: chaotic, jokes, rhymes or wordplay if possible, genuinely hype about the player. Hagrid: ALL CAPS for emphasis sometimes, big warm energy, compares player to a magical creature. Dumbledore: reflective, wise, references the greater journey of life, ends with something profound.",
    "sign_off": "Character-appropriate letter closing e.g. 'Yours in academic scrutiny, Professor S. Snape' or 'Don't forget to eat! — Hagrid' or 'Mischief managed — F&G'"
  },
  "ministry_decree": {
    "decree_number": "a fake official Ministry decree number e.g. 'Educational Decree No. 47' or 'Ministry Wellness Directive No. 12'",
    "issued_by": "a funny fake Ministry department name e.g. 'Department of Magical Wellness and Vitality' or 'Office for the Promotion of Productive Sorcery' or 'Committee for Everyday Enchantment'",
    "decree_title": "official-sounding title for the challenge, max 8 words, pompous Ministry style",
    "decree_text": "The challenge written as an official Ministry notice — pompous, over-formal, bureaucratic, slightly absurd. 2 sentences. The actual task must be a small achievable real-life action: drink water, go outside, stretch, tell someone something kind, read for 10 minutes, put phone down, rest, tidy your space, take 5 deep breaths, etc. But written as if it is the most important official decree ever issued.",
    "penalty_clause": "a funny fake penalty for non-compliance e.g. 'Failure to comply may result in temporary suspension of Quidditch privileges' or 'Non-compliance shall be noted in your permanent Hogwarts record'",
    "reward_flavour": "short wizarding style reward description for completing the decree",
    "xp": 25,
    "gold": 15
  }
}`;

  const res = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature:      0.95,
        maxOutputTokens:  500,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.status);
    throw new Error(`Gemini ${res.status}: ${err}`);
  }

  const data = await res.json();
  console.log('[MorningEdition] Raw Gemini response:', JSON.stringify(data, null, 2));

  const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsed = extractJSON(raw);

  if (!parsed) throw new Error('Could not parse Gemini JSON');
  console.log('[MorningEdition] Parsed shape:', parsed);
  return parsed;
}

// ── Cache logic ────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadCache() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
  catch { return null; }
}

function saveCache(edition) {
  localStorage.setItem(KEY, JSON.stringify(edition));
}

async function getEdition(streak) {
  const cached = loadCache();
  if (cached && cached.date === todayStr()) {
    console.log('[MorningEdition] Loaded from cache for', cached.date);
    return cached;
  }

  try {
    const geminiData = await fetchFromGemini(streak);
    const edition = {
      date:              todayStr(),
      dumbledore_wisdom: geminiData.dumbledore_wisdom,
      owl_post:          geminiData.owl_post,
      ministry_decree:   geminiData.ministry_decree,
      challenge_complete: false,
    };
    saveCache(edition);
    return edition;
  } catch (err) {
    console.warn('[MorningEdition] Gemini failed, using fallback:', err.message);
    const fallback = buildFallback();
    // Cache the fallback too so we don't hammer the API on every open
    saveCache(fallback);
    return fallback;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function initMorningEdition(container, streak = 0) {
  if (!container) return;
  renderLoading(container);
  const edition = await getEdition(streak);
  renderEdition(container, edition);
}

// ── Renderers ──────────────────────────────────────────────────────────────

function renderLoading(container) {
  container.innerHTML = `
    <div class="dp-me-section">
      <div class="dp-me-header">
        <div class="dp-me-rule"></div>
        <div class="dp-me-title">✦ MORNING EDITION ✦</div>
        <div class="dp-me-rule"></div>
      </div>
      <div class="dp-me-grid dp-me-loading">
        ${[0, 1, 2].map(() => `
          <div class="dp-me-skeleton">
            <div class="dp-skel-circle"></div>
            <div class="dp-skel-line"></div>
            <div class="dp-skel-line"></div>
            <div class="dp-skel-line short"></div>
            <div class="dp-skel-line"></div>
          </div>
        `).join('')}
      </div>
      <div class="dp-me-loading-text">The owls are en route with today's edition…</div>
    </div>
  `;
}

function renderEdition(container, edition) {
  const { dumbledore_wisdom: w, owl_post: o, ministry_decree: d } = edition;
  const completed = edition.challenge_complete || false;

  container.innerHTML = `
    <div class="dp-me-section">
      <div class="dp-me-header">
        <div class="dp-me-rule"></div>
        <div class="dp-me-title">✦ MORNING EDITION ✦</div>
        <div class="dp-me-rule"></div>
      </div>
      <div class="dp-me-grid">

        <!-- ── Column 1: Dumbledore's Wisdom ─────────────────── -->
        <div class="dp-me-col dp-wisdom-col">
          <div class="dp-me-col-header">Dumbledore's Daily Wisdom</div>
          <div class="dp-ad-avatar">AD</div>
          <div class="dp-quote-wrap">
            <div class="dp-quote-text">${escHtml(w.quote)}</div>
          </div>
          <div class="dp-quote-rule"></div>
          <div class="dp-quote-context">${escHtml(w.context)}</div>
        </div>

        <!-- ── Column 2: Owl Post ────────────────────────────── -->
        <div class="dp-me-col dp-owl-col">
          <div class="dp-me-col-header">Owl Post</div>
          <div class="dp-envelope">
            <div class="dp-env-body">
              <div class="dp-env-flap"></div>
            </div>
          </div>
          <div class="dp-owl-from">From the desk of ${escHtml(o.sender)}</div>
          <div class="dp-owl-subject">${escHtml(o.subject)}</div>
          <div class="dp-owl-body">${escHtml(o.body)}</div>
          <div class="dp-owl-seal">✦</div>
          <div class="dp-owl-signoff">${escHtml(o.sign_off)}</div>
        </div>

        <!-- ── Column 3: Ministry Decree ─────────────────────── -->
        <div class="dp-me-col dp-decree-col">
          <div class="dp-me-col-header">Ministry Decree</div>
          <div class="dp-decree-number">${escHtml(d.decree_number)}</div>
          <div class="dp-decree-issuedby">Issued by the ${escHtml(d.issued_by)}</div>
          <div class="dp-decree-title">${escHtml(d.decree_title)}</div>
          <div class="dp-decree-body">${escHtml(d.decree_text)}</div>
          <div class="dp-decree-dash"></div>
          <div class="dp-decree-penalty">${escHtml(d.penalty_clause)}</div>
          <div class="dp-decree-reward">${escHtml(d.reward_flavour)}</div>
          <div class="dp-decree-badges">
            <span class="dp-badge xp">⚡ +${d.xp} XP</span>
            <span class="dp-badge gold">✦ +${d.gold} Gold</span>
          </div>
          <button class="dp-comply-btn${completed ? ' honoured' : ''}"
                  id="dp-comply-btn" ${completed ? 'disabled' : ''}>
            ${completed ? '✓ Decree Honoured' : '✓ Comply with Decree'}
          </button>
        </div>

      </div>
    </div>
  `;

  if (!completed) {
    container.querySelector('#dp-comply-btn')?.addEventListener('click', () => {
      completeChallenge(container, edition);
    });
  }
}

// ── Challenge completion ───────────────────────────────────────────────────

function completeChallenge(container, edition) {
  const d = edition.ministry_decree;

  // Award XP + gold
  const stats = loadStats();
  stats.xp   = (stats.xp   || 0) + (d.xp   || 0);
  stats.gold = (stats.gold || 0) + (d.gold || 0);
  saveStats(stats);

  // Persist so button stays honoured for the rest of the day
  edition.challenge_complete = true;
  saveCache(edition);

  // Update button immediately
  const btn = container.querySelector('#dp-comply-btn');
  if (btn) {
    btn.textContent = '✓ Decree Honoured';
    btn.disabled    = true;
    btn.classList.add('honoured');
  }

  // Tell Phaser world to celebrate
  window.dispatchEvent(new CustomEvent('morningChallengeComplete', {
    detail: { xp: d.xp || 0, gold: d.gold || 0 },
  }));
}

// ── localStorage helpers ───────────────────────────────────────────────────

function loadStats() {
  try { return JSON.parse(localStorage.getItem(KEY_STATS) || '{}'); }
  catch { return {}; }
}

function saveStats(stats) {
  localStorage.setItem(KEY_STATS, JSON.stringify(stats));
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
