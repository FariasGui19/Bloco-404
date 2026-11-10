// =====================================================================
// ULTIMATES — o quinto slot de cada arquétipo
//
// Documento de direção (docs/missoes-inimigos-habilidades-e-pets.md):
// cada kit tem ataque, Q, R, utilidade, suporte e Ultimate, todos no nível 1.
// Aqui ficam nome, custo, recarga, alcance, dano, cura e bônus temporário.
//
// Regras comuns:
//   - custo alto de energia e recarga longa;
//   - dano radial em alvos dentro do raio (sem exigir direção);
//   - cura imediata proporcional à vida máxima;
//   - buff temporário do arquétipo (dano, velocidade, energia ou vida/s);
//   - uso conta para a maestria de fluxo e não gasta nada do save.
// =====================================================================

export const ULTIMATES = Object.freeze({
  motor_bio_forja: Object.freeze({
    id: 'pulso_forja_viva',
    name: 'PULSO DA FORJA VIVA',
    color: '#ffb45c',
    cost: 58,
    cooldown: 26,
    radius: 5.5,
    damage: 22,
    healPct: .45,
    buff: Object.freeze({ id: 'forja_viva', label: 'FORJA VIVA', duration: 8, healPerSecond: 3 }),
    effectText: '+3 vida/s por 8 s',
    description: 'Uma cúpula de raízes e engrenagens se abre e devolve estrutura ao corpo.',
  }),
  lamina_dominio_anciao: Object.freeze({
    id: 'coroa_da_falha',
    name: 'COROA DA FALHA',
    color: '#ffd465',
    cost: 62,
    cooldown: 30,
    radius: 6.5,
    damage: 38,
    healPct: .15,
    buff: Object.freeze({ id: 'coroa_da_falha', label: 'COROA DA FALHA', duration: 10, basicDamagePct: .15 }),
    effectText: '+15% dano básico por 10 s',
    description: 'A lâmina finca no chão e anéis geométricos abrem fissuras ao redor.',
  }),
  mare_astral: Object.freeze({
    id: 'sinfonia_estuario',
    name: 'SINFONIA DO ESTUÁRIO',
    color: '#7ce8ff',
    cost: 54,
    cooldown: 24,
    radius: 7,
    damage: 20,
    healPct: .25,
    buff: Object.freeze({ id: 'sinfonia_do_estuario', label: 'SINFONIA DO ESTUÁRIO', duration: 8, energyRegen: 1.5 }),
    effectText: '+1,5 energia/s por 8 s',
    description: 'Faixas de água e ecos de fauna orbitam e se dissipam num arco largo.',
  }),
  nucleo_dez_forma: Object.freeze({
    id: 'horizonte_dez_ecos',
    name: 'HORIZONTE DE DEZ ECOS',
    color: '#8cff9e',
    cost: 50,
    cooldown: 22,
    radius: 6,
    damage: 24,
    healPct: .2,
    buff: Object.freeze({ id: 'horizonte', label: 'HORIZONTE DE ECOS', duration: 7, moveSpeedPct: .35, energyRegen: .8 }),
    effectText: '+35% velocidade e +0,8 energia/s por 7 s',
    description: 'Anéis orbitais e silhuetas abstratas convergem numa onda única.',
  }),
});

export const ULTIMATE_IDS = Object.freeze(Object.values(ULTIMATES).map(ultimate => ultimate.id));

export function getUltimate(archetypeId) {
  return ULTIMATES[archetypeId] ?? null;
}

export function getUltimateById(id) {
  return Object.values(ULTIMATES).find(ultimate => ultimate.id === id) ?? null;
}

// Texto curto para HUD e Códex.
export function describeUltimate(ultimate) {
  if (!ultimate) return '';
  return `${ultimate.cost} ENERGIA · RECARGA ${ultimate.cooldown}s · RAIO ${ultimate.radius} tiles`;
}
