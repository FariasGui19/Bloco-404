// js/game/npc-brain.js
// =====================================================================
// CÉREBRO DOS NPCs
//
// NEXO-04:
// - ronda;
// - olha para o player;
// - conversa com poses;
// - solta comentários ambientais.
//
// Robô L-7:
// - escolhe destino seguro;
// - verifica caminho antes de andar;
// - respeita colisões;
// - limpa, dorme, pausa;
// - se trava, tenta se destravar.
// =====================================================================

import { CONFIG } from '../config.js';
import { updateLobbyVisitor } from './viajante-saguao.js';
import { state } from './state.js';
import { input } from '../engine/input.js';
import { getCurrentMap } from './map-manager.js';
import { canStandAt } from './collision.js';
import { isDialogueOpen } from '../ui/dialogue.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (lista) => lista[Math.floor(Math.random() * lista.length)];

// =====================================================================
// DIREÇÕES
// =====================================================================

// Direção visual na tela para NPC humanoide.
function dirTela(dx, dy) {
  const sx = dx - dy;
  const sy = (dx + dy) / 2;

  if (Math.abs(sx) > Math.abs(sy)) {
    return sx > 0 ? 'right' : 'left';
  }

  return sy > 0 ? 'down' : 'up';
}

// Player está visualmente à direita do NPC?
const playerADireita = (actor, player) =>
  (player.x - actor.x) - (player.y - actor.y) > 0;

// Direção diagonal visual para o robô.
function dirDiag(dx, dy) {
  const sx = dx - dy;
  const sy = (dx + dy) / 2;

  if (sy >= 0) {
    return sx >= 0 ? 'se' : 'sw';
  }

  return sx >= 0 ? 'ne' : 'nw';
}

// =====================================================================
// BALÕES AMBIENTAIS
// =====================================================================

export function say(actor, texto, tempo) {
  if (!texto) return;

  const total = tempo ?? Math.min(6, 2 + texto.length * 0.045);

  actor.bark = {
    texto,
    timer: total,
    total,
  };
}

const FALAS = {
  saudacao: [
    'Olá, viajante!',
    'Bem-vindo ao Bloco 404.',
    'Precisa de algo?',
  ],

  tchau: [
    'Boa viagem!',
    'Até logo, viajante.',
    'Volte sempre.',
  ],

  ajuda: [
    'Precisa de ajuda? Aperte [E].',
    'Pode falar comigo. Eu não mordo.',
  ],

  corrida: [
    'Sem correr no saguão, por favor!',
    'Ei! Devagar aí!',
  ],

  ambiente: [
    'Mantenha o foco no saguão, operador.',
    'Verificando integridade das dimensões...',
    'Precisa de ajuda com os elevadores?',
    'Dados multiversais sincronizados.',
  ],
};

const falas = (actor, chave) =>
  actor.falas?.[chave] ?? FALAS[chave];

// =====================================================================
// ROTA PADRÃO DO NEXO
// =====================================================================

function rotaPadrao(home) {
  return [
    { x: home.x, y: home.y, pose: 'tablet', pausa: 4 },
    { x: home.x - 2.5, y: home.y, pose: 'idle', pausa: 3 },
    { x: home.x, y: home.y, pose: 'phone', pausa: 4 },
    { x: home.x, y: home.y + 2, pose: 'idle', pausa: 3 },
  ];
}

// =====================================================================
// COLISÃO GENÉRICA DE NPC
// =====================================================================

function podeIr(actor, map, x, y, extraRadius = 0) {
  const player = state.player;
  const radius =
    (actor.raio ?? CONFIG.NPC_RADIUS ?? 0.28) + extraRadius;

  // NPC não anda por cima do player.
  const minPlayerDistance =
    radius + (CONFIG.PLAYER_RADIUS ?? 0.25);

  if (Math.hypot(x - player.x, y - player.y) < minPlayerDistance) {
    return false;
  }

  // Evita que o ator colida com ele mesmo.
  const wasSolid = actor.solido;
  actor.solido = false;

  const allowed = canStandAt(
    map,
    x,
    y,
    radius,
    actor
  );

  actor.solido = wasSolid;

  return allowed;
}

