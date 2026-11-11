// js/ui/morfador-panel.js
// =====================================================================
// PAINEL DO MORFADOR DE RESSONÂNCIA
//
// Interface do modo criador. Só abre para save autorizado — a checagem
// acontece aqui E em cada função de `morfador.js`, de propósito (defesa em
// profundidade: a UI não é a única barreira).
//
// Layout: lista de arquétipos à esquerda, interruptores à direita.
// Desenhado em DOM (não canvas) porque é ferramenta de autoria: precisa
// de texto legível, foco de teclado e não pode competir com o HUD do jogo.
// =====================================================================
import {
  MORFADOR, autorizado, catalogo, trocarArquetipo, alternarMorfador,
  registrarAutoria, CREATOR_FLAG,
} from '../game/morfador.js';

let root = null;
let listEl = null;
let statusEl = null;
let aberto = false;
let contexto = null; // { progress, player }

const TOGGLES = [
  { chave: 'energiaInfinita', label: 'ENERGIA INFINITA' },
  { chave: 'vidaInfinita', label: 'VIDA INFINITA' },
  { chave: 'semRecarga', label: 'SEM RECARGA' },
  { chave: 'mundoCongelado', label: 'CONGELAR MUNDO' },
];

function montar() {
  if (root) return;
  root = document.createElement('section');
  root.id = 'morfadorPanel';
  root.className = 'morfador-panel';
  root.innerHTML = `
    <header class="morfador-head">
      <div>
        <span class="morfador-sigla">${MORFADOR.sigla}</span>
        <h2>${MORFADOR.nome}</h2>
        <p>${MORFADOR.descricao}</p>
      </div>
      <button class="morfador-close" type="button" aria-label="Fechar">✕</button>
    </header>
    <div class="morfador-body">
      <div class="morfador-arquétipos" data-lista></div>
      <aside class="morfador-flags" data-flags></aside>
    </div>
    <footer class="morfador-status" data-status></footer>
  `;
  document.body.appendChild(root);
  listEl = root.querySelector('[data-lista]');
  statusEl = root.querySelector('[data-status]');
  root.querySelector('.morfador-close').addEventListener('click', fechar);
}

function desenhar() {
  if (!listEl || !contexto) return;
  const { progress, player } = contexto;
  const m = player.morfador;
  const opcoes = catalogo(progress);

  listEl.innerHTML = '';
  for (const a of opcoes) {
    const ativo = progress.archetype === a.id;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `morfador-card${ativo ? ' ativo' : ''}`;
    card.style.setProperty('--cor', a.cor);
    card.innerHTML = `
      <span class="morfador-card-nome">${a.nome}</span>
      <span class="morfador-card-sub">${a.subtitulo}</span>
      ${ativo ? '<span class="morfador-card-tag">EM USO</span>' : ''}
    `;
    card.addEventListener('click', () => {
      if (trocarArquetipo(progress, player, a.id)) desenhar();
    });
    listEl.appendChild(card);
  }

  const flags = root.querySelector('[data-flags]');
  flags.innerHTML = '<h3>INTERRUPTORES</h3>';
  for (const t of TOGGLES) {
    const linha = document.createElement('label');
    linha.className = 'morfador-toggle';
    linha.innerHTML = `<input type="checkbox" ${m?.[t.chave] ? 'checked' : ''}> <span>${t.label}</span>`;
    linha.querySelector('input').addEventListener('change', (e) => {
      if (!autorizado(progress)) return;
      if (player.morfador) player.morfador[t.chave] = e.target.checked;
    });
    flags.appendChild(linha);
  }

  if (statusEl) {
    statusEl.textContent = m?.ativo
      ? `ATIVO • ${progress.archetype} • habilidades liberadas`
      : 'DESLIGADO • M para ligar';
  }
}

export function abrirMorfador(progress, player) {
  if (!autorizado(progress)) return false;
  montar();
  contexto = { progress, player };
  player.morfador ??= alternarMorfador(progress, player) ?? null;
  if (!player.morfador?.ativo) alternarMorfador(progress, player);
  aberto = true;
  root.classList.add('visible');
  desenhar();
  return true;
}

export function fechar() {
  aberto = false;
  root?.classList.remove('visible');
  // Fechar o painel NÃO desliga o modo: o criador pode querer testar com o
  // painel fora do caminho. Desligar é ação explícita (M ou o status).
}

export function morfadorAberto() {
  return aberto;
}

export function alternarPainel(progress, player) {
  if (aberto) { fechar(); return false; }
  return abrirMorfador(progress, player);
}

/**
 * Comando de autoria: promove o save atual a "do criador".
 * Precisa da chave exata. É o único caminho para ligar o Morfador.
 */
export function promoverAutoria(progress, chave) {
  const ok = registrarAutoria(progress, chave);
  if (ok) {
    console.info(`[MORFADOR] Save marcado como autoria (${CREATOR_FLAG}).`);
  }
  return ok;
}
