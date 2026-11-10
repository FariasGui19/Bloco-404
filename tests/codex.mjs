import assert from 'node:assert/strict';

// Stub mínimo de DOM: o Códex monta HTML por string e liga listeners.
// Registramos os seletores usados para conferir conteúdo e foco.
const elements = new Map();
const makeElement = () => ({
  textContent: '', innerHTML: '', outerHTML: '', dataset: {}, disabled: false,
  classList: { add() {}, remove() {}, toggle() {} },
  addEventListener() {}, setAttribute() {}, focus() {},
  querySelectorAll: () => [],
});
const overlay = Object.assign(makeElement(), {
  querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, makeElement());
    return elements.get(selector);
  },
});
globalThis.document = {
  createElement: () => overlay,
  body: { appendChild() {} },
};

const { readFileSync, existsSync } = await import('node:fs');
const { openCodex, closeCodex, isCodexOpen, setTab, handleCodexInput, CODEX_TABS } = await import('../js/ui/codex.js');
const { startQuest } = await import('../js/game/quests.js');
const { ensureArchetypeProgress } = await import('../js/game/progression.js');

const progress = {
  archetype: 'nucleo_dez_forma',
  activeQuest: { title: 'CALIBRAÇÃO DE ECO', description: 'Localize um terminal de manutenção.' },
  flags: {},
  inventory: ['registro_de_calibracao', 'enseada_rastro_mar'],
  archetypeProgress: {},
};
ensureArchetypeProgress(progress);
progress.archetypeProgress.nucleo_dez_forma.mastery = { ataque: 80, locomocao: 500 };
startQuest(progress, 'calibracao_de_campo');
const player = { health: 90, maxHealth: 120, energy: 70, maxEnergy: 100, invulnerable: 0 };
const before = JSON.stringify(progress);

// Abrir não muda o progresso.
openCodex(progress, { id: 'ilha_enseada_ecos' }, player);
assert(isCodexOpen());
const panel = elements.get('#codexPanel');
assert.match(panel.innerHTML, /CALIBRAÇÃO DE ECO/, 'aba de missões mostra a principal');
assert.match(panel.innerHTML, /Ecos de treino dispersos/, 'missão contável com objetivo');
assert.match(panel.innerHTML, /0\/3/, 'progresso do objetivo');
assert.equal(JSON.stringify(progress), before, 'abrir o Códex não altera o save');

// Aba de progressão: maestria derivada do uso, sem pontos para gastar.
assert(setTab('progressao'));
assert.match(panel.innerHTML, /PULSO SINTONIZADO/);
assert.match(panel.innerHTML, /CINÉTICA/);
assert.match(panel.innerHTML, /Não há pontos para gastar/);
assert.match(panel.innerHTML, /NÍVEL 1/);
assert.equal(JSON.stringify(progress), before);

// Inventário: catálogo dá nome e descrição, item desconhecido não quebra.
progress.inventory.push('artefato_misterioso');
openCodex(progress, { id: 'hub_saguao' }, player);
assert(setTab('inventario'));
assert.match(panel.innerHTML, /REGISTRO DE CALIBRAÇÃO/);
assert.match(panel.innerHTML, /Assinatura de combate/);
assert.match(panel.innerHTML, /ARTEFATO MISTERIOSO/, 'item fora do catálogo usa rótulo neutro');
progress.inventory.pop();

// Atributos: vida, energia e efeitos da maestria visíveis.
assert(setTab('atributos'));
assert.match(panel.innerHTML, /90 \/ 120/);
assert.match(panel.innerHTML, /70 \/ 100/);
assert.match(panel.innerHTML, /DANO BÁSICO/);

// Teclado: números trocam de aba, J/ESC fecham.
openCodex(progress, { id: 'hub_saguao' }, player);
assert(handleCodexInput(new Set(['3'])));
assert.match(panel.innerHTML, /REGISTRO DE CALIBRAÇÃO/, 'tecla 3 abre o inventário');
assert(handleCodexInput(new Set(['arrowright'])));
assert.match(panel.innerHTML, /DANO BÁSICO/, 'seta direita avança para atributos');
assert(handleCodexInput(new Set(['escape'])));
assert(!isCodexOpen(), 'ESC fecha o Códex');

// Sem arquétipo o painel orienta em vez de quebrar.
openCodex({ flags: {}, inventory: [], archetype: null }, null, player);
assert(setTab('progressao'));
assert.match(panel.innerHTML, /Escolha um Módulo de Eco/);
closeCodex();
assert(!isCodexOpen());

assert.deepEqual(CODEX_TABS.map(tab => tab.id), ['missoes', 'progressao', 'inventario', 'atributos']);

// Cada aba/cartão tem ícone próprio, e cada um tem cor (não é mais tudo verde).
for (const name of ['missoes', 'progressao', 'inventario', 'vitais', 'vida', 'energia', 'xp', 'fechar', 'emblema']) {
  const url = new URL(`../assets/sprites/ui/codex/icone-${name}.png`, import.meta.url);
  assert(existsSync(url), `ícone ${name} presente`);
}
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
for (const aba of ['missoes', 'progressao', 'inventario', 'atributos']) {
  assert(css.includes(`#codex[data-tab="${aba}"]`), `acento de cor da aba ${aba}`);
}
assert(css.includes('.codex-ultimate'), 'cartão da Ultimate estilizado');
console.log('Códex: abas, missões, maestria, inventário, atributos, teclado e leitura sem mutação OK.');
