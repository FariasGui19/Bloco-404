// =====================================================================
// ÁRVORE DE PROGRESSÃO — ESTRUTURA COMUM, SABOR POR ARQUÉTIPO
//
// Cada arquétipo tem a mesma grade de nós (ataque, fluxo, eco), mas nomes,
// descrições e ícones próprios. Os efeitos são numéricos e somados pela
// árvore; nenhum nó concede habilidade nova — isso fica para os slots Q/R.
//
// cost      pontos gastos por rank
// requires  rank mínimo de outro nó antes de investir
// effects   por rank: percentuais (0.06 = +6%) ou valores fixos
// =====================================================================

export const TREE_BRANCHES = Object.freeze({
  ataque: Object.freeze({ label: 'ATAQUE', color: '#ffb45c' }),
  fluxo: Object.freeze({ label: 'FLUXO', color: '#73e9fa' }),
  eco: Object.freeze({ label: 'ECO', color: '#9af9c8' }),
});

const NODE_TEMPLATE = Object.freeze([
  Object.freeze({
    id: 'ataque_1', branch: 'ataque', maxRank: 3, cost: Object.freeze([1, 1, 2]),
    effects: Object.freeze({ basicDamagePct: .06 }),
  }),
  Object.freeze({
    id: 'ataque_2', branch: 'ataque', maxRank: 2, cost: Object.freeze([2, 2]),
    requires: Object.freeze({ node: 'ataque_1', rank: 2 }),
    effects: Object.freeze({ basicDamagePct: .10, critChance: .03 }),
  }),
  Object.freeze({
    id: 'fluxo_1', branch: 'fluxo', maxRank: 3, cost: Object.freeze([1, 1, 2]),
    effects: Object.freeze({ cooldownPct: .05 }),
  }),
  Object.freeze({
    id: 'fluxo_2', branch: 'fluxo', maxRank: 2, cost: Object.freeze([2, 2]),
    requires: Object.freeze({ node: 'fluxo_1', rank: 2 }),
    effects: Object.freeze({ cooldownPct: .05, energyRegen: 1.5 }),
  }),
  Object.freeze({
    id: 'eco_1', branch: 'eco', maxRank: 3, cost: Object.freeze([1, 2, 2]),
    effects: Object.freeze({ abilityDamagePct: .08 }),
  }),
  Object.freeze({
    id: 'eco_2', branch: 'eco', maxRank: 1, cost: Object.freeze([3]),
    requires: Object.freeze({ node: 'eco_1', rank: 2 }),
    effects: Object.freeze({ xpBonusPct: .15 }),
  }),
]);

const FLAVOR = Object.freeze({
  nucleo_dez_forma: {
    ataque_1: ['PULSO SINTONIZADO', 'O bracelete converte parte do eco em força de impacto.'],
    ataque_2: ['COLISÃO DE ECO', 'Duas leituras do mesmo alvo no instante do golpe.'],
    fluxo_1: ['CIRCUITO ESTÁVEL', 'Menos atrito entre um golpe e o próximo.'],
    fluxo_2: ['RECARGA CINÉTICA', 'O movimento do operador realimenta o bracelete.'],
    eco_1: ['LEITURA PROFUNDA', 'As habilidades do Núcleo atingem assinaturas mais densas.'],
    eco_2: ['MEMÓRIA DO NÚCLEO', 'Cada vitória fica gravada e ensina mais rápido.'],
  },
  lamina_dominio_anciao: {
    ataque_1: ['FIO ANCESTRAL', 'A lâmina aprende o peso do seu braço.'],
    ataque_2: ['RUPTURA SÍSMICA', 'O impacto encontra a fissura certa.'],
    fluxo_1: ['PASSADA FIRME', 'Recomposição rápida entre golpes pesados.'],
    fluxo_2: ['FÔLEGO DE BATALHA', 'A respiração sustenta a cadência da lâmina.'],
    eco_1: ['RUNAS VIVAS', 'As inscrições respondem às habilidades com mais força.'],
    eco_2: ['HERANÇA DO MESTRE', 'Cada duelo concluído rende ensinamento.'],
  },
  mare_astral: {
    ataque_1: ['CORRENTE CONTÍNUA', 'A água acompanha o giro do corpo.'],
    ataque_2: ['MARÉ CRESCENTE', 'O segundo golpe chega onde o primeiro abriu espaço.'],
    fluxo_1: ['FLUXO CONSTANTE', 'A cadência das artes marciais encontra o ritmo da maré.'],
    fluxo_2: ['RESPIRAÇÃO ABISSAL', 'Pressão profunda recupera energia mais rápido.'],
    eco_1: ['SINTONIA LÍQUIDA', 'Habilidades fluem com menos esforço.'],
    eco_2: ['ECO DAS PROFUNDEZAS', 'A memória da água guarda cada vitória.'],
  },
  motor_bio_forja: {
    ataque_1: ['IMPULSO AFIADO', 'O atuador das placas entrega força real.'],
    ataque_2: ['SOBRECARGA CONTROLADA', 'Picos de energia viram impacto sem queimar o traje.'],
    fluxo_1: ['SERVO ESTÁVEL', 'Os propulsores voltam ao ponto neutro mais rápido.'],
    fluxo_2: ['TROCA RÁPIDA', 'A forja recicla calor em energia utilizável.'],
    eco_1: ['DIAGNÓSTICO DUPLO', 'O link de leitura também alimenta as habilidades.'],
    eco_2: ['BANCO DE DADOS', 'Cada sistema reparado rende calibração extra.'],
  },
});

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

const CACHE = new Map();

// Nós do arquétipo com nome próprio; o template nunca é mutado.
export function getProgressionTree(archetype) {
  if (!Object.hasOwn(FLAVOR, archetype)) return [];
  if (CACHE.has(archetype)) return CACHE.get(archetype);
  const nodes = NODE_TEMPLATE.map(node => {
    const [name, description] = FLAVOR[archetype][node.id];
    return freezeDeep({ ...node, name, description, archetype });
  });
  CACHE.set(archetype, Object.freeze(nodes));
  return CACHE.get(archetype);
}

export function getTreeNode(archetype, nodeId) {
  return getProgressionTree(archetype).find(node => node.id === nodeId) ?? null;
}