// Movimento do NEXO em rota simples.
function andar(actor, brain, map, alvo, dt) {
  const dx = alvo.x - actor.x;
  const dy = alvo.y - actor.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 0.06) {
    actor.x = alvo.x;
    actor.y = alvo.y;
    return 'chegou';
  }

  const step = Math.min(
    distance,
    (actor.velocidade ?? 1.1) * dt
  );

  const moveX = (dx / distance) * step;
  const moveY = (dy / distance) * step;

  let moved = false;

  if (podeIr(actor, map, actor.x + moveX, actor.y + moveY)) {
    actor.x += moveX;
    actor.y += moveY;
    moved = true;
  } else if (podeIr(actor, map, actor.x + moveX, actor.y)) {
    actor.x += moveX;
    moved = true;
  } else if (podeIr(actor, map, actor.x, actor.y + moveY)) {
    actor.y += moveY;
    moved = true;
  }

  if (moved) {
    actor.moving = true;
    actor.facing = dirTela(dx, dy);
    brain.preso = 0;
    return 'andando';
  }

  brain.preso += dt;

  return brain.preso > 1.5
    ? 'preso'
    : 'andando';
}

// =====================================================================
// DIÁLOGO ATIVO
// =====================================================================

function quemFala() {
  if (!isDialogueOpen()) {
    return null;
  }

  if (state.interaction?.talkingTo) {
    return state.interaction.talkingTo;
  }

  // Plano B: NPC interativo mais próximo.
  const player = state.player;

  let nearest = null;
  let nearestDistance = (CONFIG.TALK_DIST ?? 1.8) * 1.5;

  for (const actor of state.actors ?? []) {
    if (actor.tipo === 'robo') continue;

    const distance = Math.hypot(
      player.x - actor.x,
      player.y - actor.y
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = actor;
    }
  }

  return nearest;
}

// =====================================================================
// UPDATE PRINCIPAL
// =====================================================================

export function updateNpcBrains(dt) {
  const map = getCurrentMap();
  const falando = quemFala();

  for (const actor of state.actors ?? []) {
    if (actor.bark) {
      actor.bark.timer -= dt;

      if (actor.bark.timer <= 0) {
        actor.bark = null;
      }
    }

    if (actor.tipo === 'viajante_ambiental') {
      if (!falando && !isDialogueOpen()) updateLobbyVisitor(actor, state.player, map, dt);
      else actor.moving = false;
      continue;
    }
    if (actor.tipo === 'robo') {
      updateRobo(actor, dt, map);
      continue;
    }

    updateNpc(actor, dt, map, actor === falando);
  }

  if (!isDialogueOpen() && state.interaction) {
    state.interaction.talkingTo = null;
  }
}

// =====================================================================
// NEXO-04
// =====================================================================

