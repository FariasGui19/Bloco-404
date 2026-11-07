// Seletor do Núcleo: apenas a forma veloz disponível; não troca arquétipo.
import { input } from '../engine/input.js';
import { toggleNucleoForm } from '../game/nucleo-form.js';

let overlay = null;
let opened = false;
let currentProgress = null;
let currentPlayer = null;

function closeWheel() {
  opened = false;
  overlay?.classList.remove('visible');
  input.click = null;
}

function confirmWheel() {
  if (!opened) return;
  if (toggleNucleoForm(currentProgress, currentPlayer)) closeWheel();
}

export function isNucleoWheelOpen() { return opened; }

export function openNucleoWheel(progress, player) {
  if (progress?.archetype !== 'nucleo_dez_forma' || !progress.abilities?.includes('forma_veloz') || player?.ability?.dash || player?.ability?.effect?.id === 'transformacao_10x') return false;
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'nucleoWheel';
    overlay.innerHTML = `
      <div class="nucleo-panel" role="dialog" aria-modal="true" aria-label="Seletor do Núcleo 10X">
        <div class="nucleo-eyebrow">PROTOCOLO DE METAMORFOSE</div>
        <h2>NÚCLEO <span>10X</span></h2>
        <div class="nucleo-orbit" role="group" aria-label="Uma forma disponível e quatro formas futuras bloqueadas">
          <div class="nucleo-ring ring-outer"></div><div class="nucleo-ring ring-inner"></div>
          <div class="nucleo-core"><span>10</span><small>ECO ATIVO</small></div>
          <button class="nucleo-form" type="button" aria-label="Selecionar forma veloz"><span>✦</span><b>FORMA VELOZ</b><small>DISPONÍVEL</small></button>
          <span class="nucleo-locked lock-a" aria-label="Forma futura bloqueada">◆</span>
          <span class="nucleo-locked lock-b" aria-label="Forma futura bloqueada">◆</span>
          <span class="nucleo-locked lock-c" aria-label="Forma futura bloqueada">◆</span>
        </div>
        <p id="nucleo-status"></p>
        <div class="nucleo-help">ESPAÇO / ENTER / E ou clique para transformar · T / ESC cancelar</div>
      </div>`;
    document.body.appendChild(overlay);
    // Mantém a roda CSS original se a arte não carregar.
    if (typeof Image !== 'undefined') {
      const art = new Image();
      art.onload = () => overlay.classList.add('nucleo-art-ready');
      art.src = 'assets/sprites/ui/nucleo-roda.png';
    }
    overlay.querySelector('.nucleo-form').addEventListener('click', confirmWheel);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeWheel(); });
  }
  currentProgress = progress;
  currentPlayer = player;
  const active = player.nucleoForm === 'forma_veloz';
  overlay.querySelector('#nucleo-status').innerHTML = active
    ? 'FORMA VELOZ <strong>ATIVA</strong><br><small>Confirme para retornar ao operador.</small>'
    : 'FORMA VELOZ <strong>SELECIONADA</strong><br><small>Confirme para assumir a forma. Q continua disponível.</small>';
  input.click = null;
  opened = true;
  overlay.classList.add('visible');
  overlay.querySelector('.nucleo-form').focus();
  return true;
}

export function updateNucleoWheel() {
  if (!opened) return;
  if (['escape', 't', 'keyt'].some(key => input.pressed.has(key))) closeWheel();
  else if (['enter', 'e', 'keye', ' ', 'space'].some(key => input.pressed.has(key))) confirmWheel();
}
