// client/src/ui/MagicHUD.js
// Magical bottom-left HUD (house badge + active spell selector + hints) and
// first-launch house selection modal.

const HOUSE_DATA = {
  gryffindor: { color: '#ae0001', accent: '#f0c040', symbol: '🦁', motto: 'Bravery & Courage'  },
  slytherin:  { color: '#1a6b2f', accent: '#aaaaaa', symbol: '🐍', motto: 'Ambition & Cunning' },
  ravenclaw:  { color: '#0e1a6e', accent: '#946b2d', symbol: '🦅', motto: 'Wit & Wisdom'        },
  hufflepuff: { color: '#d3a010', accent: '#372e29', symbol: '🦡', motto: 'Loyalty & Patience'  },
};

export function initMagicHUD() {
  _buildHUD();

  if (!localStorage.getItem('hp-house')) {
    setTimeout(_showHouseSelect, 800);
  }

  // E cycles spell — update the active-spell display
  window.addEventListener('spell:select', (e) => {
    const nameEl  = document.getElementById('hud-active-spell');
    const dotsEl  = document.getElementById('hud-spell-dots');
    if (!nameEl) return;

    const hex = '#' + e.detail.color.toString(16).padStart(6, '0');
    nameEl.textContent = e.detail.name;
    nameEl.style.color = hex;
    nameEl.style.textShadow = `0 0 10px ${hex}55`;

    // Re-trigger cycle flash
    nameEl.classList.remove('hud-spell-flash');
    void nameEl.offsetWidth;
    nameEl.classList.add('hud-spell-flash');

    // Update pip dots
    if (dotsEl) {
      dotsEl.innerHTML = Array.from({ length: e.detail.total }, (_, i) =>
        `<span class="hud-dot${i === e.detail.index ? ' hud-dot-active' : ''}"
               style="${i === e.detail.index ? `background:${hex}` : ''}"></span>`
      ).join('');
    }
  });

  // Q casts spell — brief cast flash on the spell name
  window.addEventListener('spell:cast', () => {
    const nameEl = document.getElementById('hud-active-spell');
    if (!nameEl) return;
    nameEl.classList.remove('hud-spell-cast');
    void nameEl.offsetWidth;
    nameEl.classList.add('hud-spell-cast');
  });
}

// ── HUD panel ──────────────────────────────────────────────────────────────
function _buildHUD() {
  document.getElementById('magic-hud')?.remove();
  const house = localStorage.getItem('hp-house') || 'gryffindor';
  const hd    = HOUSE_DATA[house];

  const hud = document.createElement('div');
  hud.id = 'magic-hud';
  hud.style.setProperty('--hc', hd.color);
  hud.style.setProperty('--ha', hd.accent);
  hud.innerHTML = `
    <div class="hud-house">
      <span class="hud-house-symbol">${hd.symbol}</span>
      <div class="hud-house-info">
        <span class="hud-house-name">${house[0].toUpperCase() + house.slice(1)}</span>
        <span class="hud-house-motto">${hd.motto}</span>
      </div>
    </div>
    <div class="hud-rule"></div>
    <div class="hud-spell-section">
      <div class="hud-spell-header">
        <span class="hud-label">Active Spell</span>
        <div id="hud-spell-dots" class="hud-dots"></div>
      </div>
      <span id="hud-active-spell" class="hud-spell-name">—</span>
    </div>
    <div class="hud-rule"></div>
    <div class="hud-hints">
      <span class="hud-key">E</span><span class="hud-hint-text">Cycle</span>
      <span class="hud-key">Q</span><span class="hud-hint-text">Cast</span>
      <span class="hud-key">ENTER</span><span class="hud-hint-text">Enter</span>
    </div>
  `;
  document.getElementById('ui-layer').appendChild(hud);
}

// ── House selection modal ──────────────────────────────────────────────────
function _showHouseSelect() {
  const overlay = document.createElement('div');
  overlay.id = 'house-select-overlay';
  overlay.innerHTML = `
    <div id="house-select-modal">
      <div class="hs-runes">ᚹ ᚻ ᚫ ᚾ ᚣ ᚦ ᛟ ᚱ</div>
      <h2 class="hs-title">Choose Your House</h2>
      <p class="hs-sub">Your house shapes your magical aura in the world.</p>
      <div class="hs-grid">
        ${Object.entries(HOUSE_DATA).map(([key, h]) => `
          <button class="hs-btn" data-house="${key}"
            style="--hc:${h.color};--ha:${h.accent}">
            <span class="hs-symbol">${h.symbol}</span>
            <span class="hs-name">${key[0].toUpperCase() + key.slice(1)}</span>
            <span class="hs-motto">${h.motto}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.hs-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const house = btn.dataset.house;
      localStorage.setItem('hp-house', house);
      overlay.classList.add('hs-exit');
      setTimeout(() => {
        overlay.remove();
        _buildHUD();
        window.dispatchEvent(new CustomEvent('house:selected', { detail: { house } }));
      }, 550);
    });
  });
}
