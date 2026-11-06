// js/game/object-tools.js
// =====================================================================
//  FERRAMENTA DE OBJETOS (só com o debug ligado)
//  I/J/K/L → move o objeto (cima/esq/baixo/dir da TELA)
//  U/O     → sobe/desce só o desenho (px)
//  F       → espelha
//  P       → lista tudo no Console para colar no mapa
//  SHIFT+F → apaga a memória
//  Os ajustes ficam salvos no navegador até você colar nos arquivos.
// =====================================================================
import { state } from './state.js';
import { input } from '../engine/input.js';
import { isDebugEnabled } from './debug.js';

const CHAVE = 'bloco404_espelhos';
const PASSO = 0.05;
const r2 = (v) => Math.round(v * 100) / 100;

let memoria = carregar();
let ultimoMapa = null;

function carregar() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE)) ?? {};
    // Converte o formato antigo (só true/false) para o novo
    for (const mapa in dados) {
      for (const id in dados[mapa]) {
        if (typeof dados[mapa][id] === 'boolean') dados[mapa][id] = { espelhar: dados[mapa][id] };
      }
    }
    return dados;
  } catch {
    return {};
  }
}

const salvar = () => localStorage.setItem(CHAVE, JSON.stringify(memoria));

function ajustesDe(o) {
  const mapa = state.world.currentMapId;
  memoria[mapa] ??= {};
  return (memoria[mapa][o.id] ??= {});
}

function aplicarMemoria() {
  const lista = memoria[state.world.currentMapId];
  if (!lista) return;

  for (const o of state.objects ?? []) {
    o._baseX ??= o.x;
    o._baseY ??= o.y;
    const a = lista[o.id];
    if (!a) continue;
    if ('espelhar' in a) o.espelhar = a.espelhar;
    o.x = o._baseX + (a.dx ?? 0);
    o.y = o._baseY + (a.dy ?? 0);
    if ('ajusteY' in a) o.ajusteY = a.ajusteY;
  }
}

function maisProximo() {
  const p = state.player;
  let alvo = null;
  let melhor = 5.0;
  for (const o of state.objects ?? []) {
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d < melhor) { melhor = d; alvo = o; }
  }
  return alvo;
}

// Linha pronta para colar (x/y do arquivo = posição do mundo - 0.5)
function linhaDe(o) {
  const partes = [`x: ${r2(o.x - 0.5)}`, `y: ${r2(o.y - 0.5)}`];
  if (o.espelhar) partes.push('espelhar: true');
  if (o.ajusteY) partes.push(`ajusteY: ${o.ajusteY}`);
  return partes.join(', ') + ',';
}

export function updateObjectTools() {
  if (state.world.currentMapId !== ultimoMapa && state.objects?.length) {
    ultimoMapa = state.world.currentMapId;
    aplicarMemoria();
  }

  if (!isDebugEnabled()) return;

  const tecla = (k) => input.pressed.has(k);
  const shift = !!input.keys['shift'];

  if (tecla('f') && shift) {
    memoria = {};
    salvar();
    console.log('[OBJETOS] Memória apagada. Saia e volte ao mapa para ver o original.');
    return;
  }

  if (tecla('p')) {
    const linhas = [];
    for (const [mapa, objs] of Object.entries(memoria)) {
      for (const id of Object.keys(objs)) {
        const o = mapa === state.world.currentMapId ? state.objects?.find((x) => x.id === id) : null;
        linhas.push(o ? `  [${mapa}] "${id}" → ${linhaDe(o)}` : `  [${mapa}] "${id}" → (abra este mapa e aperte P para ver)`);
      }
    }
    console.log(linhas.length
      ? `[OBJETOS] Cole dentro de cada objeto no arquivo do mapa:\n${linhas.join('\n')}`
      : '[OBJETOS] Nenhum ajuste salvo.');
    return;
  }

  const alvo = maisProximo();
  if (!alvo) {
    if (['f', 'i', 'j', 'k', 'l', 'u', 'o'].some(tecla)) {
      console.log('[OBJETOS] Nenhum objeto perto. Chegue mais perto.');
    }
    return;
  }

  alvo._baseX ??= alvo.x;
  alvo._baseY ??= alvo.y;
  const a = ajustesDe(alvo);
  let mudou = false;

  // Movimento relativo à TELA, convertido para o mundo isométrico
  let mx = 0, my = 0;
  if (tecla('i')) { mx -= PASSO; my -= PASSO; }
  if (tecla('k')) { mx += PASSO; my += PASSO; }
  if (tecla('j')) { mx -= PASSO; my += PASSO; }
  if (tecla('l')) { mx += PASSO; my -= PASSO; }

  if (mx || my) {
    alvo.x += mx;
    alvo.y += my;
    a.dx = r2(alvo.x - alvo._baseX);
    a.dy = r2(alvo.y - alvo._baseY);
    mudou = true;
  }

  if (tecla('u') || tecla('o')) {
    alvo.ajusteY = (alvo.ajusteY ?? 0) + (tecla('u') ? -1 : 1);
    a.ajusteY = alvo.ajusteY;
    mudou = true;
  }

  if (tecla('f')) {
    alvo.espelhar = !alvo.espelhar;
    a.espelhar = alvo.espelhar;
    mudou = true;
  }

  if (mudou) {
    salvar();
    console.log(`[OBJETOS] ${alvo.id} → ${linhaDe(alvo)}`);
  }
} 