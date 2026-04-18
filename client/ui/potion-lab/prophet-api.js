// prophet-api.js
// Calls Google Gemini API to generate dramatic HP-style newspaper content.
// Falls back to local templates if the API key is missing or the call fails.

const MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ── Fallback templates ─────────────────────────────────────────────────────

const HEADLINE_TEMPLATES = [
  'MINISTRY CONFIRMS: Scholar {goal} — Unprecedented Achievement Rocks Wizarding World',
  'BREAKING: Ancient Prophecy Fulfilled As Student Attempts {goal}',
  'EXCLUSIVE: {goal} — Daily Prophet Investigation Reveals Hidden Dangers',
  'SHOCK REVELATION: Dumbledore Himself Endorses Scholar\'s Quest To {goal}',
  'WIZENGAMOT IN UPROAR: Is {goal} Legal Under Current Decree 9¾?',
  'AUROR DIVISION BAFFLED: Evidence Suggests Student Has Already Begun To {goal}',
  'HOGWARTS IN CHAOS: Sorting Hat Refuses To Act Until Scholar Can {goal}',
  'SECRET FILES LEAKED: Voldemort\'s Biggest Fear Was Always Someone Who Could {goal}',
  'SPECIAL REPORT: Three Broomsticks Patrons Divided On Whether {goal} Is Possible',
  'EXCLUSIVE INTERVIEW: Centaurs Predicted This — The Scholar Who Will {goal}',
];

const BODY_TEMPLATES = [
  'Sources close to the Headmaster have confirmed that the situation surrounding {goal} has reached a critical juncture. "We haven\'t seen dedication like this since the days of the Founders," remarked a portrait in the corridor, declining to give their name. Hogwarts staff are said to be monitoring the situation closely.',
  'Our correspondent at the Ministry reports that several departments have convened emergency meetings to discuss the implications of {goal}. The Department of Mysteries has sealed its records. Owls delivering the Prophet were seen circling Azkaban for reasons that remain unclear.',
  'In what Daily Prophet sources describe as "the most dramatic development since You-Know-Who\'s first defeat," a young scholar has committed fully to {goal}. Madam Pomfrey has reportedly stocked extra supplies. The Fat Lady has changed her portrait\'s background to something "more dramatic."',
  'Witnesses describe an atmosphere of barely contained excitement as efforts toward {goal} continue. "I\'ve seen a lot in my three hundred years," said a nearby ghost, visibly shaken. Peeves was unavailable for comment, having been temporarily banished to the dungeon.',
  'The implications of {goal} extend far beyond the castle walls, insiders warn. Several Hogwarts ghosts have begun holding impromptu conferences on the matter. The castle staircases, typically capricious, have reportedly been cooperating with unusual reliability.',
];

function pickTemplate(templates, goal) {
  const tmpl = templates[Math.floor(Math.random() * templates.length)];
  return tmpl.replace(/\{goal\}/gi, goal);
}

// ── API helper ─────────────────────────────────────────────────────────────

function getApiKey() {
  return import.meta.env?.VITE_GEMINI_API_KEY || '';
}

async function callGemini(systemPrompt, userMessage) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key');

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.9 },
    }),
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a dramatic headline for the given goal.
 * Returns { headline: string, fromFallback: boolean }
 */
export async function generateHeadline(goal) {
  const system = `You are the headline writer for The Daily Prophet, the wizarding world's most dramatic newspaper.
Write ONE sensational, all-caps headline in the style of a Harry Potter newspaper headline for the student's goal below.
Rules:
- Maximum 120 characters
- Must include a colon or em-dash to separate the hook from the detail
- Reference at least one HP element (Ministry, Hogwarts, Aurors, Dumbledore, etc.)
- Return ONLY the headline text, no quotes, no punctuation at end`;

  try {
    const headline = await callGemini(system, `Student goal: ${goal}`);
    if (headline && headline.length > 10) {
      return { headline, fromFallback: false };
    }
    throw new Error('Empty response');
  } catch {
    return { headline: pickTemplate(HEADLINE_TEMPLATES, goal), fromFallback: true };
  }
}

/**
 * Generate a full story (headline + body paragraphs) for the given goal.
 * Returns { headline, body, subheadline, fromFallback }
 */
export async function generateStory(goal) {
  const system = `You are a reporter for The Daily Prophet, the wizarding world's most sensational newspaper.
Generate a dramatic newspaper story about a student's goal/task. Format your response EXACTLY as:
HEADLINE: [all-caps dramatic headline, max 120 chars, include HP reference]
SUBHEADLINE: [italic teaser sentence, max 80 chars]
BODY: [2 short dramatic paragraphs, ~60 words each, HP style, reference the goal naturally]

Rules:
- Reference Hogwarts, Ministry, or other HP elements
- Be dramatic but not mean
- The goal is the student's REAL task being treated as world-shaking news
- No placeholders — write the actual content`;

  try {
    const raw = await callGemini(system, `Student goal: ${goal}`);
    const headline    = raw.match(/^HEADLINE:\s*(.+)$/m)?.[1]?.trim() || pickTemplate(HEADLINE_TEMPLATES, goal);
    const subheadline = raw.match(/^SUBHEADLINE:\s*(.+)$/m)?.[1]?.trim() || '';
    const bodyMatch   = raw.match(/^BODY:\s*([\s\S]+)$/m);
    const body        = bodyMatch?.[1]?.trim() || pickTemplate(BODY_TEMPLATES, goal);
    return { headline, subheadline, body, fromFallback: false };
  } catch {
    return {
      headline:    pickTemplate(HEADLINE_TEMPLATES, goal),
      subheadline: 'Our correspondent has obtained exclusive details.',
      body:        pickTemplate(BODY_TEMPLATES, goal),
      fromFallback: true,
    };
  }
}