function updateNpc(actor, dt, map, falando) {
  const player = state.player;

  const brain = (actor._b ??= {
    home: { x: actor.x, y: actor.y },
    idx: 0,
    estado: 'pausa',
    t: rand(2, 4),
    preso: 0,
    perto: false,
    falava: false,
    aceno: 0,
    gesto: false,
    gestoT: 0.6,
    parado: 0,
    cdSaud: 0,
    cdAjuda: 0,
    cdCorr: 0,
    cdAmb: rand(8, 14),
  });

  brain.rota ??= actor.rota ?? rotaPadrao(brain.home);

  brain.cdSaud -= dt;
  brain.cdAjuda -= dt;
  brain.cdCorr -= dt;
  brain.cdAmb -= dt;

  const dx = player.x - actor.x;
  const dy = player.y - actor.y;
  const distance = Math.hypot(dx, dy);

  const perto =
    distance < (CONFIG.TALK_DIST ?? 1.8) + 0.4;

  actor.moving = false;
  actor.poseFlip = false;

  // ---------------------------------------------------------------
  // Conversando.
  // ---------------------------------------------------------------
  if (falando) {
    if (!brain.falava) {
      brain.falava = true;
      brain.gesto = false;
      brain.gestoT = 0.6;
      actor.bark = null;
    }

    brain.gestoT -= dt;

    if (brain.gestoT <= 0) {
      brain.gesto = !brain.gesto;

      brain.gestoT = brain.gesto
        ? rand(0.9, 1.4)
        : rand(1.4, 2.6);
    }

    actor.facing = dirTela(dx, dy);

    actor.pose = brain.gesto
      ? 'point'
      : 'idle';

    actor.poseFlip =
      brain.gesto &&
      playerADireita(actor, player);

    return;
  }

  // ---------------------------------------------------------------
  // Conversa terminou.
  // ---------------------------------------------------------------
  if (brain.falava) {
    brain.falava = false;
    brain.aceno = 1;
    brain.cdSaud = 10;
    brain.cdAjuda = 30;

    say(actor, pick(falas(actor, 'tchau')));
  }

  // ---------------------------------------------------------------
  // Player chegou perto.
  // ---------------------------------------------------------------
  if (perto && !brain.perto && brain.cdSaud <= 0) {
    brain.aceno = 1.2;
    brain.cdSaud = 12;

    say(actor, pick(falas(actor, 'saudacao')));
  }

  brain.perto = perto;

  if (brain.aceno > 0) {
    brain.aceno -= dt;
    actor.facing = dirTela(dx, dy);
    actor.pose = 'wave';
    return;
  }

  // ---------------------------------------------------------------
  // Player perto: NEXO para e presta atenção.
  // ---------------------------------------------------------------
  if (perto) {
    actor.facing = dirTela(dx, dy);
    actor.pose = 'idle';

    brain.parado = player.moving
      ? 0
      : brain.parado + dt;

    if (brain.parado > 5 && brain.cdAjuda <= 0) {
      say(actor, pick(falas(actor, 'ajuda')));
      brain.cdAjuda = 30;
    }

    return;
  }

  // ---------------------------------------------------------------
  // Player correndo perto.
  // ---------------------------------------------------------------
  if (
    player.moving &&
    input.keys?.shift &&
    distance < 5 &&
    brain.cdCorr <= 0
  ) {
    say(actor, pick(falas(actor, 'corrida')));
    brain.cdCorr = 20;
  }

  // ---------------------------------------------------------------
  // Ronda.
  // ---------------------------------------------------------------
  if (!map) return;

  const point = brain.rota[brain.idx];

  if (brain.estado === 'andando') {
    actor.pose = 'idle';

    const result = andar(
      actor,
      brain,
      map,
      point,
      dt
    );

    if (result === 'chegou') {
      brain.estado = 'pausa';
      brain.t = point.pausa ?? rand(2.5, 4.5);
    } else if (result === 'preso') {
      brain.estado = 'pausa';
      brain.t = 0.5;
      brain.preso = 0;
    }
  } else {
    actor.pose = point.pose ?? 'idle';

    actor.facing =
      actor.pose === 'idle' && distance < 7
        ? dirTela(dx, dy)
        : (point.olhar ?? actor.facingPadrao ?? 'down');

    brain.t -= dt;

    if (brain.t <= 0) {
      brain.idx =
        (brain.idx + 1) % brain.rota.length;

      brain.estado = 'andando';
    }
  }

  if (distance < 9 && brain.cdAmb <= 0 && !actor.bark) {
    say(actor, pick(falas(actor, 'ambiente')));
    brain.cdAmb = rand(14, 24);
  }
}


// ---------------------------------------------------------------------
// Movimento sólido do robô.
// ---------------------------------------------------------------------

function moverRoboComColisao(robo, map, dx, dy) {
  const raio = Math.max(robo.raio ?? 0.22, 0.30);

  const maxPasso = 0.035;
  const distancia = Math.hypot(dx, dy);

  if (distancia <= 0) {
    return false;
  }

  const passos = Math.max(
    1,
    Math.ceil(distancia / maxPasso)
  );

  const passoX = dx / passos;
  const passoY = dy / passos;

  let moved = false;

  for (let i = 0; i < passos; i++) {
    // Movimento diagonal ideal.
    if (canStandAt(
      map,
      robo.x + passoX,
      robo.y + passoY,
      raio,
      robo
    )) {
      robo.x += passoX;
      robo.y += passoY;
      moved = true;
      continue;
    }

    // Movimento em X.
    const canMoveX =
      passoX !== 0 &&
      canStandAt(
        map,
        robo.x + passoX,
        robo.y,
        raio,
        robo
      );

    // Movimento em Y.
    const canMoveY =
      passoY !== 0 &&
      canStandAt(
        map,
        robo.x,
        robo.y + passoY,
        raio,
        robo
      );

    if (canMoveX) {
      robo.x += passoX;
      moved = true;
    }

    if (canMoveY) {
      robo.y += passoY;
      moved = true;
    }

    // Não há como seguir.
    if (!canMoveX && !canMoveY) {
      break;
    }
  }

  return moved;
}

