// =====================================================================
// ÁRVORES DOS ARQUÉTIPOS — galhos próprios, sem prometer poder falso
//
// A árvore é o mapa do futuro de cada arquétipo (formas do Núcleo, navegação
// da Maré, protocolo do Bio-Forja, guarda do Domínio). O teste garante três
// coisas: estrutura sã, nada de nó "pronto" inventado e coerência com as
// ferramentas que existem de verdade.
// =====================================================================
import assert from 'node:assert/strict';

import {
  ARCHETYPE_TREES, TREE_STATE_LABELS, getTree, getTreeSummary,
} from '../js/data/archetype-trees.js';
import { ARCHETYPE_TOOLS } from '../js/data/archetype-tools.js';
import { ARCHETYPES } from '../js/data/onboarding.js';

const ARQUETIPOS = ['motor_bio_forja', 'lamina_dominio_anciao', 'mare_astral', 'nucleo_dez_forma'];

// A árvore escreve nome próprio ("Corte de Reconfiguração"), o dado escreve
// caixa alta ("CORTE DE RECONFIGURAÇÃO"). Compara sem caixa e sem acento.
const semCaixa = texto => String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const ESTADOS = Object.keys(TREE_STATE_LABELS);

assert.deepEqual(Object.keys(ARCHETYPE_TREES).sort(), [...ARQUETIPOS].sort(), 'um mapa por arquétipo');
assert.deepEqual(ESTADOS, ['pronto', 'projeto']);

for (const archetype of ARQUETIPOS) {
  const tree = getTree(archetype);
  assert(tree, `${archetype}: árvore existe`);
  assert(ARCHETYPES[archetype], `${archetype}: arquétipo do onboarding`);
  assert(tree.title.length > 5 && tree.tagline.length > 10, `${archetype}: título e tagline`);
  assert(tree.branches.length >= 3, `${archetype}: pelo menos três galhos`);

  const ids = tree.branches.map(branch => branch.id);
  assert.equal(new Set(ids).size, ids.length, `${archetype}: ids de galho únicos`);
  assert(tree.branches.some(branch => branch.state === 'pronto'), `${archetype}: tem galho jogável`);
  assert(tree.branches.some(branch => branch.state === 'projeto'), `${archetype}: tem horizonte em projeto`);

  for (const branch of tree.branches) {
    assert(ESTADOS.includes(branch.state), `${archetype}/${branch.id}: estado válido`);
    assert(branch.name.length > 2, `${archetype}/${branch.id}: nome`);
    assert(branch.nodes.length >= 2, `${archetype}/${branch.id}: galho com pelo menos dois nós`);
    for (const node of branch.nodes) {
      assert(node.name.length > 2, `${archetype}/${branch.id}: nó com nome`);
      assert(ESTADOS.includes(node.state), `${archetype}/${branch.id}/${node.name}: estado válido`);
      assert(!('power' in node) && !('damage' in node), 'nó não carrega número de poder');
      if (node.note) assert(node.note.length > 4, `${node.name}: nota legível`);
    }
    // Galho em projeto não pode conter nó pronto "escondido".
    if (branch.state === 'projeto') {
      assert(branch.nodes.every(node => node.state === 'projeto'), `${archetype}/${branch.id}: projeto não entrega pronto`);
    }
  }

  // Toda assinatura de ferramenta jogável aparece na árvore: nome igual ao dado.
  for (const tool of ARCHETYPE_TOOLS[archetype].tools) {
    const citados = tree.branches.flatMap(branch => branch.nodes.map(node => semCaixa(`${node.name} ${node.note ?? ''}`))).join(' | ');
    assert(citados.includes(semCaixa(tool.ultimate.name)), `${archetype}: árvore cita "${tool.ultimate.name}"`);
  }

  const resumo = getTreeSummary(archetype);
  assert.deepEqual(resumo, {
    branches: tree.branches.length,
    prontos: tree.branches.filter(branch => branch.state === 'pronto').length,
    nodes: tree.branches.reduce((total, branch) => total + branch.nodes.length, 0),
    nodesProntos: tree.branches.reduce((total, branch) => total + branch.nodes.filter(node => node.state === 'pronto').length, 0),
  });
  assert(resumo.nodesProntos > 0 && resumo.nodesProntos < resumo.nodes, `${archetype}: mistura de pronto e projeto`);
  assert(resumo.prontos < resumo.branches, `${archetype}: ainda há galho por abrir`);
}

assert.equal(getTree('arquétipo inexistente'), null);
assert.equal(getTreeSummary('arquétipo inexistente'), null);

// ---------------------------------------------------------------
// Núcleo: cada forma é um galho, com a Ultimate declarada na árvore
// ---------------------------------------------------------------
const nucleo = getTree('nucleo_dez_forma');
assert.equal(nucleo.branches.length, 4, 'quatro formas desenhadas');
const veloz = nucleo.branches.find(branch => branch.id === 'veloz');
assert.equal(veloz.state, 'pronto');
assert(veloz.nodes.some(node => node.state === 'pronto' && /Velocidade Temporal/.test(node.name)));
assert(veloz.nodes.some(node => /exige estar transformado/.test(node.note ?? '')), 'árvore avisa a regra da forma');
for (const id of ['bruta', 'fluida', 'puro']) {
  const forma = nucleo.branches.find(branch => branch.id === id);
  assert.equal(forma.state, 'projeto', `${id}: forma futura`);
  assert(forma.nodes.some(node => /Ultimate/.test(node.note ?? '')), `${id}: ultimate desenhada, sem forma`);
}

// ---------------------------------------------------------------
// Maré: navegação e nado livre já aparecem no mapa (como plano)
// ---------------------------------------------------------------
const mare = getTree('mare_astral');
const navegacao = mare.branches.find(branch => branch.id === 'navegacao');
assert(navegacao && navegacao.state === 'projeto', 'navegação é plano assumido');
const textoMare = mare.branches.flatMap(branch => branch.nodes.map(node => `${node.name} ${node.note ?? ''}`)).join(' ');
for (const termo of ['Nado livre', 'Rotas marítimas', 'Portos', 'Missões de travessia']) {
  assert(textoMare.includes(termo), `Maré: árvore cita "${termo}"`);
}

console.log('Árvores: galhos por arquétipo, estados honestos e coerência com as ferramentas OK.');
