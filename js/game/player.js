import { iniciarVoo, atualizarVoo } from './nado-voo.js';
// js/game/player.js
// =====================================================================
// PLAYER
//
// Movimento por teclado e clique.
// Respeita:
// - paredes;
// - walkMask;
// - objetos;
// - NPCs;
// - dash e colisão em subpassos.
// =====================================================================

import { CONFIG } from '../config.js';
import { state } from './state.js';
import { input } from '../engine/input.js';

import {
  getFloor,
  nearestStandable,
} from './world.js';

import { moveWithCollision } from './collision.js';
import {
  criarEstadoNado, atualizarNado, podeNadar, aguaSobPonte, NADO, moverNaAgua, aguaDoDegrau, controlarMergulhoFixo,
} from './nado.js';
import { garantirArvore, direcaoDaAreia, DEGRAUS } from './nado-arvore.js';
import { getCoastFieldForMap } from '../engine/coast-field.js';
import { damagePlayer } from './health.js';
import { getDerivedStats } from './rpg.js';
import { recordMastery } from './mastery.js';
import { NUCLEO_FORMS, NUCLEO_VELOZ, getFormSpeedMultiplier } from '../data/nucleo-forms.js';

const CLICK_SNAP_DIST = 1.0;
// Aplicado apenas à locomoção da forma sustentada, não ao Q nem a trajes.
export const VELOZ_SPEED_MULTIPLIER = 1.8;

// A maestria de locomoção soma velocidade. A Forma Veloz tem ainda o próprio
// bônus cinético, que cresce conforme o jogador corre, anda e dá dash nela.
// A Quebra Sistemas carrega a inércia extrema no dado da forma: multiplicador
// abaixo de 1, aplicado do mesmo jeito (nada de número solto no renderer).
export function getPlayerMoveSpeed(progress, player) {
  const stats = getDerivedStats(progress, player);
  if (!stats) return CONFIG.PLAYER_SPEED;
  const form = progress?.archetype === 'nucleo_dez_forma'
    ? NUCLEO_FORMS[player?.nucleoForm] ?? null
    : null;
  const veloz = form?.id === NUCLEO_VELOZ;
  const mastery = 1 + stats.moveSpeedPct + (veloz ? stats.formSpeedPct : 0);
  const formMultiplier = veloz ? VELOZ_SPEED_MULTIPLIER : getFormSpeedMultiplier(form);
  return CONFIG.PLAYER_SPEED * formMultiplier * mastery;
}

// Distância é acumulada e enviada em blocos para não recalcular maestria
// a cada quadro.
let distanceBuffer = 0;
function trackDistance(progress, amount) {
  if (!(amount > 0)) return;
  distanceBuffer += amount;
  if (distanceBuffer < .5) return;
  recordMastery(progress, 'distance', distanceBuffer);
  distanceBuffer = 0;
}

const keyHeld = (...keys) =>
  keys.some(key => input.keys[key]);

function readKeyboardDirection() {
  const screenX =
    (keyHeld('d', 'arrowright') ? 1 : 0) -
    (keyHeld('a', 'arrowleft') ? 1 : 0);

  const screenY =
    (keyHeld('s', 'arrowdown') ? 1 : 0) -
    (keyHeld('w', 'arrowup') ? 1 : 0);

  if (screenX === 0 && screenY === 0) {
    return null;
  }

  let worldX;
  let worldY;

  if (CONFIG.SCREEN_RELATIVE_CONTROLS) {
    worldX = screenX + screenY;
    worldY = screenY - screenX;
  } else {
    worldX = screenX;
    worldY = screenY;
  }

  const length = Math.hypot(worldX, worldY) || 1;

  return {
    x: worldX / length,
    y: worldY / length,
  };
}

function updateFacing(dx, dy) {
  if (dx === 0 && dy === 0) return;

  const player = state.player;

  const screenDx = dx - dy;
  const screenDy = dx + dy;

  if (Math.abs(screenDx) > Math.abs(screenDy)) {
    player.facing = screenDx > 0 ? 'right' : 'left';
    player.dir = screenDx > 0 ? 1 : -1;
  } else {
    player.facing = screenDy > 0 ? 'down' : 'up';
  }
}