// ---------------------------------------------------------------------
// Caminho direto livre.
//
// O robô só escolhe destino se todos os pontos da linha entre ele e o
// destino forem livres.
// ---------------------------------------------------------------------

function caminhoDiretoLivre(robo, map, destinoX, destinoY) {
  const dx = destinoX - robo.x;
  const dy = destinoY - robo.y;

  const distancia = Math.hypot(dx, dy);

  if (distancia < 0.05) {
    return true;
  }

  const raio = Math.max(robo.raio ?? 0.22, 0.30);

  const passos = Math.max(
    1,
    Math.ceil(distancia / 0.10)
  );

  for (let i = 1; i <= passos; i++) {
    const t = i / passos;

    const x = robo.x + dx * t;
    const y = robo.y + dy * t;

    if (!canStandAt(map, x, y, raio, robo)) {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------
// Escolhe destino seguro.
//
// Ele precisa:
// - estar livre;
// - ter saída mínima ao redor;
// - possuir caminho reto livre.
// ---------------------------------------------------------------------

function escolherDestinoSeguro(robo, map, home, raioPasseio, tentativas) {
  const raioBase = raioPasseio ?? 4;

  // Depois de várias falhas, reduz o território para evitar cantos.
  const raio = tentativas >= 2
    ? Math.max(1.6, raioBase * 0.55)
    : raioBase;

  const margem = Math.max(
    robo.raio ?? 0.22,
    0.30
  ) + 0.20;

  for (let i = 0; i < 48; i++) {
    const x = home.x + rand(-raio, raio);
    const y = home.y + rand(-raio, raio);

    // O destino em si deve ser livre.
    if (!podeIr(robo, map, x, y)) {
      continue;
    }

    // Evita pontos encurralados.
    const possuiSaida =
      podeIr(robo, map, x + margem, y) ||
      podeIr(robo, map, x - margem, y) ||
      podeIr(robo, map, x, y + margem) ||
      podeIr(robo, map, x, y - margem);

    if (!possuiSaida) {
      continue;
    }

    // Evita destino atrás de banco, recepção ou parede.
    if (!caminhoDiretoLivre(robo, map, x, y)) {
      continue;
    }

    return { x, y };
  }

  return null;
}

// ---------------------------------------------------------------------
// Tenta tirar o robô de uma situação presa.
// ---------------------------------------------------------------------

function destravarRobo(robo, map) {
  const raio = Math.max(robo.raio ?? 0.22, 0.30);

  const distances = [
    0.25,
    0.45,
    0.65,
    0.90,
    1.15,
    1.45,
  ];

  const totalDirections = 24;

  for (const distance of distances) {
    for (let i = 0; i < totalDirections; i++) {
      const angle = (Math.PI * 2 * i) / totalDirections;

      const x = robo.x + Math.cos(angle) * distance;
      const y = robo.y + Math.sin(angle) * distance;

      if (canStandAt(map, x, y, raio, robo)) {
        robo.x = x;
        robo.y = y;
        return true;
      }
    }
  }

  return false;
}

// ---------------------------------------------------------------------
// Pontos de fallback perto da origem.
//
// Se não existe destino aleatório bom, o robô vai para um destes,
// desde que o caminho esteja livre.
// ---------------------------------------------------------------------

function escolherFallbackSeguro(robo, map, home) {
  const candidates = [
    { x: home.x, y: home.y },
    { x: home.x + 0.7, y: home.y },
    { x: home.x - 0.7, y: home.y },
    { x: home.x, y: home.y + 0.7 },
    { x: home.x, y: home.y - 0.7 },
    { x: home.x + 0.7, y: home.y + 0.7 },
    { x: home.x - 0.7, y: home.y - 0.7 },
  ];

  for (const candidate of candidates) {
    if (
      podeIr(robo, map, candidate.x, candidate.y) &&
      caminhoDiretoLivre(
        robo,
        map,
        candidate.x,
        candidate.y
      )
    ) {
      return candidate;
    }
  }

  return null;
}

// ---------------------------------------------------------------------
// Update do robô.
// ---------------------------------------------------------------------

function updateRobo(robo, dt, map) {
  if (!map) return;

  const player = state.player;

  const runtime = (robo._r ??= {
    estado: 'pausa',
    t: rand(1, 3),
    alvo: null,
    preso: 0,
    falhas: 0,
    home: { x: robo.x, y: robo.y },
  });

  robo.moving = false;
  robo.dir ??= 'sw';

  // ---------------------------------------------------------------
  // Player perto: reação visual.
  //
  // Não altera runtime.estado. Assim, quando o player sair, o robô
  // continua exatamente a rotina que já estava fazendo.
  // ---------------------------------------------------------------
  const playerDistance = Math.hypot(
    player.x - robo.x,
    player.y - robo.y
  );

  const playerNear =
    playerDistance < 1.3 &&
    runtime.estado !== 'dormindo';

  if (playerNear) {
    robo.dir = dirDiag(
      player.x - robo.x,
      player.y - robo.y
    );
  }

  // ---------------------------------------------------------------
  // ANDANDO
  // ---------------------------------------------------------------
  if (runtime.estado === 'andando') {
    if (!runtime.alvo) {
      runtime.estado = 'pausa';
      runtime.t = 0.8;
      return;
    }

    const dx = runtime.alvo.x - robo.x;
    const dy = runtime.alvo.y - robo.y;
    const distance = Math.hypot(dx, dy);

    // Chegou.
    if (distance < 0.10) {
      const roll = Math.random();

      if (roll < 0.55) {
        runtime.estado = 'limpando';
        runtime.t = rand(2, 4);
      } else if (roll < 0.65) {
        runtime.estado = 'dormindo';
        runtime.t = rand(5, 9);
      } else {
        runtime.estado = 'pausa';
        runtime.t = rand(0.8, 1.8);
      }

      runtime.alvo = null;
      runtime.preso = 0;
      runtime.falhas = 0;
      return;
    }

    const step = Math.min(
      distance,
      (robo.velocidade ?? 0.9) * dt
    );

    const moveX = (dx / distance) * step;
    const moveY = (dy / distance) * step;

    const moved = moverRoboComColisao(
      robo,
      map,
      moveX,
      moveY
    );

    if (moved) {
      robo.moving = true;
      robo.dir = dirDiag(dx, dy);

      runtime.preso = 0;

      // Mostra expressão feliz, mas sem travar a rotina.
      robo.estado = playerNear
        ? 'feliz'
        : null;

      return;
    }

    // -------------------------------------------------------------
    // Não conseguiu mover: cancela o destino e se recupera.
    // -------------------------------------------------------------
    runtime.preso += dt;

    if (runtime.preso > 0.40) {
      runtime.preso = 0;
      runtime.falhas++;

      robo.estado = 'bravo';
      say(robo, '!', 1);

      // Tenta sair de dentro de hitbox/canto.
      destravarRobo(robo, map);

      // Destino atual é descartado.
      runtime.alvo = null;
      runtime.estado = 'pausa';
      runtime.t = 0.8;
    }

    return;
  }

  // ---------------------------------------------------------------
  // ESTADOS PARADOS
  // ---------------------------------------------------------------

  // Estado visual.
  if (playerNear && runtime.estado !== 'dormindo') {
    robo.estado = 'feliz';
  } else {
    robo.estado =
      runtime.estado === 'pausa'
        ? null
        : runtime.estado;
  }

  runtime.t -= dt;

  if (runtime.t > 0) {
    return;
  }

  // ---------------------------------------------------------------
  // ESCOLHER NOVO DESTINO
  // ---------------------------------------------------------------

  const raioPasseio = robo.raioPasseio ?? 4;

  let target = escolherDestinoSeguro(
    robo,
    map,
    runtime.home,
    raioPasseio,
    runtime.falhas
  );

  // Se não encontrou um destino aleatório seguro, tenta perto da home.
  if (!target) {
    target = escolherFallbackSeguro(
      robo,
      map,
      runtime.home
    );
  }

  if (target) {
    runtime.alvo = target;
    runtime.estado = 'andando';
    runtime.t = 0; 
  } else {
    // Nenhum destino seguro encontrado: não congela.
    // Aguarda e tenta novamente.
    runtime.estado = 'pausa';
    runtime.t = 1.2;
  }

  runtime.preso = 0;
}