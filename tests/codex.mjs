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
progress.archetypeProgress.nucleo_dez_forma.level = 3;
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
assert.match(panel.innerHTML, /ESCOLHA UMA FORMA|TROQUE A SOBRECARGA/, 'escolha de ferramenta/forma aparece');
assert.match(panel.innerHTML, /FORMA VELOZ/, 'formas do Núcleo listadas');
assert.match(panel.innerHTML, /data-tool="nucleo_veloz"/, 'botão de escolha existe');
assert.match(panel.innerHTML, /CAMINHO · NÍVEIS 0–5/, 'escada do caminho aparece');
assert.match(panel.innerHTML, /DISPONÍVEL/, 'degrau pronto marcado');
assert.match(panel.innerHTML, /PLANEJADO/, 'degrau futuro marcado');
assert.match(panel.innerHTML, /HORIZONTE DE DEZ ECOS/, 'Ultimate base no cartão');
assert.match(panel.innerHTML, /SÓ COM A FORMA ATIVA/, 'Núcleo avisa que a Ultimate pede transformação');
assert.match(panel.innerHTML, /ÁRVORE DE FORMAS/, 'árvore do arquétipo aparece na progressão');
assert.match(panel.innerHTML, /codex-branch projeto/, 'galho futuro marcado como projeto');
assert.match(panel.innerHTML, /FORMA BRUTA/, 'forma futura listada na árvore');
assert.match(panel.innerHTML, /EM PROJETO/, 'nós futuros têm rótulo honesto');
assert.match(panel.innerHTML, /1\/4 GALHOS PRONTOS|2\/4 GALHOS PRONTOS/, 'resumo da árvore');
assert.equal(JSON.stringify(progress), before, 'ler o Códex não instala ferramenta');

// Com ferramenta escolhida, o cartão vira a sobrecarga nível 1.
progress.tools = { nucleo_dez_forma: 'nucleo_veloz' };
openCodex(progress, { id: 'hub_saguao' }, player);
assert.match(panel.innerHTML, /VELOCIDADE TEMPORAL/, 'Ultimate da forma escolhida');
assert.match(panel.innerHTML, /TROQUE A SOBRECARGA/, 'cabeçalho muda quando já há escolha');
assert.match(panel.innerHTML, /class="codex-tool selected"/, 'cartão da forma marcado como selecionado');
assert.match(panel.innerHTML, /codex-tool locked/, 'formas em projeto ficam travadas');
assert.match(panel.innerHTML, /FORMA EM PROJETO/, 'forma sem transformação não instala');
delete progress.tools;

// Nível 1: ferramenta e Ultimate aparecem travadas com o nível exigido.
const jovem = { ...progress, archetypeProgress: JSON.parse(JSON.stringify(progress.archetypeProgress)), tools: {} };
jovem.archetypeProgress.nucleo_dez_forma.level = 1;
openCodex(jovem, { id: 'hub_saguao' }, player);
assert.match(panel.innerHTML, /FORMA BLOQUEADA/, 'escolha travada no nível 1');
assert.match(panel.innerHTML, /BLOQUEADA · NÍVEL 2/, 'cartão avisa o nível da ferramenta');
assert.match(panel.innerHTML, /BLOQUEADA · NÍVEL 3/, 'cartão avisa o nível da Ultimate');
assert.match(panel.innerHTML, /NÍVEL 3 · FALTAM 2/, 'escada mostra o que falta');
assert.match(panel.innerHTML, /disabled/, 'cartões travados não são clicáveis');
assert.match(panel.innerHTML, /PRÓXIMO: FERRAMENTA · NÍVEL 2/, 'cabeçalho aponta o próximo degrau');

assert.equal(JSON.stringify(progress), before, 'Códex continua só leitura');

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

// Maré Astral: a árvore já mostra navegação, nado e travessias como plano.
const mare = { archetype: 'mare_astral', archetypeProgress: {}, abilities: [], tools: {}, flags: {}, inventory: [] };
ensureArchetypeProgress(mare);
mare.archetypeProgress.mare_astral.level = 3;
openCodex(mare, { id: 'ilha_enseada_ecos' }, player);
assert.equal(setTab('missoes'), true);
assert.match(panel.innerHTML, /ROTAS DE MARÉ/, 'mapa marítimo aparece na aba de missões');
assert.match(panel.innerHTML, /ENSEADA|PRAIA INICIAL/, 'região atual nomeada');
assert.match(panel.innerHTML, /Manguezal Sussurrante/);
assert.match(panel.innerHTML, /ROTA ABERTA|EM PROJETO/);
assert.match(panel.innerHTML, /NADO LIVRE/);
assert.match(panel.innerHTML, /MISSÕES DE TRAVESSIA/);
assert.equal(setTab('progressao'), true);
assert.match(panel.innerHTML, /ÁRVORE DE CORRENTES/);
assert.match(panel.innerHTML, /NAVEGAÇÃO/, 'galho de navegação no Códex');
assert.match(panel.innerHTML, /Nado livre e fluido/);
assert.match(panel.innerHTML, /Rotas marítimas no mapa/);
assert.match(panel.innerHTML, /Missões de travessia/);
assert.doesNotMatch(panel.innerHTML, /SÓ COM A FORMA ATIVA/, 'a regra da forma é só do Núcleo');

// Sem arquétipo o painel orienta em vez de quebrar.
openCodex({ flags: {}, inventory: [], archetype: null }, null, player);
assert(setTab('missoes'));
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
assert(css.includes('.codex-tree') && css.includes('.codex-branch') && css.includes('.codex-node'), 'árvore estilizada');
assert(css.includes('#abilityUltimate.needs-form'), 'HUD marca a Ultimate esperando a forma');
console.log('Códex: abas, missões, maestria, inventário, atributos, teclado e leitura sem mutação OK.');
