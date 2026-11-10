// =====================================================================
// SELETOR DO NÚCLEO (tecla T)
//
// Antes: uma roda com uma única forma jogável e três cadeados fixos.
// Agora: a roda lista TODAS as formas do Núcleo. As jogáveis podem ser
// escolhidas (é a escolha que decide qual transformação o T ativa); as que
// ainda são projeto continuam travadas, sem prometer poder.
//
// A roda não troca arquétipo, não gasta energia e não interrompe dash,
// varredura ou transição. Escolher uma forma e confirmar transforma na hora.
// =====================================================================
import { input } from '../engine/input.js';
import { toggleNucleoForm, canToggleNucleoForm } from '../game/nucleo-form.js';
import { getTools } from '../data/archetype-tools.js';
import { getSelectedTool } from '../game/tools.js';
import {
  NUCLEO_BRUTA,
  NUCLEO_VELOZ,
  getSelectedNucleoForm,
} from '../data/nucleo-forms.js';

const NUCLEO = 'nucleo_dez_forma';

// Célula da pose de vitrine, buscada da folha completa (4 colunas direcionais).
// A roda mostra o corpo de frente para o jogador reconhecer a forma.
const SHOWCASE = Object.freeze({
  [NUCLEO_VELOZ]: { src: 'assets/sprites/ui/nucleo-forma-veloz.png', plain: true },
  [NUCLEO_BRUTA]: { sprite: 'player_10x_bruta_parado', col: 0, cols: 4 },
});

let overlay = null;
let opened = false;
let currentProgress = null;
let currentPlayer = null;
let safeToReturn = () => true;
// Qual cartão está sob foco dentro da roda (id da ferramenta).
let focusToolId = null;

const RUNTIME_FOR_TOOL = Object.freeze({
  nucleo_veloz: NUCLEO_VELOZ,
  nucleo_bruto: NUCLEO_BRUTA,
});

function closeWheel() {
  opened = false;
  overlay?.classList.remove('visible');
  input.click = null;
}

// Cartões jogáveis: são os que podem virar transformação.
function playableCards(progress) {
  return getTools(NUCLEO).filter(tool => tool.playable !== false);
}

// Confirma o cartão em foco: escolhe a forma e transforma (ou retorna).
function confirmWheel() {
  if (!opened) return;
  const cards = playableCards(currentProgress);
  const alvo = cards.find(tool => tool.id === focusToolId) ?? null;
  if (currentPlayer.nucleoForm && !safeToReturn()) return;
  // Já transformado na forma do cartão: confirmação volta ao operador.
  const runtimeId = alvo ? RUNTIME_FOR_TOOL[alvo.id] : null;
  if (currentPlayer.nucleoForm && (!alvo || runtimeId === currentPlayer.nucleoForm)) {
    if (currentPlayer.nucleoForm && !safeToReturn()) return;
    if (toggleNucleoForm(currentProgress, currentPlayer)) closeWheel();
    return;
  }
  // Escolhe a forma no progresso (mesma API do Códex) e transforma nela.
  if (alvo && currentProgress.tools) {
    currentProgress.tools[NUCLEO] = alvo.id;
  }
  if (toggleNucleoForm(currentProgress, currentPlayer, runtimeId)) closeWheel();
}

function cycleFocus(step) {
  const cards = playableCards(currentProgress);
  if (!cards.length) return;
  const atual = cards.findIndex(tool => tool.id === focusToolId);
  const próximo = (atual + step + cards.length) % cards.length;
  focusToolId = cards[próximo].id;
  paintWheel();
}

function toggleFocus() {
  cycleFocus(1);
}

function paintWheel() {
  if (!overlay) return;
  const cards = getTools(NUCLEO);
  const jogaveis = cards.filter(tool => tool.playable !== false);
  if (!focusToolId) {
    // Começa no cartão da forma escolhida no Códex.
    const escolhida = getSelectedTool(currentProgress);
    focusToolId = escolhida?.id ?? jogaveis[0]?.id ?? null;
  }
  const ativo = currentPlayer?.nucleoForm ?? null;
  overlay.querySelectorAll('.nucleo-form').forEach(button => {
    const id = button.dataset.tool;
    button.classList.toggle('selected', id === focusToolId);
    button.classList.toggle('active', RUNTIME_FOR_TOOL[id] === ativo);
    button.setAttribute('aria-pressed', id === focusToolId ? 'true' : 'false');
  });
  const escolhida = getSelectedNucleoForm(currentProgress);
  const alvo = jogaveis.find(tool => tool.id === focusToolId) ?? null;
  const recharge = Math.ceil(currentPlayer?.nucleoRuntime?.recharge ?? 0);
  const restante = Math.ceil(currentPlayer?.nucleoRuntime?.remaining ?? 0);
  const status = overlay.querySelector('#nucleo-status');
  if (!status) return;
  if (ativo && !safeToReturn()) {
    status.innerHTML = 'RETORNO <strong>AGUARDANDO ÁREA SEGURA</strong><br><small>Feche a roda e saia do obstáculo antes de retornar.</small>';
  } else if (ativo) {
    const nome = ativo === NUCLEO_BRUTA ? 'QUEBRA SISTEMAS' : 'FORMA VELOZ';
    status.innerHTML = `${nome} <strong>ATIVA • ${restante}s</strong><br><small>Confirme para retornar ao operador.</small>`;
  } else if (recharge > 0) {
    status.innerHTML = `NÚCLEO EM <strong>RECARGA • ${recharge}s</strong><br><small>Q rápido continua disponível enquanto o núcleo esfria.</small>`;
  } else if (alvo) {
    const f = alvo.form ?? {};
    status.innerHTML = `${alvo.name} <strong>SELECIONADA</strong><br><small>${f.duration ?? 30}s de forma · ${f.recharge ?? 8}s de recarga · ${alvo.ultimate?.name ?? ''}</small>`;
  } else {
    status.innerHTML = `${escolhida?.name ?? 'FORMA VELOZ'} <strong>PRONTA</strong>`;
  }
}

