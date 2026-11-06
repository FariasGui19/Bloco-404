// =====================================================================
//  DEBUG MODE
//
//  Ferramenta interna de desenvolvimento.
//  Tecla H liga/desliga.
//
//  Mostra:
//  - hitbox do player;
//  - hitboxes de objetos sólidos; 
//  - alcance de interação;
//  - tiles de portais;
//  - IDs técnicos;
//  - interação ativa.
// =====================================================================

import { input } from '../engine/input.js';
import { getObjectHitbox } from './collision.js';

let enabled = false;

const DEFAULT_INTERACTION_DISTANCE = 1.35;

// ---------------------------------------------------------------------
// Controle
// ---------------------------------------------------------------------

export function updateDebugInput() {
  const pressedH =
    input.pressed.has('h') ||
    input.pressed.has('keyh');

  if (!pressedH) return;

  enabled = !enabled;

  console.log(
    `[DEBUG] Modo debug: ${enabled ? 'ATIVADO' : 'DESATIVADO'}`
  );
}

export function isDebugEnabled() {
  return enabled;
}

// ---------------------------------------------------------------------
// Desenho
//
// Esta função recebe ctx já transformado para o espaço isométrico.
// Ou seja: desenhamos usando coordenadas de mundo.
// ---------------------------------------------------------------------

export function drawDebugWorld(ctx, map, state, tileW, tileH) {
  if (!enabled || !map) return;

  const halfW = tileW / 2;
  const halfH = tileH / 2;

  ctx.save();

  // ---------------------------------------------------------------
  // PLAYER
  // ---------------------------------------------------------------
  drawPlayerRadius(ctx, state.player, halfW, halfH);

  // ---------------------------------------------------------------
  // OBJETOS
  // ---------------------------------------------------------------
  for (const object of state.objects ?? []) {
    drawObjectDebug(ctx, object, halfW, halfH);
  }

  // ---------------------------------------------------------------
  // NPCs
  // ---------------------------------------------------------------
  for (const actor of state.actors ?? []) {
    drawActorDebug(ctx, actor, halfW, halfH);
  }

  // ---------------------------------------------------------------
  // PORTAIS
  // ---------------------------------------------------------------
  for (const rawPortal of state.portals ?? []) {
    drawPortalDebug(ctx, rawPortal, halfW, halfH);
  }

  // ---------------------------------------------------------------
  // Interação ativa recebe destaque branco.
  // ---------------------------------------------------------------
  drawActiveInteraction(ctx, state.interaction.active, halfW, halfH);

  // ---------------------------------------------------------------
  // Informações do player no mundo.
  // ---------------------------------------------------------------
  drawPlayerInfo(ctx, state.player, halfW, halfH);

  ctx.restore();
}

// =====================================================================
//  HELPERS ISOMÉTRICOS
// =====================================================================

function worldToIso(x, y, halfW, halfH) {
  return {
    x: (x - y) * halfW,
    y: (x + y) * halfH,
  };
}

