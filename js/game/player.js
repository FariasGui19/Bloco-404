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
  criarEstadoNado, atualizarNado, multiplicadorVelocidade,
  podeNadar, destinoValido, NADO, moverNaAgua, ganharRespeito,
} from './nado.js';
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
  player.nado ??= criarEstadoNado();
  const nado = player.nado;
  const campoCosta = getCoastFieldForMap(map);
  const efeitoNado = atualizarNado(nado, {
    map, x: player.x, y: player.y, field: campoCosta, dt,
    tempo: performance.now() / 1000,
    // Ressaca deixa a correnteza mais forte e o fôlego mais curto: o
    // clima não é só visual, ele muda como o mar se comporta.
    clima: state.clima,
  });

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
  if (input.click) {
    const clicked = input.click;
    input.click = null;

    if (podeNadar(map, clicked.x, clicked.y)) {
      // Clique no mar: nada até lá. `nearestStandable` só conhece terra.
      player.target = { x: clicked.x, y: clicked.y };
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
  const keyboardDirection = readKeyboardDirection();

  if (keyboardDirection) {
    dx = keyboardDirection.x * maxStep;
    dy = keyboardDirection.y * maxStep;

    player.target = null;
  } else if (player.target) {
    const targetDx = player.target.x - player.x;
    const targetDy = player.target.y - player.y;

    const distance = Math.hypot(targetDx, targetDy);

    if (distance <= maxStep || distance < 0.03) {
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
  if (nado.ativo) {
    const dir = keyboardDirection
      ? { x: keyboardDirection.x, y: keyboardDirection.y }
      : player.target
        ? { x: player.target.x - player.x, y: player.target.y - player.y }
        : { x: 0, y: 0 };
    const passo = moverNaAgua(nado, dt, dir.x, dir.y, speed);
    moved = moveWithCollision(map, player, passo.dx, passo.dy, radius, podeNadar);
    // Respeito do mar sobe nadando fundo (a curva de progressão).
    if (nado.submerso) ganharRespeito(nado.respeito, NADO.respeitoPorSegundo * dt);
  } else {
    moved = moveWithCollision(map, player, dx, dy, radius, podeNadar);
  }

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
}