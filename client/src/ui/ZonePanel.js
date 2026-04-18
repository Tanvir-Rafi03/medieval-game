// client/src/ui/ZonePanel.js
// Medieval Harry Potter themed zone panel.
// Opens when the player clicks a building zone.
// Styled as a parchment scroll with gold trim and Cinzel font.

export function initZonePanel() {
  const uiLayer = document.getElementById('ui-layer');

  // Inject panel styles
  const style = document.createElement('style');
  style.textContent = `
    /* ── Keyframes ────────────────────────────────────────────────────────── */
    @keyframes zp-border-breathe {
      0%, 100% {
        box-shadow:
          0 0 0 1px #6b4e1a,
          0 12px 40px rgba(0,0,0,0.85),
          0 0 20px rgba(201,168,76,0.12),
          inset 0 1px 0 rgba(201,168,76,0.3);
      }
      50% {
        box-shadow:
          0 0 0 1px #8a6424,
          0 12px 50px rgba(0,0,0,0.85),
          0 0 38px rgba(201,168,76,0.28),
          inset 0 1px 0 rgba(201,168,76,0.4);
      }
    }
    @keyframes zp-seal-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(139,26,26,0), 0 2px 8px rgba(0,0,0,0.7); }
      50%       { box-shadow: 0 0 0 5px rgba(139,26,26,0.25), 0 2px 12px rgba(0,0,0,0.7); }
    }
    @keyframes zp-shimmer {
      0%   { left: -100%; }
      100% { left: 160%; }
    }
    @keyframes zp-corner-glow {
      0%, 100% { opacity: 0.5; }
      50%       { opacity: 1; }
    }
    @keyframes zp-dust {
      0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0.6; }
      100% { transform: translateY(-50px) translateX(var(--dx, 8px)) scale(0); opacity: 0; }
    }
    @keyframes zp-strip-shimmer {
      0%   { background-position: -300% center; }
      100% { background-position: 300% center; }
    }

    /* ── Panel shell ──────────────────────────────────────────────────────── */
    #zone-panel {
      position: absolute;
      bottom: 36px;
      left: 50%;
      transform: translateX(-50%) translateY(24px) scale(0.97);
      width: 400px;
      pointer-events: auto;
      display: none;
      z-index: 30;
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.16,1,0.3,1),
                  transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    #zone-panel.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0px) scale(1);
    }

    /* ── Main scroll card ─────────────────────────────────────────────────── */
    .zp-scroll {
      background:
        linear-gradient(160deg, rgba(44,31,14,0.97) 0%, rgba(26,18,5,0.98) 60%, rgba(37,24,8,0.97) 100%),
        url('/assets/stone-rune-texture.jpg') center/180px repeat;
      border: 2px solid #c9a84c;
      border-radius: 8px;
      padding: 0;
      overflow: hidden;
      box-shadow:
        0 0 0 1px #6b4e1a,
        0 12px 40px rgba(0,0,0,0.85),
        0 0 20px rgba(201,168,76,0.12),
        inset 0 1px 0 rgba(201,168,76,0.3);
      position: relative;
      animation: zp-border-breathe 3.5s ease-in-out infinite;
    }
    #zone-panel.visible .zp-scroll {
      animation: zp-border-breathe 3.5s ease-in-out infinite;
    }

    /* Gold stripe top */
    .zp-scroll::before {
      content: '';
      display: block;
      height: 3px;
      background: repeating-linear-gradient(
        90deg,
        #c9a84c 0px, #c9a84c 6px,
        #6b4e1a 6px, #6b4e1a 8px
      );
      background-size: 300% 100%;
      animation: zp-strip-shimmer 4s linear infinite;
    }
    /* Gold stripe bottom */
    .zp-scroll::after {
      content: '';
      display: block;
      height: 3px;
      background: repeating-linear-gradient(
        90deg,
        #c9a84c 0px, #c9a84c 6px,
        #6b4e1a 6px, #6b4e1a 8px
      );
      background-size: 300% 100%;
      animation: zp-strip-shimmer 4s linear infinite reverse;
    }

    /* ── Corner rune ornaments ────────────────────────────────────────────── */
    .zp-corner {
      position: absolute;
      width: 18px;
      height: 18px;
      z-index: 2;
      pointer-events: none;
      animation: zp-corner-glow 3.5s ease-in-out infinite;
    }
    .zp-corner svg { width: 100%; height: 100%; }
    .zp-corner-tl { top: 8px;  left: 8px; }
    .zp-corner-tr { top: 8px;  right: 8px;  transform: scaleX(-1); }
    .zp-corner-bl { bottom: 8px; left: 8px; transform: scaleY(-1); }
    .zp-corner-br { bottom: 8px; right: 8px; transform: scale(-1,-1); }

    /* ── Wax seal ─────────────────────────────────────────────────────────── */
    .zp-seal {
      position: absolute;
      top: -18px;
      left: 50%;
      transform: translateX(-50%);
      width: 36px;
      height: 36px;
      background: radial-gradient(circle at 40% 35%, #c0372a, #8b1a1a 50%, #5a0f0f);
      border-radius: 50%;
      border: 2px solid #c9a84c;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.7);
      animation: zp-seal-pulse 2.5s ease-in-out infinite;
      z-index: 5;
    }
    .zp-seal svg { width: 18px; height: 18px; }

    /* ── Header ───────────────────────────────────────────────────────────── */
    .zp-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 22px 20px 12px;
      border-bottom: 1px solid rgba(201,168,76,0.25);
    }
    .zp-icon {
      font-size: 36px;
      line-height: 1;
      filter: drop-shadow(0 0 8px rgba(201,168,76,0.6));
      transition: filter 0.3s, transform 0.3s;
    }
    #zone-panel.visible .zp-icon {
      animation: zp-corner-glow 2.5s ease-in-out infinite;
    }
    .zp-title-block { flex: 1; min-width: 0; }
    .zp-name {
      font-family: 'Cinzel', serif;
      font-size: 16px;
      font-weight: 700;
      color: #c9a84c;
      letter-spacing: 0.06em;
      text-shadow: 0 0 16px rgba(201,168,76,0.5);
      line-height: 1.2;
    }
    .zp-subtitle {
      font-family: 'Cinzel', serif;
      font-size: 9px;
      color: #8a6b2a;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin-top: 3px;
    }

    /* ── Divider ──────────────────────────────────────────────────────────── */
    .zp-divider {
      height: 1px;
      margin: 0 20px;
      background: linear-gradient(90deg, transparent, #c9a84c66, transparent);
    }

    /* ── Body ─────────────────────────────────────────────────────────────── */
    .zp-body { padding: 14px 20px 18px; }
    .zp-desc {
      font-family: 'Georgia', serif;
      font-size: 12px;
      line-height: 1.8;
      color: #d4b483;
      margin-bottom: 16px;
    }
    .zp-actions { display: flex; gap: 10px; }

    /* ── Enter button with shimmer ────────────────────────────────────────── */
    .zp-btn-enter {
      flex: 1;
      padding: 11px 16px;
      background: linear-gradient(135deg, #c9a84c, #a07828);
      color: #1a0f00;
      border: none;
      border-radius: 4px;
      font-family: 'Cinzel', serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      cursor: pointer;
      text-transform: uppercase;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
      transition: filter 0.15s, transform 0.12s, box-shadow 0.15s;
      position: relative;
      overflow: hidden;
    }
    .zp-btn-enter::after {
      content: '';
      position: absolute;
      top: 0; bottom: 0;
      width: 40%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
      left: -100%;
      transition: none;
    }
    .zp-btn-enter:hover { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 12px rgba(201,168,76,0.3); }
    .zp-btn-enter:hover::after { animation: zp-shimmer 0.55s ease forwards; }
    .zp-btn-enter:active { transform: translateY(0); filter: brightness(0.97); }

    /* ── Close button ─────────────────────────────────────────────────────── */
    .zp-btn-close {
      padding: 11px 14px;
      background: transparent;
      color: #c9a84c;
      border: 1px solid #c9a84c44;
      border-radius: 4px;
      font-family: 'Cinzel', serif;
      font-size: 13px;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s, background 0.15s;
    }
    .zp-btn-close:hover { border-color: #c9a84c88; color: #f0d89a; background: rgba(201,168,76,0.06); }

    /* ── Floating dust particles ─────────────────────────────────────────── */
    .zp-dust {
      position: absolute;
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: #c9a84c;
      pointer-events: none;
      bottom: 10px;
      opacity: 0;
      animation: zp-dust 2.5s ease-out infinite;
    }
    .zp-dust:nth-child(1) { left: 15%; animation-delay: 0s;    --dx: 6px; }
    .zp-dust:nth-child(2) { left: 35%; animation-delay: 0.7s;  --dx: -8px; }
    .zp-dust:nth-child(3) { left: 55%; animation-delay: 1.4s;  --dx: 5px; }
    .zp-dust:nth-child(4) { left: 75%; animation-delay: 0.35s; --dx: -4px; }
    .zp-dust:nth-child(5) { left: 88%; animation-delay: 1.1s;  --dx: 7px; }
  `;
  document.head.appendChild(style);

  // SVG corner rune ornament (L-shaped with rune dot)
  const cornerSVG = `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 16 L2 2 L16 2" stroke="#c9a84c" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
    <circle cx="2" cy="2" r="1.5" fill="#c9a84c" opacity="0.9"/>
    <path d="M6 2 L6 5" stroke="#c9a84c" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
    <path d="M10 2 L10 4" stroke="#c9a84c" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
  </svg>`;

  // SVG wax seal — Hogwarts-style H rune
  const sealSVG = `<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 3 L4 15 M14 3 L14 15 M4 9 L14 9" stroke="#c9a84c" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

  // Build panel DOM
  const panel = document.createElement('div');
  panel.id = 'zone-panel';
  panel.innerHTML = `
    <div class="zp-seal">${sealSVG}</div>
    <div class="zp-scroll">
      <span class="zp-dust"></span>
      <span class="zp-dust"></span>
      <span class="zp-dust"></span>
      <span class="zp-dust"></span>
      <span class="zp-dust"></span>
      <div class="zp-corner zp-corner-tl">${cornerSVG}</div>
      <div class="zp-corner zp-corner-tr">${cornerSVG}</div>
      <div class="zp-corner zp-corner-bl">${cornerSVG}</div>
      <div class="zp-corner zp-corner-br">${cornerSVG}</div>
      <div class="zp-header">
        <div class="zp-icon" id="zp-icon"></div>
        <div class="zp-title-block">
          <div class="zp-name" id="zp-name"></div>
          <div class="zp-subtitle" id="zp-subtitle">Diagon Alley · Est. 1678</div>
        </div>
      </div>
      <div class="zp-divider"></div>
      <div class="zp-body">
        <div class="zp-desc" id="zp-desc"></div>
        <div class="zp-actions">
          <button class="zp-btn-enter" id="zp-enter">Enter</button>
          <button class="zp-btn-close" id="zp-close">✕</button>
        </div>
      </div>
    </div>
  `;
  uiLayer.appendChild(panel);

  const show = (zone) => {
    document.getElementById('zp-icon').textContent    = zone.icon;
    document.getElementById('zp-name').textContent    = zone.name;
    document.getElementById('zp-desc').textContent    = zone.description;
    panel.dataset.zoneId = zone.id;
    panel.style.display = 'block';
    requestAnimationFrame(() => panel.classList.add('visible'));
  };

  const hide = () => {
    panel.classList.remove('visible');
    setTimeout(() => { panel.style.display = 'none'; }, 260);
  };

  document.getElementById('zp-close').addEventListener('click', hide);
  document.getElementById('zp-enter').addEventListener('click', () => {
    hide();
    window.dispatchEvent(new CustomEvent('zone:enter', { detail: { id: panel.dataset.zoneId } }));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  window.addEventListener('zone:open', (e) => show(e.detail));
}
