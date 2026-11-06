// js/ui/transition.js

let transitionEl = null;
let textEl = null; 

export function initTransition() {
  if (document.getElementById('mapTransitionOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'mapTransitionOverlay';
  overlay.innerHTML = `<div id="transitionText">VIAJANDO...</div>`;
  document.body.appendChild(overlay);

  transitionEl = overlay; 
  textEl = document.getElementById('transitionText');
}

export async function playTransition(text = 'VIAJANDO...') {
  if (!transitionEl) initTransition();
  
  if (textEl) textEl.textContent = text;
  transitionEl.classList.add('active');

  // Aguarda a animação de fade-in terminar (0.4s)
  await new Promise(resolve => setTimeout(resolve, 400));
}

export async function hideTransition() {
  if (!transitionEl) return;

  transitionEl.classList.remove('active');
  // Aguarda o fade-out sumir
  await new Promise(resolve => setTimeout(resolve, 400));
}