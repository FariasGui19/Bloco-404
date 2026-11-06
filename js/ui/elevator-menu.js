// js/ui/elevator-menu.js
// =====================================================================
//  PAINEL DO ELEVADOR
//  W/S ou setas escolhem · E/ENTER/ESPAÇO confirmam · ESC fecha
// =====================================================================
import { input } from '../engine/input.js';
import { state } from '../game/state.js';
import { usePortal } from '../game/portals.js';
import { ANDARES } from '../data/elevator.js';

let el = null;
let listaEl = null;
let msgEl = null;
let aberto = false;
let sel = 0;

const atual = () => state.world.currentMapId;
const titulo = (a) => (a.andar === 'T' ? 'TÉRREO' : `PISO ${a.andar}`);

function montar() {
  if (el) return;

  el = document.createElement('div');
  el.id = 'elevatorMenu';
  el.innerHTML = `
    <div class="elev-panel">
      <h2>🛗 ELEVADOR — BLOCO 404</h2>
      <ul id="elevList"></ul>
      <p class="elev-msg" id="elevMsg"></p>
      <p class="elev-help">W/S escolher · E confirmar · ESC fechar</p>
    </div>
  `;
  document.body.appendChild(el);

  listaEl = el.querySelector('#elevList');
  msgEl = el.querySelector('#elevMsg');

  // Clicar fora do painel fecha
  el.addEventListener('click', (e) => {
    if (e.target === el) fechar();
  });
}

export function isElevatorMenuOpen() {
  return aberto;
}

export function openElevatorMenu() {
  montar();
  sel = Math.max(0, ANDARES.findIndex((a) => a.mapId === atual()));
  msgEl.textContent = '';
  desenhar();
  el.classList.add('visible');
  aberto = true;
}

function fechar() {
  aberto = false;
  el?.classList.remove('visible');
}

function desenhar() {
  listaEl.innerHTML = '';

  ANDARES.forEach((a, i) => {
    const aqui = a.mapId === atual();
    const li = document.createElement('li');

    li.className = [i === sel && 'sel', a.bloqueado && 'locked', aqui && 'atual']
      .filter(Boolean)
      .join(' ');

    li.innerHTML = `
      <span class="elev-num">${a.andar}</span>
      <span class="elev-nome">${a.nome}</span>
      <span class="elev-tag">${aqui ? '● VOCÊ ESTÁ AQUI' : a.bloqueado ? '🔒' : ''}</span>
    `;

    li.addEventListener('mouseenter', () => { sel = i; marcar(); });
    li.addEventListener('click', () => { sel = i; confirmar(); });
    listaEl.appendChild(li);
  });
}

function marcar() {
  [...listaEl.children].forEach((li, i) => li.classList.toggle('sel', i === sel));
}

function confirmar() {
  const a = ANDARES[sel];
  if (!a) return;

  if (a.mapId === atual()) {
    msgEl.textContent = 'Você já está neste andar.';
    return;
  }

  if (a.bloqueado) {
    msgEl.textContent = a.mensagem ?? 'ANDAR BLOQUEADO.';
    return;
  }

  fechar();
  usePortal({
    id: `elevador_${a.andar}`,
    label: `${titulo(a)} — ${a.nome}`,
    destino: { mapId: a.mapId, spawnId: a.spawnId },
    transition: 'fade',
  });
}

export function updateElevatorMenu() {
  if (!aberto) return;

  const p = (k) => input.pressed.has(k);
  const n = ANDARES.length;

  if (p('w') || p('arrowup')) { sel = (sel - 1 + n) % n; marcar(); msgEl.textContent = ''; }
  if (p('s') || p('arrowdown')) { sel = (sel + 1) % n; marcar(); msgEl.textContent = ''; }
  if (p('e') || p('enter') || p(' ')) confirmar();
  if (p('escape')) fechar();
}