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
  NUCLEO_FORMS,
  NUCLEO_VELOZ,
  getSelectedNucleoForm,
} from '../data/nucleo-forms.js';

const NUCLEO = 'nucleo_dez_forma';

// Miniatura de cada forma. As duas usam o MESMO mecanismo (uma imagem pronta):
// antes a Veloz vinha de um PNG e a Quebra tentava recortar a folha em runtime,
// então o cartão ficava vazio e parecia que a imagem nunca trocava.
// A fonte é o dado da ferramenta (`tool.preview`); este mapa é só a reserva
// para progresso antigo, sem campo novo no save.
const SHOWCASE = Object.freeze({
  [NUCLEO_VELOZ]: 'assets/sprites/ui/nucleo-forma-veloz.png',
  [NUCLEO_BRUTA]: 'assets/sprites/ui/nucleo-quebra-sistemas.png',
});

let overlay = null;
let opened = false;
let currentProgress = null;
let currentPlayer = null;
let safeToReturn = () => true;
// Qual cartão está sob foco dentro da roda (id da ferramenta).
let focusToolId = null;

// POSIÇÕES DOS ENCAIXES DO ANEL.
// A arte do anel (assets/sprites/ui/nucleo-roda.png, 1536×1024) tem quatro
// hexágonos: topo (766,320), direita (1187,529), base (765,680) e esquerda
// (345,529). Em porcentagem da imagem:
//     topo 50%/31% · direita 77%/52% · base 50%/66% · esquerda 22%/52%
// Era aqui que a segunda forma "não trocava de foto": os quatro cartões eram
// pintados no MESMO ponto (50%/46%), um por cima do outro — só a última arte
// aparecia e os nomes ficavam empilhados. Cada forma agora mora no seu slot.
const SLOT_ANCHOR = Object.freeze([
  { left: '50%', top: '31%' }, // 0 · topo      → FORMA VELOZ
  { left: '77%', top: '53%' }, // 1 · direita   → QUEBRA SISTEMAS
  { left: '50%', top: '67%' }, // 2 · base      → FLUIDA (projeto)
  { left: '22%', top: '53%' }, // 3 · esquerda  → NÚCLEO (projeto)
]);

function slotStyle(index) {
  const slot = SLOT_ANCHOR[index % SLOT_ANCHOR.length];
  return `--slot-x: ${slot.left}; --slot-y: ${slot.top};`;
}

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

// Confirma o cartão em foco. A regra é simples e previsível:
//   - transformado e confirmando a MESMA forma → volta ao operador;
//   - transformado e confirmando OUTRA forma       → não troca no ar (o corpo
//     precisa voltar primeiro); a roda avisa em vez de fingir;
//   - parado → escolhe a forma e transforma nela.
function confirmWheel() {
  if (!opened) return;
  const alvo = playableCards(currentProgress).find(tool => tool.id === focusToolId) ?? null;
  const runtimeId = alvo ? RUNTIME_FOR_TOOL[alvo.id] : null;
  const ativa = currentPlayer.nucleoForm ?? null;
  if (!safeToReturn() && (ativa || alvo)) return;
  if (ativa) {
    // Só a forma ativa pode ser confirmada de novo: é o retorno.
    if (runtimeId && runtimeId !== ativa) {
      const status = overlay?.querySelector('#nucleo-status');
      if (status) status.innerHTML = `RETORNE PRIMEIRO<br><small>Confirme <strong>${NUCLEO_FORMS[ativa]?.name ?? 'A FORMA ATIVA'}</strong> para voltar ao operador, depois escolha outra.</small>`;
      return;
    }
    if (toggleNucleoForm(currentProgress, currentPlayer)) closeWheel();
    return;
  }
  if (!alvo || !currentProgress.tools) return;
  currentProgress.tools[NUCLEO] = alvo.id;
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

// Miniatura de cada cartão jogável: uma imagem pronta por forma.
function previewFor(tool) {
  const src = tool.preview ?? SHOWCASE[RUNTIME_FOR_TOOL[tool.id]];
  if (!src) return '';
  return `<img class="nucleo-preview" src="${src}" alt="">`;
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
          <button class="nucleo-form nucleo-form-${index}" type="button" data-tool="${tool.id}" style="${slotStyle(index)}"
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
    // `pointerdown` cobre clique, toque e caneta; o `click` cai no mesmo
    // caminho e é ignorado se o ponteiro já resolveu aquele cartão. Antes o
    // cartão dependia de um único evento, e um clique seco no card podia não
    // registrar a troca de imagem.
    const confirmar = event => {
      if (button.disabled) return;
      event?.preventDefault?.();
      focusToolId = button.dataset.tool;
      paintWheel();
      confirmWheel();
    };
    button.addEventListener('pointerdown', confirmar);
    button.addEventListener('click', confirmar);
    // Teclado: primeiro passo marca a escolha, segundo confirma.
    button.addEventListener('keydown', event => {
      if (!event || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      if (focusToolId !== button.dataset.tool) {
        focusToolId = button.dataset.tool;
        paintWheel();
        return;
      }
      confirmar(event);
    });
  }
  if (typeof Image !== 'undefined') {
    const art = new Image();
    art.onload = () => overlay.classList.add('nucleo-art-ready');
    art.src = 'assets/sprites/ui/nucleo-roda.png';
  }
  paintWheel();
  input.click = null;
  opened = true;
  overlay.classList.add('visible');
  overlay.querySelector('.nucleo-form.selected:not([disabled])')?.focus();
  return true;
}

export function updateNucleoWheel() {
  if (!opened) return;
  const pressed = (keys) => keys.some(key => input.pressed.has(key));
  if (pressed(['escape', 't', 'keyt'])) { closeWheel(); return; }
  if (pressed(['arrowright', 'd', 'keyd', 'tab'])) { cycleFocus(1); return; }
  if (pressed(['arrowleft', 'a', 'keya'])) { cycleFocus(-1); return; }
  if (pressed(['arrowup', 'w', 'keyw', 'arrowdown', 's', 'keys'])) { cycleFocus(1); return; }
  if (pressed(['enter', 'e', 'keye', ' ', 'space'])) confirmWheel();
}

// Expostos para teste: a roda não deve esconder a lógica de escolha.
export const __wheelInternals = Object.freeze({ confirmWheel, cycleFocus, playableCards });
