// Protótipos iniciais de Q/R para os três módulos sem sprites animados finais.
// Efeitos visuais são temporários; o progresso de gates continua no save.
import { state } from './state.js';
import { checkGate, isGateOpen, openGate } from './gates.js';
import { saveGame } from './save.js';
import { ARCHETYPE_KITS } from '../data/archetype-kits.js';
import { CONFIG } from '../config.js';
import { canStandAt } from './collision.js';
import { getCurrentMap } from './map-manager.js';
import { tryAbilityDamage } from './combat.js';
import { recordMastery } from './mastery.js';
import { recordQuestEvent } from './quests.js';
import { grantArchetypeXp } from './rpg.js';
import { dispararPropulsao, ganharRespeito } from './nado.js';
import { DEGRAUS } from './nado-arvore.js';
import { fragmentosColetados } from './mare-missao.js';
import { detalhesFauna } from './fauna-ferida.js';
import { getVidaAquatica } from './vida-aquatica.js';

export const POWER_PROFILES = {
  golpe_ruptura: { cost: 24, cooldown: 1.4, color: '#ffd264', duration: 0.55 },
  postura_dominio: { cost: 8, cooldown: 2, color: '#ffd264', duration: 0.8 },
  passo_corrente: { cost: 24, cooldown: 1.3, color: '#53d9f4', duration: 0.22, distance: 2.3 },
  senso_corrente: { cost: 8, cooldown: 2, color: '#53d9f4', duration: 0.8 },
  forma_veloz: { cost: 26, cooldown: 1.4, color: '#6bff92', duration: 0.2, distance: 2.7 },
  eco_scan: { cost: 8, cooldown: 2, color: '#6bff92', duration: 0.8 },
};

const SCAN_LABELS = {
  postura_dominio: 'FREQUÊNCIA', senso_corrente: 'CORRENTE', eco_scan: 'ECO',
};

function facingDirection(facing) {
  if (getCurrentMap()?.meta?.sideView) {
    const sideVectors = { down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] };
    const [sx, sy] = sideVectors[facing] ?? sideVectors.right;
    return { x: sx, y: sy };
  }
  const vectors = { down: [1, 1], up: [-1, -1], right: [1, -1], left: [-1, 1] };
  const [x, y] = vectors[facing] ?? vectors.down;
  return { x: x / Math.SQRT2, y: y / Math.SQRT2 };
}

function nearestGate(radius, predicate = () => true) {
  const p = state.player;
  return (state.objects ?? [])
    .filter(o => o.gate && !isGateOpen(o) && predicate(o))
    .map(o => ({ object: o, distance: Math.hypot(o.x - p.x, o.y - p.y) }))
    .filter(o => o.distance <= radius)
    .sort((a, b) => a.distance - b.distance)[0]?.object ?? null;
}

function canStart(id, showMessage) {
  const player = state.player;
  const profile = POWER_PROFILES[id];
  const kit = ARCHETYPE_KITS[state.progress.archetype];
  if (!profile || !kit || (id !== kit.q && id !== kit.r) || !state.progress.abilities?.includes(id)) return false;
  if ((player.ability.cooldowns[id] ?? 0) > 0) {
    showMessage('HABILIDADE RECARREGANDO');
    return false;
  }
  if (player.energy < profile.cost) {
    showMessage('ENERGIA INSUFICIENTE');
    return false;
  }
  player.energy -= profile.cost;
  player.ability.cooldowns[id] = profile.cooldown;
  // Apenas a duração visual aumenta com o traje; deslocamento, custo e recarga não mudam.
  const visualDuration = player.equippedSuit === 'dominio' && id === 'golpe_ruptura' ? 0.8
    : player.equippedSuit === 'mare' && id === 'passo_corrente' ? 0.55
    : id === 'forma_veloz' ? 0.45 : profile.duration;
  player.ability.effect = { id, color: profile.color, timeLeft: visualDuration, duration: visualDuration };
  return true;
}

