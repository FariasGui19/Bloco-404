// Seletor do Núcleo: apenas a forma veloz disponível; não troca arquétipo.
import { input } from '../engine/input.js';

let overlay = null;
let opened = false;

function closeWheel() {
  opened = false;
  overlay?.classList.remove('visible');
  input.click = null;
}

export function isNucleoWheelOpen() { return opened; }

export function openNucleoWheel(progress, player) {
  if (progress?.archetype !== 'nucleo_dez_forma' || player?.ability?.dash) return false;
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'nucleoWheel';
    overlay.innerHTML = `
      <div class="nucleo-panel" role="dialog" aria-modal="true" aria-label="Seletor do Núcleo 10X">
        <div class="nucleo-eyebrow">PROTOCOLO DE METAMORFOSE</div>
        <h2>NÚCLEO <span>10X</span></h2>
        <div class="nucleo-orbit">
          <div class="nucleo-ring ring-outer"></div><div class="nucleo-ring ring-inner"></div>
          <div class="nucleo-core"><span>10</span><small>ECO ATIVO</small></div>
          <button class="nucleo-form" type="button" aria-label="Selecionar forma veloz"><span>✦</span><b>FORMA VELOZ</b><small>DISPONÍVEL</small></button>
          <span class="nucleo-locked lock-a" aria-label="Forma futura bloqueada">◆</span>
          <span class="nucleo-locked lock-b" aria-label="Forma futura bloqueada">◆</span>
          <span class="nucleo-locked lock-c" aria-label="Forma futura bloqueada">◆</span>
        </div>
        <p>FORMA VELOZ <strong>SELECIONADA</strong><br><small>Q executa a forma rapidamente e retorna ao operador.</small></p>
        <div class="nucleo-help">ENTER / E ou clique para confirmar · T / ESC para fechar</div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.nucleo-form').addEventListener('click', closeWheel);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeWheel(); });
  }
  input.click = null;
  opened = true;
  overlay.classList.add('visible');
  overlay.querySelector('.nucleo-form').focus();
  return true;
}

export function updateNucleoWheel() {
  if (!opened) return;
  if (['escape', 't', 'keyt', 'enter', 'e', 'keye', ' '].some(key => input.pressed.has(key))) closeWheel();
}