export function updatePlayer(dt) {
  const player = state.player;
  const map = getFloor();

  if (!map) return;

  // ---- NADO ----
  // `nado` vive no player (e não no mapa) porque o fôlego e a propulsão
  // são do personagem: trocar de mapa não devolve ar.
  // A ÁRVORE DE NADO mora no progresso (vai no save): o degrau decide até
  // onde o corpo entra no mar, quanto desce e quanto ar carrega.
  const arvore = map.aguaPraia ? garantirArvore(state.progress) : null;
  if (!player.nado) {
    player.nado = criarEstadoNado();
    // O respeito do mar nunca desce — nem ao recarregar o jogo.
    if (arvore) player.nado.respeito.valor = Math.max(0, Math.min(1, arvore.respeito ?? 0));
  }
  const nado = player.nado;
  const campoCosta = getCoastFieldForMap(map);
  // ESPAÇO = mergulhar (segurar). Em terra a tecla não faz nada.
  const mergulhoFixoDisponivel = state.progress?.archetype === 'mare_astral' && (arvore?.nivel ?? 0) >= 3;
  controlarMergulhoFixo(nado, mergulhoFixoDisponivel, input.pressed.has('z') || input.pressed.has('keyz'));
  let vooDir = null;
  // Só troca os controles depois que a perspectiva realmente está disponível.
  if (nado.perspectiva3d && nado.ativo && nado.profundidade > 1.25 && mergulhoFixoDisponivel) {
    nado.voo ??= iniciarVoo(nado);
    vooDir = atualizarVoo(nado.voo, {
      esquerda: keyHeld('a', 'arrowleft'), direita: keyHeld('d', 'arrowright'),
      descer: keyHeld('w', 'arrowup'), subir: keyHeld('s', 'arrowdown'),
    }, dt);
    // O impulso deve seguir para onde a câmera aponta, mesmo parado.
    nado.dirX = vooDir.x; nado.dirY = vooDir.y;
    if (vooDir.subir) nado.mergulhoFixo = false;
  } else if (!nado.ativo || nado.profundidade <= 1.25 || !nado.perspectiva3d) nado.voo = null;
  const querMergulhar = !vooDir?.subir && !!(input.keys[' '] || input.keys['space'] || nado.mergulhoFixo);
  const efeitoNado = atualizarNado(nado, {
    map, x: player.x, y: player.y, field: campoCosta, dt,
    tempo: performance.now() / 1000,
    // Ressaca deixa a correnteza mais forte e o fôlego mais curto: o
    // clima não é só visual, ele muda como o mar se comporta.
    clima: state.clima,
    arvore,
    mergulhar: querMergulhar,
    profundidadeAlvo: nado.voo?.profundidadeAlvo,
    mareAstral: state.progress?.archetype === 'mare_astral',
    // Futuras formas e equipamentos poderão fornecer esta capacidade aqui.
    mergulhoLivre: state.progress?.archetype === 'mare_astral',
  });
  if (efeitoNado.engoliuAgua || !nado.ativo) nado.mergulhoFixo = false;
  if (arvore && nado.respeito.valor > (arvore.respeito ?? 0)) arvore.respeito = nado.respeito.valor;
  // Onde este degrau pode nadar (sem árvore: mar inteiro, como antes).
  const aguaSuperficie = aguaDoDegrau(arvore ? arvore.nivel : null);
  const submerso = nado.mareAstral && nado.ativo && nado.profundidade > 1.25;
  const agua = submerso ? (m, x, y) => aguaSuperficie(m, x, y) || aguaSobPonte(m, x, y) : aguaSuperficie;
  // Eventos do nado para quem desenha HUD/mensagem (o main lê e limpa).
  player.nadoEventos ??= {};

  const radius = CONFIG.PLAYER_RADIUS;
  // `speed` está em TILES/S (CONFIG.PLAYER_SPEED = 4.0). Em terra o passo
  // é linear; na água quem integra a velocidade é `moverNaAgua`.
  const speed = getPlayerMoveSpeed(state.progress, player);
  const maxStep = speed * dt;

  let dx = 0;
  let dy = 0;

  // ---------------------------------------------------------------
  // Clique no chão.
  //
  // Se o clique caiu no vazio, parede ou prop, procura uma posição
  // válida próxima. Se não encontrar, ignora.
  // ---------------------------------------------------------------
  if (vooDir) { input.click = null; player.target = null; }
  if (input.click) {
    const clicked = input.click;
    input.click = null;

    if (agua(map, clicked.x, clicked.y)) {
      // Clique no mar: nada até lá. `nearestStandable` só conhece terra.
      player.target = { x: clicked.x, y: clicked.y };
    } else if (podeNadar(map, clicked.x, clicked.y)) {
      // Mar além do degrau: o clique não vira caminho (e o HUD explica).
      player.nadoEventos.limite = true;
    } else {
      const spot = nearestStandable(
        map,
        clicked.x,
        clicked.y,
        radius,
        CLICK_SNAP_DIST,
        player
      );

      if (spot) {
        player.target = spot;
      }
    }
  }

  // ---------------------------------------------------------------
  // Teclado tem prioridade sobre caminho por clique.
  // ---------------------------------------------------------------
  const keyboardDirection = vooDir ? (vooDir.ativo ? { x: vooDir.x, y: vooDir.y } : null) : readKeyboardDirection();

  if (keyboardDirection) {
    dx = keyboardDirection.x * maxStep;
    dy = keyboardDirection.y * maxStep;

    player.target = null;
  } else if (player.target) {
    const targetDx = player.target.x - player.x;
    const targetDy = player.target.y - player.y;

    const distance = Math.hypot(targetDx, targetDy);

    if (nado.ativo && distance < .16) {
      // Clique aquático chega ao ponto sem continuar deslizando depois dele.
      player.target = null;
      nado.vx = 0; nado.vy = 0;
    } else if (!nado.ativo && (distance <= maxStep || distance < 0.03)) {
      dx = targetDx;
      dy = targetDy;
      player.target = null;
    } else {
      dx = (targetDx / distance) * maxStep;
      dy = (targetDy / distance) * maxStep;
    }
  }

  // ---------------------------------------------------------------
  // Movimento robusto:
  // usa subpassos + colisão + slide.
  // ---------------------------------------------------------------
  const beforeX = player.x, beforeY = player.y;

  // ---- ÁGUA: deslocamento com inércia, correnteza e planeio ----
  // Em vez de "andar devagar", o corpo persegue a direção e desliza. É o
  // coração da locomoção aquática — e é o que o `moveWithCollision` não
  // sabe fazer, porque lá cada passo é instantâneo.
  let moved;
  // Comando de direção neste quadro (a prova de boiar exige NENHUM).
  player.nadoParado = !keyboardDirection && !player.target;
  // MEDO (degrau 0 no mar) e FUNDO DEMAIS (além do alcance do degrau): o
  // corpo não obedece, volta sozinho para a areia. O caminho de volta usa
  // o mar inteiro para nunca ficar preso atrás do próprio limite, e o
  // recuo continua por um instante em terra — senão o operador pararia
  // com o calcanhar na água e o susto se repetiria no quadro seguinte.
  const devolvendo = nado.medo || nado.foraDoAlcance;
  if (devolvendo) {
    const volta = direcaoDaAreia(map, player.x, player.y);
    if (volta.x || volta.y) player.recuoNado = { x: volta.x, y: volta.y, tempo: nado.medo ? .32 : .12 };
    player.target = null;
  }
  const recuo = player.recuoNado;
  if (devolvendo || nado.ativo) {
    let dir = keyboardDirection
      ? { x: keyboardDirection.x, y: keyboardDirection.y }
      : player.target
        ? { x: player.target.x - player.x, y: player.target.y - player.y }
        : { x: 0, y: 0 };
    if (devolvendo && recuo) dir = recuo;
    // Aproximação suave para clique, sem afetar controle manual nem recuo.
    const distanciaAlvo = !keyboardDirection && player.target && !devolvendo
      ? Math.hypot(player.target.x - player.x, player.target.y - player.y) : Infinity;
    const velocidade = devolvendo ? speed / DEGRAUS[nado.nivel ?? 4].velocidade * .8
      : speed * Math.min(1, Math.max(.18, distanciaAlvo / 1.4));
    const passo = moverNaAgua(nado, dt, dir.x, dir.y, velocidade);
    const antesX = player.x, antesY = player.y;
    moved = moveWithCollision(map, player, passo.dx, passo.dy, radius, devolvendo ? podeNadar : agua, { submerso: submerso && !devolvendo });
    // Bateu no limite do degrau: queria ir, a água existe, o degrau não deixa.
    if (!devolvendo && (dir.x || dir.y)) {
      const m = Math.hypot(dir.x, dir.y) || 1;
      const fx = player.x + dir.x / m * .45, fy = player.y + dir.y / m * .45;
      const andou = Math.hypot(player.x - antesX, player.y - antesY);
      if (andou < Math.hypot(passo.dx, passo.dy) * .5 && podeNadar(map, fx, fy) && !agua(map, fx, fy)) {
        player.nadoEventos.limite = true;
        // Sem embalo contra a boia: o corpo não fica "empurrando o limite".
        nado.vx *= .6; nado.vy *= .6;
      }
    }
  } else if (recuo && recuo.tempo > 0) {
    // Já em terra, ainda recuando do susto: uns passos para trás.
    recuo.tempo -= dt;
    const passo = speed * .7 * dt;
    // (com o predicado do mar: quem está na beira só sai dela por ele)
    moved = moveWithCollision(map, player, recuo.x * passo, recuo.y * passo, radius, podeNadar);
    player.target = null;
    dx = recuo.x * passo; dy = recuo.y * passo;
    if (recuo.tempo <= 0) player.recuoNado = null;
  } else {
    const antesX = player.x, antesY = player.y;
    moved = moveWithCollision(map, player, dx, dy, radius, agua);
    // Em terra, andando para um mar que o degrau não alcança.
    if ((dx || dy) && arvore && Math.hypot(player.x - antesX, player.y - antesY) < Math.hypot(dx, dy) * .5) {
      const m = Math.hypot(dx, dy) || 1;
      const fx = player.x + dx / m * .55, fy = player.y + dy / m * .55;
      if (podeNadar(map, fx, fy) && !agua(map, fx, fy)) player.nadoEventos.limite = true;
    }
  }
  if (efeitoNado.susto) player.nadoEventos.susto = true;
  if (efeitoNado.engoliuAgua) player.nadoEventos.engoliu = true;

  player.moving = moved;
  if (moved) trackDistance(state.progress, Math.hypot(player.x - beforeX, player.y - beforeY));

  if (dx !== 0 || dy !== 0) {
    updateFacing(dx, dy);
  }

  if (!moved && player.target && !keyboardDirection) {
    player.target = null;
  }

  // Afogamento: usa o mesmo caminho de dano do resto do jogo (invencibilidade,
  // texto de dano, morte e respawn já vêm de graça). O "pulo" de ~1 s evita
  // drenar vida quadro a quadro e deixar o dano ilegível.
  player.afogamentoAcumulado = (player.afogamentoAcumulado ?? 0) + efeitoNado.dano;
  if (player.afogamentoAcumulado >= 12) {
    player.afogamentoAcumulado = 0;
    damagePlayer(player, state.progress, NADO.danoAfogamento, 'afogamento');
  }
  // O susto de quem tem medo da água custa pouco, mas custa: é o que
  // manda o operador procurar a poça em vez de insistir no mar.
  if (efeitoNado.susto) damagePlayer(player, state.progress, NADO.danoSusto, 'medo_da_agua');
}