// Miniatura de cada cartão jogável: imagem própria ou célula da folha.
function previewFor(tool) {
  const show = SHOWCASE[RUNTIME_FOR_TOOL[tool.id]];
  if (!show) return '';
  if (show.plain) return `<img class="nucleo-preview" src="${show.src}" alt="">`;
  return `<img class="nucleo-preview nucleo-preview-sheet" data-sprite="${show.sprite}" data-col="${show.col}" data-cols="${show.cols}" alt="">`;
}

// Depois que as folhas carregam, cada <img> de célula recebe o recorte real.
function hydrateSheetPreviews() {
  if (!overlay || typeof document === 'undefined') return;
  for (const img of overlay.querySelectorAll('img[data-sprite]')) {
    if (img.dataset.ready === '1') continue;
    const sheet = window.__blocoSprites?.get?.(img.dataset.sprite);
    if (!sheet) continue;
    const cols = Number(img.dataset.cols) || 4;
    const w = sheet.width / cols;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = sheet.height;
      canvas.getContext('2d').drawImage(sheet, Number(img.dataset.col) * w, 0, w, sheet.height, 0, 0, w, sheet.height);
      img.src = canvas.toDataURL();
      img.dataset.ready = '1';
    } catch { /* imagem externa: mantém o cartão sem miniatura */ }
  }
}

export function isNucleoWheelOpen() { return opened; }

export function openNucleoWheel(progress, player, isSafeToReturn = () => true) {
  if (!canToggleNucleoForm(progress, player)) return false;
  currentProgress = progress;
  currentPlayer = player;
  safeToReturn = isSafeToReturn;
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'nucleoWheel';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeWheel(); });
  }
  // Reconstrói os cartões a cada abertura: as formas jogáveis são dado, não
  // markup fixo (antes eram três cadeados pintados à mão).
  const cards = getTools(NUCLEO);
  const escolhida = getSelectedTool(progress);
  focusToolId = escolhida?.id ?? cards.find(tool => tool.playable !== false)?.id ?? null;
  overlay.innerHTML = `
    <div class="nucleo-panel" role="dialog" aria-modal="true" aria-label="Seletor do Núcleo 10X">
      <div class="nucleo-eyebrow">PROTOCOLO DE METAMORFOSE</div>
      <h2>NÚCLEO <span>10X</span></h2>
      <div class="nucleo-orbit" role="group" aria-label="Formas do Núcleo: duas jogáveis e duas em projeto">
        <div class="nucleo-ring ring-outer"></div><div class="nucleo-ring ring-inner"></div>
        <div class="nucleo-core"><span>10</span><small>ECO ATIVO</small></div>
        ${cards.map((tool, index) => `
          <button class="nucleo-form nucleo-form-${index}" type="button" data-tool="${tool.id}"
            ${tool.playable === false ? 'disabled aria-disabled="true"' : ''}
            aria-label="${tool.playable === false ? `Forma em projeto: ${tool.name}` : `Escolher ${tool.name}`}">
            ${tool.playable === false ? '<span class="nucleo-form-lock" aria-hidden="true">◆</span>' : previewFor(tool)}
            <b>${tool.name}</b>
            <small>${tool.playable === false ? 'EM PROJETO' : tool.short}</small>
          </button>`).join('')}
      </div>
      <p id="nucleo-status"></p>
      <div class="nucleo-help">TAB / ← → alternar · ESPAÇO / ENTER / E ou clique para confirmar · T / ESC cancelar</div>
    </div>`;
  for (const button of overlay.querySelectorAll('.nucleo-form')) {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      focusToolId = button.dataset.tool;
      paintWheel();
      confirmWheel();
    });
  }
  if (typeof Image !== 'undefined') {
    const art = new Image();
    art.onload = () => overlay.classList.add('nucleo-art-ready');
    art.src = 'assets/sprites/ui/nucleo-roda.png';
  }
  hydrateSheetPreviews();
  paintWheel();
  input.click = null;
  opened = true;
  overlay.classList.add('visible');
  overlay.querySelector('.nucleo-form.selected:not([disabled])')?.focus();
  return true;
}

export function updateNucleoWheel() {
  if (!opened) return;
  hydrateSheetPreviews();
  const pressed = (keys) => keys.some(key => input.pressed.has(key));
  if (pressed(['escape', 't', 'keyt'])) { closeWheel(); return; }
  if (pressed(['arrowright', 'd', 'keyd', 'tab'])) { cycleFocus(1); return; }
  if (pressed(['arrowleft', 'a', 'keya'])) { cycleFocus(-1); return; }
  if (pressed(['arrowup', 'w', 'keyw', 'arrowdown', 's', 'keys'])) { cycleFocus(1); return; }
  if (pressed(['enter', 'e', 'keye', ' ', 'space'])) confirmWheel();
}

// Expostos para teste: a roda não deve esconder a lógica de escolha.
export const __wheelInternals = Object.freeze({ confirmWheel, cycleFocus, playableCards });