function drawWorldRect(ctx, x, y, width, height, halfW, halfH, color, lineWidth = 1) {
  const a = worldToIso(x, y, halfW, halfH);
  const b = worldToIso(x + width, y, halfW, halfH);
  const c = worldToIso(x + width, y + height, halfW, halfH);
  const d = worldToIso(x, y + height, halfW, halfH);

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawWorldCircle(ctx, x, y, radius, halfW, halfH, color, lineWidth = 1) {
  const point = worldToIso(x, y, halfW, halfH);

  ctx.beginPath();
  ctx.ellipse(
    point.x,
    point.y,
    radius * halfW,
    radius * halfH,
    0,
    0,
    Math.PI * 2
  );

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawWorldLabel(ctx, text, x, y, halfW, halfH, color = '#ffffff') {
  const point = worldToIso(x, y, halfW, halfH);

  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;

  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, point.x, point.y);

  ctx.fillStyle = color;
  ctx.fillText(text, point.x, point.y);
}

function getInteractionDistance(item) {
  return (
    item.interacao?.distancia ??
    item.interactionDistance ??
    DEFAULT_INTERACTION_DISTANCE
  );
}

// =====================================================================
//  PLAYER
// =====================================================================

function drawPlayerRadius(ctx, player, halfW, halfH) {
  const radius = 0.25;

  drawWorldCircle(
    ctx,
    player.x,
    player.y,
    radius,
    halfW,
    halfH,
    '#ff4fb8',
    1.5
  );

  drawWorldLabel(
    ctx,
    'PLAYER',
    player.x,
    player.y - 0.45,
    halfW,
    halfH,
    '#ff9dd5'
  );
}

function drawPlayerInfo(ctx, player, halfW, halfH) {
  const text =
    `X:${player.x.toFixed(2)} Y:${player.y.toFixed(2)}`;

  drawWorldLabel(
    ctx,
    text,
    player.x,
    player.y + 0.55,
    halfW,
    halfH,
    '#ff9dd5'
  );
}

// =====================================================================
//  OBJETOS
// =====================================================================

function drawObjectDebug(ctx, object, halfW, halfH) {
  // ---------------------------------------------------------------
  // Hitboxes físicas: verde.
  //
  // Suporta hitbox única e múltiplas hitboxes.
  // ---------------------------------------------------------------
  if (Array.isArray(object.hitboxes) && object.hitboxes.length > 0) {
    for (const hitbox of object.hitboxes) {
      const box = {
        x: object.x + (hitbox.offsetX ?? -0.30),
        y: object.y + (hitbox.offsetY ?? -0.30),
        width: hitbox.width ?? 0.60,
        height: hitbox.height ?? 0.60,
      };

      drawWorldRect(
        ctx,
        box.x,
        box.y,
        box.width,
        box.height,
        halfW,
        halfH,
        '#40ff75',
        1.5
      );
    }
  } else {
    const hitbox = getObjectHitbox(object);

    if (hitbox) {
      drawWorldRect(
        ctx,
        hitbox.x,
        hitbox.y,
        hitbox.width,
        hitbox.height,
        halfW,
        halfH,
        '#40ff75',
        1.5
      );
    }
  }

  // Alcance de interação: azul.
  if (object.interacao) {
    drawWorldCircle(
      ctx,
      object.x,
      object.y,
      getInteractionDistance(object),
      halfW,
      halfH,
      '#31baff',
      1
    );
  }

  // ID do objeto.
  drawWorldLabel(
    ctx,
    object.id ?? 'object',
    object.x,
    object.y - 0.46,
    halfW,
    halfH,
    object.bloqueia ? '#40ff75' : '#aeb8c0'
  );
}

// =====================================================================
//  NPCs
// =====================================================================

function drawActorDebug(ctx, actor, halfW, halfH) {
  const hasInteraction =
    actor.interacao ||
    actor.dialogue ||
    actor.fala;

  if (hasInteraction) {
    drawWorldCircle(
      ctx,
      actor.x,
      actor.y,
      getInteractionDistance(actor),
      halfW,
      halfH,
      '#31baff',
      1
    );
  }

  drawWorldLabel(
    ctx,
    actor.id ?? 'actor',
    actor.x,
    actor.y - 0.46,
    halfW,
    halfH,
    '#31baff'
  );
}

// =====================================================================
//  PORTAIS
// =====================================================================

function drawPortalDebug(ctx, portal, halfW, halfH) {
  // Nos dados, portais usam x/y de tile inteiro.
  const x = portal.x;
  const y = portal.y;

  // Tile do portal: amarelo.
  drawWorldRect(
    ctx,
    x,
    y,
    1,
    1,
    halfW,
    halfH,
    '#ffd54f',
    2
  );

  // Alcance de interação do portal: amarelo transparente.
  drawWorldCircle(
    ctx,
    x + 0.5,
    y + 0.5,
    getInteractionDistance(portal),
    halfW,
    halfH,
    '#ffdf79',
    1
  );

  drawWorldLabel(
    ctx,
    portal.id ?? 'portal',
    x + 0.5,
    y + 0.12,
    halfW,
    halfH,
    portal.bloqueado ? '#ff5c6c' : '#ffd54f'
  );
}

// =====================================================================
//  INTERAÇÃO ATIVA
// =====================================================================

function drawActiveInteraction(ctx, active, halfW, halfH) {
  if (!active?.data) return;

  const { kind, data } = active;

  let x = data.x;
  let y = data.y;

  // Portais em runtime são cópias centralizadas no interactions.js.
  // Mas protegemos caso algum formato mude no futuro.
  if (kind === 'portal' && Number.isInteger(x) && Number.isInteger(y)) {
    x += 0.5;
    y += 0.5;
  }

  drawWorldCircle(
    ctx,
    x,
    y,
    0.22,
    halfW,
    halfH,
    '#ffffff',
    2
  );

  drawWorldLabel(
    ctx,
    `ATIVO: ${data.id ?? kind}`,
    x,
    y - 0.75,
    halfW,
    halfH,
    '#ffffff'
  );
}