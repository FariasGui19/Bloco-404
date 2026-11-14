// js/ui/transition.js

let transitionEl = null;
let textEl = null;
let subTextEl = null;
let headerEl = null;

export function initTransition() {
  const existing = document.getElementById('mapTransitionOverlay');
  if (existing) {
    transitionEl = existing;
    textEl = document.getElementById('transitionText');
    subTextEl = document.getElementById('transitionSubText');
    headerEl = existing.querySelector?.('.hangar-terminal-header') ?? null;
    return;
  }

  if (typeof document === 'undefined' || !document.createElement || !document.body) return;

  const overlay = document.createElement('div');
  overlay.id = 'mapTransitionOverlay';
  overlay.innerHTML = `
    <div class="dimensional-ring" aria-hidden="true"></div>
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
  headerEl = overlay.querySelector?.('.hangar-terminal-header') ?? null;
}

export async function playTransition(text = 'VIAJANDO...', mode = 'default') {
  if (!transitionEl) initTransition();

  const dimensional=mode==='cidadela-entrada' || mode==='cidadela-retorno';
  transitionEl?.classList?.remove('dimensional','dimensional-entrada','dimensional-retorno');
  if(dimensional) transitionEl?.classList?.add('dimensional',`dimensional-${mode==='cidadela-entrada'?'entrada':'retorno'}`);
  if(headerEl) headerEl.textContent=dimensional?'FREQUÊNCIA 66.6 // MUDANÇA DE DIMENSÃO':'SYS.ZONA-X10 // COMPORTA DE TRANSFERÊNCIA';
  if (textEl) textEl.textContent = text;
  if (subTextEl) {
    const isAirport = /AEROPORTO|SALA|CARGA/i.test(text);
    subTextEl.textContent = dimensional ? 'SINCRONIZANDO PERSPECTIVA · LINHA DE RETORNO ATIVA' : isAirport
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
  transitionEl?.classList?.remove('dimensional','dimensional-entrada','dimensional-retorno');
}
