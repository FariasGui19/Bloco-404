import { CONFIG } from '../config.js';

// =====================================================================
//  MENU: tela de título.
//  Não sabe nada do jogo. Só mostra a tela e AVISA quando o jogador
//  quer começar, chamando a função onStart (que vem do main.js).
// =====================================================================
const SPARK_COUNT = 18;

export function initTitleScreen(onStart) {
  const screen = document.getElementById('titleScreen');
  const btn = document.getElementById('startBtn');
  document.getElementById('titleVersion').textContent = `V${CONFIG.VERSION}`;

  spawnSparks(document.getElementById('titleSparks'));

  let started = false;

  function start() {
    if (started) return;          // evita disparar duas vezes (ex: Enter segurado)
    started = true;

    window.removeEventListener('keydown', onKey);
    btn.blur();
    document.body.classList.remove('in-menu'); // HUD começa a aparecer
    screen.classList.add('hide');              // o CSS faz o fade-out
    onStart();                                 // main.js liga loop e inputs

    // Depois do fade, tira o menu do DOM (libera as animações dele)
    screen.addEventListener('transitionend', e => {
      if (e.target === screen && e.propertyName === 'opacity') screen.remove();
    });
  }

  // ENTER funciona mesmo se o botão não estiver com foco
  function onKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); start(); }
  }

  btn.addEventListener('click', start);
  window.addEventListener('keydown', onKey);
  btn.focus({ preventScroll: true });
}

// Pequenos losangos amarelos subindo, só pra dar vida ao fundo
function spawnSparks(container) {
  for (let i = 0; i < SPARK_COUNT; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    s.style.setProperty('--x', `${Math.random() * 100}%`);
    s.style.setProperty('--size', `${4 + Math.random() * 6}px`);
    s.style.setProperty('--dur', `${6 + Math.random() * 8}s`);
    s.style.setProperty('--delay', `${-Math.random() * 12}s`); // negativo = já nascem espalhadas
    container.appendChild(s);
  }
}