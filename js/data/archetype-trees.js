// =====================================================================
// ÁRVORES DOS ARQUÉTIPOS
//
// O caminho 0–5 diz "em que degrau o operador está". A árvore diz **para onde
// cada galho vai**: as formas do Núcleo, as correntes e a navegação da Maré, as
// ferramentas do Bio-Forja, as armas e posturas do Domínio.
//
// Regra de honestidade: nó com `estado: 'pronto'` existe no jogo hoje; nó com
// `estado: 'projeto'` é plano desenhado — aparece na interface para o jogador
// ver o horizonte, mas não entrega poder nenhum.
// =====================================================================

export const TREE_STATE_LABELS = Object.freeze({
  pronto: 'PRONTO',
  projeto: 'EM PROJETO',
});

export const ARCHETYPE_TREES = Object.freeze({
  // -------------------------------------------------------------------
  motor_bio_forja: Object.freeze({
    title: 'ÁRVORE DE FORJA',
    tagline: 'Cada ferramenta abre um galho de sobrecarga e um caminho de obra.',
    branches: Object.freeze([
      Object.freeze({
        id: 'ferramentas',
        name: 'FERRAMENTAS',
        state: 'pronto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Lâmina de Forja', state: 'pronto', note: 'Corte de Reconfiguração' }),
          Object.freeze({ name: 'Punho de Impacto', state: 'pronto', note: 'Martelo de Forja' }),
          Object.freeze({ name: 'Gancho Magnético', state: 'pronto', note: 'Rede de Ancoragem' }),
          Object.freeze({ name: 'Asa de Impulso', state: 'pronto', note: 'Quebra-Limite Cinético' }),
        ]),
      }),
      Object.freeze({
        id: 'protocolo',
        name: 'PROTOCOLO DE SOBREPOSIÇÃO',
        state: 'projeto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Placas se reorganizam', state: 'projeto' }),
          Object.freeze({ name: 'Dash curto sem recarga alta', state: 'projeto' }),
          Object.freeze({ name: 'Interações tecnológicas avançadas', state: 'projeto' }),
        ]),
      }),
      Object.freeze({
        id: 'arquiteto',
        name: 'ARQUITETO DE ECO',
        state: 'projeto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Ponte temporária', state: 'projeto' }),
          Object.freeze({ name: 'Plataforma ligada', state: 'projeto' }),
          Object.freeze({ name: 'Drone de forja', state: 'projeto' }),
        ]),
      }),
    ]),
  }),

  // -------------------------------------------------------------------
  lamina_dominio_anciao: Object.freeze({
    title: 'ÁRVORE DE DOMÍNIO',
    tagline: 'Arma, postura e coroa: o peso vem antes do brilho.',
    branches: Object.freeze([
      Object.freeze({
        id: 'armas',
        name: 'ARMAS',
        state: 'pronto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Espada de Domínio', state: 'pronto', note: 'Corte de Ruptura' }),
          Object.freeze({ name: 'Escudo de Domínio', state: 'pronto', note: 'Muralha de Frequência' }),
          Object.freeze({ name: 'Postura de Domínio', state: 'pronto', note: 'Corpo de Titânio' }),
          Object.freeze({ name: 'Investida de Domínio', state: 'pronto', note: 'Impacto do Trono Antigo' }),
        ]),
      }),
      Object.freeze({
        id: 'guarda',
        name: 'GUARDA LONGA',
        state: 'projeto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Postura sustentada', state: 'projeto' }),
          Object.freeze({ name: 'Ondas douradas nos golpes', state: 'projeto' }),
          Object.freeze({ name: 'Proteção a NPCs próximos', state: 'projeto' }),
        ]),
      }),
      Object.freeze({
        id: 'coroa',
        name: 'COROA DO DOMÍNIO',
        state: 'projeto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Guerreiro dimensional', state: 'projeto' }),
          Object.freeze({ name: 'Mover obstáculos pesados', state: 'projeto' }),
          Object.freeze({ name: 'Aura de comando', state: 'projeto' }),
        ]),
      }),
    ]),
  }),

  // -------------------------------------------------------------------
  mare_astral: Object.freeze({
    title: 'ÁRVORE DE CORRENTES',
    tagline: 'Fluxo, pressão e navegação: a Maré não luta contra a água, ela anda com ela.',
    branches: Object.freeze([
      Object.freeze({
        id: 'fluxo',
        name: 'FLUXO',
        state: 'pronto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Passo de Corrente', state: 'pronto', note: 'Q · avanço curto' }),
          Object.freeze({ name: 'Corrente Abissal', state: 'pronto', note: 'Ultimate da corrente' }),
          Object.freeze({ name: 'Chicote de Maré', state: 'pronto', note: 'Onda Cortante' }),
          Object.freeze({ name: 'Nado livre e fluido', state: 'projeto', note: 'movimento aquático contínuo' }),
          Object.freeze({ name: 'Corrida na superfície', state: 'projeto' }),
        ]),
      }),
      Object.freeze({
        id: 'pressao',
        name: 'PRESSÃO',
        state: 'pronto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Cúpula de Pressão', state: 'pronto', note: 'Ultimate do escudo' }),
          Object.freeze({ name: 'Respiração em água funda', state: 'projeto' }),
          Object.freeze({ name: 'Maré de Abismo', state: 'projeto', note: 'gravidade e fluxo da área' }),
        ]),
      }),
      Object.freeze({
        id: 'navegacao',
        name: 'NAVEGAÇÃO',
        state: 'projeto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Rotas marítimas no mapa', state: 'projeto' }),
          Object.freeze({ name: 'Correntes que levam a ilhas', state: 'projeto' }),
          Object.freeze({ name: 'Portos e ancoradouros', state: 'projeto' }),
          Object.freeze({ name: 'Missões de travessia', state: 'projeto' }),
        ]),
      }),
      Object.freeze({
        id: 'chamado',
        name: 'CHAMADO',
        state: 'pronto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Senso de Corrente', state: 'pronto', note: 'R · leitura de rastro' }),
          Object.freeze({ name: 'Chamado da Maré', state: 'pronto', note: 'Ultimate do senso' }),
          Object.freeze({ name: 'Comunicação com fauna aquática', state: 'projeto' }),
        ]),
      }),
    ]),
  }),

  // -------------------------------------------------------------------
  nucleo_dez_forma: Object.freeze({
    title: 'ÁRVORE DE FORMAS',
    tagline: 'Cada forma é um galho com nível, habilidade e Ultimate próprios.',
    branches: Object.freeze([
      Object.freeze({
        id: 'veloz',
        name: 'FORMA VELOZ',
        state: 'pronto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Pulso Veloz', state: 'pronto', note: 'Q · dash' }),
          Object.freeze({ name: 'Velocidade Temporal', state: 'pronto', note: 'Ultimate · exige estar transformado' }),
          Object.freeze({ name: 'Corrida por paredes', state: 'projeto' }),
          Object.freeze({ name: 'Eco de formas velozes', state: 'projeto' }),
        ]),
      }),
      // Segunda forma jogável (T → Quebra Sistemas): a árvore diz o que já
      // existe e o que ainda é horizonte, sem inflar o que está pronto.
      Object.freeze({
        id: 'bruta',
        name: 'QUEBRA SISTEMAS',
        state: 'pronto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Demolição de peso', state: 'pronto', note: 'Golpe carregado abre portões travados por peso' }),
          Object.freeze({ name: 'Devorador de Tectônica', state: 'pronto', note: 'Ultimate · fenda no chão · exige a forma ativa' }),
          Object.freeze({ name: 'Empurrar estruturas', state: 'projeto' }),
          Object.freeze({ name: 'Resistência a impacto', state: 'projeto' }),
        ]),
      }),
      Object.freeze({
        id: 'fluida',
        name: 'FORMA FLUIDA',
        state: 'projeto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Fenda de Eco', state: 'projeto', note: 'Ultimate desenhada, sem transformação ainda' }),
          Object.freeze({ name: 'Passar entre obstáculos', state: 'projeto' }),
          Object.freeze({ name: 'Escorrer por frestas', state: 'projeto' }),
        ]),
      }),
      Object.freeze({
        id: 'puro',
        name: 'FORMA NÚCLEO',
        state: 'projeto',
        nodes: Object.freeze([
          Object.freeze({ name: 'Sobreposição 10X', state: 'projeto', note: 'Ultimate desenhada, sem transformação ainda' }),
          Object.freeze({ name: 'Dez ecos simultâneos', state: 'projeto' }),
          Object.freeze({ name: 'Forma suprema de adaptação', state: 'projeto' }),
        ]),
      }),
    ]),
  }),
});

export function getTree(archetypeId) {
  return ARCHETYPE_TREES[archetypeId] ?? null;
}

// Contagem para a interface: "1 de 4 formas prontas".
export function getTreeSummary(archetypeId) {
  const tree = getTree(archetypeId);
  if (!tree) return null;
  const branches = tree.branches.length;
  const prontos = tree.branches.filter(branch => branch.state === 'pronto').length;
  const nodes = tree.branches.reduce((total, branch) => total + branch.nodes.length, 0);
  const nodesProntos = tree.branches.reduce(
    (total, branch) => total + branch.nodes.filter(node => node.state === 'pronto').length, 0);
  return { branches, prontos, nodes, nodesProntos };
}