export function tryArchetypePower(id, showMessage) {
  const player = state.player;
  const nado = player.nado;
  const noFundo = state.progress.archetype === 'mare_astral' && nado?.ativo && nado.profundidade > 1.25;
  const naAgua = !!nado?.ativo;
  if (naAgua && state.progress.archetype !== 'mare_astral') {
    showMessage('HABILIDADE TERRESTRE • SAIA DA ÁGUA'); return false;
  }
  if (naAgua && id !== 'passo_corrente' && id !== 'senso_corrente') {
    showMessage('HABILIDADE TERRESTRE • SAIA DA ÁGUA'); return false;
  }
  if (naAgua && id === 'passo_corrente') {
    if (nado.recargaArrancada > 0) { showMessage('PROPULSÃO RECARREGANDO'); return false; }
    if (nado.naPoca || nado.medo || (nado.nivel != null && !DEGRAUS[nado.nivel]?.arrancada)) {
      showMessage('PROPULSÃO • APRENDA A BRAÇADA NO MAR'); return false;
    }
  }
  if (!canStart(id, showMessage)) return false;
  if (naAgua && id === 'passo_corrente') {
    // Q usa a mesma física de nado e colisão submersa de SHIFT, sem
    // levantar o sprite nem trocar para o dash terrestre de walkMask.
    // Q submerso começa mais contido e se aproxima do impulso pleno com
    // o respeito conquistado; SHIFT e o impulso na superfície não mudam.
    const potencia = noFundo ? .78 + .12 * Math.max(0, Math.min(1, nado.respeito?.valor ?? 0)) : 1;
    dispararPropulsao(nado, true, { potencia });
    if (noFundo) ganharRespeito(nado.respeito, .002);
    recordMastery(state.progress, 'distance', 6 * potencia);
    recordMastery(state.progress, 'ability_use');
    showMessage(noFundo ? 'PASSO DE CORRENTE • PROPULSÃO SUBMERSA' : 'PASSO DE CORRENTE • PROPULSÃO NA SUPERFÍCIE');
    return false;
  }
  if (naAgua && id === 'senso_corrente') {
    if (noFundo) ganharRespeito(nado.respeito, .001);
    const map = getCurrentMap();
    const pegos = fragmentosColetados(state.progress);
    const fragmentos = (player.fragmentosMare ?? []).filter(f => !pegos.has(f.id)).map(f => ({...f, tipo: 'FRAGMENTO'}));
    const bichos = detalhesFauna(map, state.progress, getVidaAquatica(map)?.recifes)
      .filter(b => b.def?.meio === 'agua' && b.estado !== 'curado')
      .map(b => ({...b, tipo: 'VIDA MARINHA'}));
    const alvo = [...fragmentos, ...bichos].map(a => ({ ...a, distancia: Math.hypot(a.x - player.x, a.y - player.y) }))
      .filter(a => a.distancia <= 10).sort((a, b) => a.distancia - b.distancia)[0];
    player.ability.sonarAquatico = alvo ? { x: alvo.x, y: alvo.y, timeLeft: 5 } : null;
    recordMastery(state.progress, 'ability_use');
    showMessage(alvo ? `SENSO SUBMERSO • ${alvo.tipo} A ${alvo.distancia.toFixed(1)} M` : 'SENSO SUBMERSO • NENHUM ECO PRÓXIMO');
    return false;
  }
  const profile = POWER_PROFILES[id];
  // Habilidades de impacto acertam alvos de treino à frente. A mobilidade e
  // os gates do Q continuam exatamente como antes.
  tryAbilityDamage({ player, progress: state.progress, targets: state.trainingTargets ?? [], abilityId: id });
  // Dash e avanço contam como locomoção: correr e impulsionar também treinam
  // a trilha CINÉTICA do Núcleo, mesmo o deslocamento não passando pelo updatePlayer.
  if (id === 'passo_corrente' || id === 'forma_veloz') recordMastery(state.progress, 'distance', 6);
  const rankUps = recordMastery(state.progress, 'ability_use');
  if (rankUps.length) {
    player.ability.lastMessage = `MAESTRIA • ${rankUps.map(up => up.label).join(' + ')}`;
    player.ability.messageTimer = 3;
  }
  if (SCAN_LABELS[id]) {
    const target = nearestGate(5, o => !!o.gate?.scanFlag) ?? nearestGate(5);
    if (target?.gate?.scanFlag && target.gate.diagnosisArchetype === state.progress.archetype) {
      state.progress.flags ??= {};
      state.progress.flags[target.gate.scanFlag] = true;
      recordQuestEvent(state.progress, { type: 'diagnose', target: target.gate.scanFlag });
      saveGame();
    }
    player.ability.reveal = target ? { targetId: target.id, timeLeft: 4, color: profile.color } : null;
    showMessage(target?.gate?.scanMessage ?? (target ? `${SCAN_LABELS[id]}: ${target.nome}` : `${SCAN_LABELS[id]}: NENHUM RASTRO PRÓXIMO`));
    return false;
  }

  if (id === 'golpe_ruptura') {
    const direction = facingDirection(player.facing);
    const target = nearestGate(2.9, o => {
      const dx = o.x - player.x, dy = o.y - player.y;
      const reach = o.gate?.strikeRadius ?? 2.6;
      return Math.hypot(dx, dy) <= reach &&
        (o.id === 'rocha_rachada' || o.gate.requiredAction === id) &&
        dx * direction.x + dy * direction.y > 0 &&
        checkGate(o.gate);
    });
    if (target) {
      openGate(target);
      recordQuestEvent(state.progress, { type: 'breach_gate', target: target.id });
      if (target.gate?.bonusXp > 0 && state.progress.archetype) {
        grantArchetypeXp(state.progress, target.gate.bonusXp);
      }
      player.ultimate ??= {};
      player.ultimate.shake = { timeLeft: 0.42, duration: 0.42, power: 10.5 };
      player.ability.ruptureFlash = { x: target.x, y: target.y, timeLeft: 0.65, duration: 0.65 };
      saveGame();
      showMessage(target.gate?.breakMessage ?? 'RUPTURA: ROCHA DESTRUÍDA');
    } else showMessage('GOLPE DE RUPTURA');
    return false;
  }

  const direction = facingDirection(player.facing);
  // Na câmara, alinhar a travessia com o corredor de um tile; não apagar o
  // obstáculo nem conceder o fragmento até que o jogador saia do outro lado.
  const phaseGate = (state.objects ?? []).find(o => {
    const allowed = o.phaseActions ?? (o.phaseAction ? [o.phaseAction] : []);
    if (!allowed.includes(id) || !checkGate(o.gate)) return false;
    const axis = o.phaseAxis ?? 'x', cross = axis === 'x' ? 'y' : 'x';
    const delta = o[axis] - player[axis];
    return Math.abs(player[cross] - o[cross]) < (o.phaseLane ?? 0.38) &&
      Math.abs(delta) < 2.05 && (Math.abs(delta) < 0.75 || delta * direction[axis] > 0);
  });
  if (id === 'passo_corrente' || id === 'forma_veloz') {
    const target = nearestGate(2.6, o => {
      const dx = o.x - player.x, dy = o.y - player.y;
      return (o.id === 'caverna_alagada' && id === 'passo_corrente' || (!o.phaseAction && !o.phaseActions && o.gate.requiredAction === id)) && dx * direction.x + dy * direction.y > 0 && checkGate(o.gate);
    });
    if (target) {
      openGate(target);
      saveGame();
    }
  }
  const phaseAxis = phaseGate?.phaseAxis ?? 'x';
  const phaseDelta = phaseGate ? phaseGate[phaseAxis] - player[phaseAxis] : 0;
  // Se já está tocando a barreira (inclusive saves antigos), deixe sair para
  // qualquer lado conforme a direção; fora dela, exige apontar para o gate.
  const phaseDirection = phaseGate ? (Math.abs(phaseDelta) < 0.75 ? Math.sign(direction[phaseAxis]) : Math.sign(phaseDelta)) : 0;
  const phaseDistance = phaseGate ? Math.abs(phaseGate[phaseAxis] - player[phaseAxis]) + 1 : profile.distance;
  player.ability.active = id;
  player.ability.dash = {
    directionX: phaseGate ? (phaseAxis === 'x' ? phaseDirection : 0) : direction.x, directionY: phaseGate ? (phaseAxis === 'y' ? phaseDirection : 0) : direction.y,
    timeLeft: profile.duration, speed: phaseDistance / profile.duration,
    phaseGateId: phaseGate?.id ?? null, phaseDirection, phaseAxis,
    phaseCrosses: phaseDelta * phaseDirection > 0,
    mode: 'quick',
  };
  if (phaseGate && !phaseGate.phaseLane) {
    // O corredor da câmara tem um tile. Corrigir a deriva perpendicular só
    // quando o ponto alinhado é válido, sem atravessar paredes por teleporte.
    const cross = phaseAxis === 'x' ? 'y' : 'x';
    const x = cross === 'x' ? phaseGate.x : player.x;
    const y = cross === 'y' ? phaseGate.y : player.y;
    if (canStandAt(getCurrentMap(), x, y, CONFIG.PLAYER_RADIUS, player)) player[cross] = phaseGate[cross];
  }
  showMessage(id === 'forma_veloz' ? 'PULSO VELOZ' : 'PASSO DE CORRENTE');
  return true;
}
