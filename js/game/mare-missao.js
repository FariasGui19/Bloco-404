// =====================================================================
// MISSÃO DO MARÉ — os eventos que dão sentido ao mergulho
//
// O motor de missões (`quests.js`) já sabe contar objetivos. Este módulo
// é a ponte entre o mundo (nado, vida aquática, posição) e os eventos
// `mergulho`, `coleta_marinha` e `reach/fundo_enseada`.
//
// Regras que evitam save "mentindo":
//   - evento de mergulho só conta na ENTRADA no fundo (não por frame),
//     senão três mergulhos viram trezentos;
//   - coleta marinha é determinística por célula: a mesma célula não dá
//     fragmento duas vezes, e o que já foi coletado fica no progresso;
//   - `reach` do fundo só dispara dentro da enseada.
// =====================================================================
import { recordQuestEvent } from './quests.js';

export const MISSAO_MARE = 'mare_profunda';
const COLETAVEIS_KEY = 'mareFragSupridos';

// Quantos splinters existem espalhados na água funda da enseada.
export const FRAGMENTOS_POR_MAPA = 8;

function hash(x, y, seed = 0) {
  let h = Math.imul(Math.round(x * 71) + seed * 6151, 374761393)
    + Math.imul(Math.round(y * 83), 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Pontos de fragmento de maré em água funda. Estáticos por mapa, com
 * `id` estável (é ele que o save guarda como coletado).
 */
export function criarFragmentosDeMare(map, field) {
  const rows = map.aguaPraia;
  if (!rows || !field) return [];
  const minDist = 3.2;

  // Percorre o mapa em ordem ALEATÓRIA (mas determinística): uma varredura
  // de cima para baixo empilhava todos os fragmentos na primeira linha de
  // água funda, longe uns dos outros no papel mas todos na beirada norte.
  const celulas = [];
  for (let y = 1; y < rows.length - 1; y++) {
    for (let x = 1; x < (rows[y]?.length ?? 0) - 1; x++) {
      if ('YyDdX'.includes(rows[y][x])) celulas.push([x, y]);
    }
  }
  celulas.sort((a, b) => hash(a[0], a[1], 211) - hash(b[0], b[1], 211));

  const pontos = [];
  for (const [x, y] of celulas) {
    if (pontos.length >= FRAGMENTOS_POR_MAPA) break;
    const px = Math.min(field.width - 1, Math.floor((x + .5) * field.scale));
    const py = Math.min(field.height - 1, Math.floor((y + .5) * field.scale));
    if (field.distLand[py * field.width + px] < 1.9) continue;
    const wx = x + .5, wy = y + .5;
    if (pontos.some(p => Math.hypot(p.x - wx, p.y - wy) < minDist)) continue;
    pontos.push({ id: `${map.id}:${x},${y}`, x: wx, y: wy, fase: hash(x, y, 223) * Math.PI * 2 });
  }
  return pontos;
}

/** Progresso já coletado (Set de ids). Nunca cria save por leitura. */
export function fragmentosColetados(progress) {
  const lista = progress?.flags?.[COLETAVEIS_KEY];
  return new Set(Array.isArray(lista) ? lista : []);
}

function marcarColetado(progress, id) {
  progress.flags ??= {};
  const lista = Array.isArray(progress.flags[COLETAVEIS_KEY]) ? progress.flags[COLETAVEIS_KEY] : [];
  if (!lista.includes(id)) lista.push(id);
  progress.flags[COLETAVEIS_KEY] = lista;
}

/**
 * Estado por frame. `ctx`: { map, player, nado, progress, campos }
 * Devolve `{ evento, fragmentos }` — fragmentos visíveis e não coletados.
 */
export function atualizarMissaoMare(ctx) {
  const { map, player, nado, progress, fragmentos } = ctx;
  const out = { fragmentos: [], coletou: null, mergulhou: false, chegouAoFundo: false };
  if (!map || !player || !nado) return out;

  player.mareMissao ??= { estavaSubmerso: false };

  // --- mergulho: conta na ENTRADA no fundo ---
  const submerso = nado.ativo && nado.profundidade > 1.25;
  if (submerso && !player.mareMissao.estavaSubmerso) {
    out.mergulhou = true;
    recordQuestEvent(progress, { type: 'mergulho' });
    if (map.id === 'ilha_enseada_ecos') {
      out.chegouAoFundo = true;
      recordQuestEvent(progress, { type: 'reach', target: 'fundo_enseada' });
    }
  }
  player.mareMissao.estavaSubmerso = submerso;

  // --- fragmentos: só os que existem, ainda não pegos e perto o bastante ---
  const coletados = fragmentosColetados(progress);
  for (const frag of fragmentos ?? []) {
    if (coletados.has(frag.id)) continue;
    const perto = Math.hypot(player.x - frag.x, player.y - frag.y) < .85;
    if (perto && submerso) {
      marcarColetado(progress, frag.id);
      out.coletou = frag;
      recordQuestEvent(progress, { type: 'coleta_marinha' });
    } else {
      out.fragmentos.push(frag);
    }
  }

  return out;
}
