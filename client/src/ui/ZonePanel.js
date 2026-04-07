// client/src/ui/ZonePanel.js
// Medieval Harry Potter themed zone panel.
// Opens when the player clicks a building zone.
// Styled as a parchment scroll with gold trim and Cinzel font.

export function initZonePanel() {
  const uiLayer = document.getElementById('ui-layer');

  // Inject panel styles
  const style = document.createElement('style');
  style.textContent = `
    #zone-panel {
      position: absolute;
      bottom: 36px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      width: 380px;
      pointer-events: auto;
      display: none;
      z-index: 30;
      opacity: 0;
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    #zone-panel.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0px);
    }
    .zp-scroll {
      background: linear-gradient(160deg, #2c1f0e 0%, #1a1205 60%, #251808 100%);
      border: 2px solid #c9a84c;
      border-radius: 6px;
      padding: 0;
      overflow: hidden;
      box-shadow:
        0 0 0 1px #6b4e1a,
        0 12px 40px rgba(0,0,0,0.8),
        inset 0 1px 0 rgba(201,168,76,0.3);
      position: relative;
    }
    /* Top decorative border strip */
    .zp-scroll::before {
      content: '';
      display: block;
      height: 3px;
      background: repeating-linear-gradient(
        90deg,
        #c9a84c 0px, #c9a84c 6px,
        #6b4e1a 6px, #6b4e1a 8px
      );
    }
    /* Bottom decorative border strip */
    .zp-scroll::after {
      content: '';
      display: block;
      height: 3px;
      background: repeating-linear-gradient(
        90deg,
        #c9a84c 0px, #c9a84c 6px,
        #6b4e1a 6px, #6b4e1a 8px
      );
    }
    .zp-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 18px 20px 12px;
      border-bottom: 1px solid rgba(201,168,76,0.25);
    }
    .zp-icon {
      font-size: 36px;
      line-height: 1;
      filter: drop-shadow(0 0 6px rgba(201,168,76,0.5));
    }
    .zp-title-block { flex: 1; }
    .zp-name {
      font-family: 'Cinzel', serif;
      font-size: 16px;
      font-weight: 700;
      color: #c9a84c;
      letter-spacing: 0.06em;
      text-shadow: 0 0 12px rgba(201,168,76,0.4);
      line-height: 1.2;
    }
    .zp-subtitle {
      font-family: 'Cinzel', serif;
      font-size: 9px;
      color: #8a6b2a;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .zp-divider {
      height: 1px;
      margin: 0 20px;
      background: linear-gradient(90deg, transparent, #c9a84c55, transparent);
    }
    .zp-body {
      padding: 14px 20px 18px;
    }
    .zp-desc {
      font-family: 'Georgia', serif;
      font-size: 12px;
      line-height: 1.75;
      color: #d4b483;
      margin-bottom: 16px;
    }
    .zp-actions {
      display: flex;
      gap: 10px;
    }
    .zp-btn-enter {
      flex: 1;
      padding: 10px 16px;
      background: linear-gradient(135deg, #c9a84c, #a07828);
      color: #1a0f00;
      border: none;
      border-radius: 3px;
      font-family: 'Cinzel', serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      cursor: pointer;
      text-transform: uppercase;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
      transition: filter 0.15s;
    }
    .zp-btn-enter:hover { filter: brightness(1.15); }
    .zp-btn-close {
      padding: 10px 14px;
      background: transparent;
      color: #c9a84c;
      border: 1px solid #c9a84c44;
      border-radius: 3px;
      font-family: 'Cinzel', serif;
      font-size: 13px;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }
    .zp-btn-close:hover { border-color: #c9a84c; color: #f0d89a; }
    /* Wax seal decoration */
    .zp-seal {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      width: 28px;
      height: 28px;
      background: radial-gradient(circle, #8b1a1a, #5a0f0f);
      border-radius: 50%;
      border: 2px solid #c9a84c;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.6);
    }
  `;
  document.head.appendChild(style);

  // Build panel DOM
  const panel = document.createElement('div');
  panel.id = 'zone-panel';
  panel.innerHTML = `
    <div class="zp-seal">⚡</div>
    <div class="zp-scroll">
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
    console.log(`[zone] Enter: ${panel.dataset.zoneId}`);
    hide();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  window.addEventListener('zone:open', (e) => show(e.detail));
}
