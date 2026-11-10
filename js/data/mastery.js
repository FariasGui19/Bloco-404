// =====================================================================
// MAESTRIA — PROGRESSÃO ORGÂNICA POR USO
//
// Não existe ponto para gastar: cada trilha sobe conforme o jogador usa o
// que ela representa. Os ranks são derivados do contador (não são salvos),
// então o save guarda apenas quatro números por arquétipo.
//
// sources:
//   basic_hit   golpes básicos que acertam       → ataque
//   ability_use usos de Q/R e da transformação   → fluxo
//   resonance   vitórias, missões e descobertas  → eco
//   distance    tiles percorridos                → locomoção
// =====================================================================

const TEMPLATE = Object.freeze({
  ataque: Object.freeze({
    source: 'basic_hit',
    icon: 'xp',
    thresholds: Object.freeze([30, 80, 160, 300]),
    effects: Object.freeze({ basicDamagePct: .04, critChance: .01 }),
    effectText: '+4% dano básico · +1% crítico',
    hint: 'Acerte golpes básicos.',
  }),
  fluxo: Object.freeze({
    source: 'ability_use',
    icon: 'energia',
    thresholds: Object.freeze([10, 25, 50, 90]),
    effects: Object.freeze({ cooldownPct: .03, energyRegen: .4 }),
    effectText: '−3% recarga · +0,4 energia/s',
    hint: 'Use Q e R.',
  }),
  eco: Object.freeze({
    source: 'resonance',
    icon: 'missoes',
    thresholds: Object.freeze([4, 10, 20, 40]),
    effects: Object.freeze({ abilityDamagePct: .04, xpBonusPct: .05 }),
    effectText: '+4% dano de habilidade · +5% XP',
    hint: 'Conclua missões e derrube ecos.',
  }),
  locomocao: Object.freeze({
    source: 'distance',
    icon: 'progressao',
    thresholds: Object.freeze([150, 500, 1200, 2500]),
    effects: Object.freeze({ moveSpeedPct: .02 }),
    effectText: '+2% velocidade',
    hint: 'Percorra o mapa.',
  }),
});

// Nome próprio por arquétipo. O Núcleo tem a única trilha que mexe na forma.
const FLAVOR = Object.freeze({
  nucleo_dez_forma: {
    ataque: ['PULSO SINTONIZADO', 'O bracelete aprende o impacto a cada golpe.'],
    fluxo: ['CIRCUITO ESTÁVEL', 'Usar as habilidades reduz o atrito entre elas.'],
    eco: ['LEITURA PROFUNDA', 'Assinaturas de eco viram memória útil.'],
    locomocao: ['CINÉTICA', 'A Forma Veloz fica mais rápida e dura mais a cada uso.'],
  },
  lamina_dominio_anciao: {
    ataque: ['FIO ANCESTRAL', 'A lâmina aprende o peso do seu braço.'],
    fluxo: ['PASSADA FIRME', 'A recuperação entre gestos fica mais curta.'],
    eco: ['RUNAS VIVAS', 'As inscrições respondem melhor às leituras.'],
    locomocao: ['PESO E IMPULSO', 'Passos firmes, deslocamento mais constante.'],
  },
  mare_astral: {
    ataque: ['CORRENTE CONTÍNUA', 'A água acompanha o giro do corpo.'],
    fluxo: ['RESPIRAÇÃO ABISSAL', 'Pressão profunda recupera energia mais rápido.'],
    eco: ['SINTONIA LÍQUIDA', 'Habilidades fluem com menos esforço.'],
    locomocao: ['FLUIDEZ', 'O corpo desliza sem perder a postura.'],
  },
  motor_bio_forja: {
    ataque: ['IMPULSO AFIADO', 'O atuador das placas entrega força real.'],
    fluxo: ['SERVO ESTÁVEL', 'Os propulsores voltam ao neutro mais rápido.'],
    eco: ['DIAGNÓSTICO DUPLO', 'Cada sistema reparado ensina o traje.'],
    locomocao: ['PROPULSÃO', 'A armadura acompanha o ritmo da caminhada.'],
  },
});

// Efeitos extras exclusivos do Núcleo: a forma sustentada evolui com o uso.
const NUCLEO_LOCOMOCAO = Object.freeze({ moveSpeedPct: .02, formSpeedPct: .03, formDuration: 1.2 });
const NUCLEO_LOCOMOCAO_TEXT = '+2% velocidade · +3% na Forma Veloz · +1,2s de forma';

const CACHE = new Map();

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

export function getMasteryTracks(archetype) {
  if (!Object.hasOwn(FLAVOR, archetype)) return [];
  if (CACHE.has(archetype)) return CACHE.get(archetype);
  const tracks = Object.entries(TEMPLATE).map(([id, base]) => {
    const [name, description] = FLAVOR[archetype][id];
    const special = archetype === 'nucleo_dez_forma' && id === 'locomocao';
    return freezeDeep({
      ...base,
      id,
      name,
      description,
      effects: special ? NUCLEO_LOCOMOCAO : base.effects,
      effectText: special ? NUCLEO_LOCOMOCAO_TEXT : base.effectText,
      maxRank: base.thresholds.length,
    });
  });
  CACHE.set(archetype, freezeDeep(tracks));
  return CACHE.get(archetype);
}

export function getTrack(archetype, id) {
  return getMasteryTracks(archetype).find(track => track.id === id) ?? null;
}

export const TRACK_IDS = Object.freeze(Object.keys(TEMPLATE));
