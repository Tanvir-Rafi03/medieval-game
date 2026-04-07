// client/src/ui/ZonePanel.js
// HTML overlay panel that appears when the player clicks a zone.
// Listens for the 'zone:open' custom event dispatched by WorldScene.
// Keeps all DOM logic out of Phaser scenes.

export function initZonePanel() {
  const uiLayer = document.getElementById('ui-layer');

  // Create panel element
  const panel = document.createElement('div');
  panel.id = 'zone-panel';
  Object.assign(panel.style, {
    position: 'absolute',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '360px',
    background: 'rgba(20, 16, 36, 0.96)',
    border: '2px solid #c9a84c',
    borderRadius: '8px',
    padding: '24px',
    color: '#f4e4c1',
    fontFamily: '"Cinzel", serif',
    pointerEvents: 'auto',
    display: 'none',
    zIndex: '30',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  });

  panel.innerHTML = `
    <div id="zone-panel-icon" style="font-size:32px;margin-bottom:8px"></div>
    <div id="zone-panel-name" style="font-size:20px;color:#c9a84c;margin-bottom:8px"></div>
    <div id="zone-panel-desc" style="font-size:13px;line-height:1.6;color:#f4e4c1;opacity:0.85;font-family:system-ui,sans-serif;margin-bottom:20px"></div>
    <div style="display:flex;gap:10px">
      <button id="zone-panel-enter" style="
        flex:1;padding:10px;background:#c9a84c;color:#1a1a2e;
        border:none;border-radius:4px;font-family:'Cinzel',serif;
        font-size:13px;cursor:pointer;font-weight:600;
      ">Enter</button>
      <button id="zone-panel-close" style="
        padding:10px 16px;background:transparent;color:#c9a84c;
        border:1px solid #c9a84c;border-radius:4px;font-family:'Cinzel',serif;
        font-size:13px;cursor:pointer;
      ">✕</button>
    </div>
  `;

  uiLayer.appendChild(panel);

  // Close button
  document.getElementById('zone-panel-close').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  // Enter button — placeholder for Phase 4+
  document.getElementById('zone-panel-enter').addEventListener('click', () => {
    const zoneId = panel.dataset.zoneId;
    console.log(`[zone] Enter: ${zoneId}`);
    // Phase 4: open the zone's mini-app (pomodoro, journal, etc.)
    panel.style.display = 'none';
  });

  // Listen for zone open events from WorldScene
  window.addEventListener('zone:open', (e) => {
    const zone = e.detail;
    panel.dataset.zoneId = zone.id;
    document.getElementById('zone-panel-icon').textContent = zone.icon;
    document.getElementById('zone-panel-name').textContent = zone.name;
    document.getElementById('zone-panel-desc').textContent = zone.description;
    panel.style.display = 'block';
  });

  // Close panel on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') panel.style.display = 'none';
  });
}
