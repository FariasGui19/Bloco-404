// js/ui/transition.js

let transitionEl = null;
let textEl = null;
let subTextEl = null;

export function initTransition() {
  const existing = document.getElementById('mapTransitionOverlay');
  if (existing) {
    transitionEl = existing;
    textEl = document.getElementById('transitionText');
    subTextEl = document.getElementById('transitionSubText');
    return;
  }

  if (typeof document === 'undefined' || !document.createElement || !document.body) return;

  const overlay = document.createElement('div');
  overlay.id = 'mapTransitionOverlay';
  overlay.innerHTML = `
    <div class="hangar-shutter hangar-shutter-top">
      <div class="hangar-hazard-strip"></div>
    </div>
    <div class="hangar-shutter hangar-shutter-bottom">
      <div class="hangar-hazard-strip"></div>
    </div>
    <div class="hangar-terminal-hud">
      <div class="hangar-terminal-header">SYS.ZONA-X10 // COMPORTA DE TRANSFERÊNCIA</div>
      <div id="transitionText">VIAJANDO...</div>
      <div id="transitionSubText" class="hangar-terminal-sub">SINCRONIZANDO SETOR... [OK]</div>
      <div class="hangar-progress-bar"><div class="hangar-progress-fill"></div></div>
    </div>
  `;
  document.body.appendChild(overlay);

  transitionEl = overlay;
  textEl = document.getElementById('transitionText');
  subTextEl = document.getElementById('transitionSubText');
}

export async function playTransition(text = 'VIAJANDO...') {
  if (!transitionEl) initTransition();

  if (textEl) textEl.textContent = text;
  if (subTextEl) {
    const isAirport = /AEROPORTO|SALA|CARGA/i.test(text);
    subTextEl.textContent = isAirport
      ? 'COMPORTA DE HANGAR · CALIBRANDO PERSPECTIVA ZONA X10'
      : 'TRANSFERÊNCIA DE SETOR EM ANDAMENTO...';
  }
  transitionEl?.classList?.add('active');

  // Aguarda a animação da comporta de hangar fechar (0.4s)
  await new Promise(resolve => setTimeout(resolve, 400));
}

export async function hideTransition() {
  if (!transitionEl) return;

  transitionEl.classList?.remove('active');
  // Aguarda a comporta de hangar abrir
  await new Promise(resolve => setTimeout(resolve, 400));
}
