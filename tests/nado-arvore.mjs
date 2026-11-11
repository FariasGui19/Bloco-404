// Execute: node --experimental-default-type=module tests/nado-arvore.mjs
//
// ÁRVORE DE NADO — aprender a nadar em 5 degraus.
//
// O teste joga de verdade: carrega a praia com objetos, move o operador
// com `updatePlayer` (o mesmo código do jogo) e conquista os cinco
// degraus na ordem, conferindo a cada um:
//   - o LIMITE do degrau vale (alcance, profundidade, fôlego);
//   - a PROVA do degrau é alcançável COM o degrau que se tem;
//   - a missão, o save e os avisos acompanham.
//
// Cada bloco existe por causa de um defeito que já aconteceu:
//   - poça lida como terra (profundidade 0) -> não dava para boiar;
//   - no raso não dava para submergir -> prova de respirar inalcançável;
//   - quem só boiava atravessava o canal pela beira da ponte;
//   - andamento da prova guardado no jogador sumia entre quadros;
//   - teleporte contava como travessia;
//   - a árvore mudava o mergulho livre dos testes antigos.
import assert from 'node:assert/strict';

const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, {
  dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: '',
}]));
globalThis.document = { getElementById: id => elements[id] };
globalThis.window = { addEventListener() {} };
const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };

const { map } = await import('../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js');
const { state } = await import('../js/game/state.js');
const { input } = await import('../js/engine/input.js');
const { loadMap } = await import('../js/game/map-manager.js');
const { updatePlayer } = await import('../js/game/player.js');
const { canStandAt } = await import('../js/game/collision.js');
const { getCoastFieldForMap } = await import('../js/engine/coast-field.js');
const { pocaEm } = await import('../js/engine/pocas.js');
const {
  NADO, criarEstadoNado, atualizarNado, moverNaAgua, podeNadar, profundidadeEm, aguaDoDegrau, dispararArrancada,
} = await import('../js/game/nado.js');
const {
  DEGRAUS, PROVAS, NIVEL_MAXIMO, SUPERFICIE, FUNDO_DA_PROVA, MISSAO_NADO,
  criarArvore, garantirArvore, lerArvore, jaNadava, provaDe, nomeDoDegrau, resumoDaArvore,
  distanciaDaAreia, direcaoDaAreia, dentroDoAlcance, ilhaEm, boiasDoLimite,
  atualizarProvas, garantirMissaoDeNado,
} = await import('../js/game/nado-arvore.js');
const { getQuestState, isQuestComplete } = await import('../js/game/quests.js');
const { getQuest } = await import('../js/data/quests.js');
const { getItem } = await import('../js/data/items.js');
const { ensureHealth } = await import('../js/game/health.js');

const DT = 1 / 60;
const grade = map.aguaPraia;
const LINHAS = grade.length, COLUNAS = grade[0].length;
const campo = getCoastFieldForMap(map);

// ---------------------------------------------------------------------
// 0. Contrato da tabela
// ---------------------------------------------------------------------
assert.equal(DEGRAUS.length, 5, 'a árvore tem cinco degraus');
assert.equal(PROVAS.length, 4, 'quatro provas levam do degrau 0 ao 4');
assert.deepEqual(DEGRAUS.map(d => d.nivel), [0, 1, 2, 3, 4]);
assert.deepEqual(PROVAS.map(p => p.de), [0, 1, 2, 3], 'uma prova por degrau, em ordem');
for (let i = 1; i < DEGRAUS.length; i++) {
  const a = DEGRAUS[i - 1], b = DEGRAUS[i];
  assert.ok(b.alcance >= a.alcance, `alcance não pode encolher (${a.nome} -> ${b.nome})`);
  assert.ok(b.mergulho >= a.mergulho, `mergulho não pode encolher (${a.nome} -> ${b.nome})`);
  assert.ok(b.ar > a.ar, `o fôlego cresce a cada degrau (${a.nome} -> ${b.nome})`);
  assert.ok(b.velocidade > a.velocidade, `a braçada cresce a cada degrau (${a.nome} -> ${b.nome})`);
}
assert.equal(DEGRAUS[0].mergulho, 0, 'com medo da água ninguém mergulha');
assert.ok(DEGRAUS[1].mergulho < 1.25 && DEGRAUS[2].mergulho < 1.25, 'degraus 1 e 2 não chegam ao fundo');
assert.equal(DEGRAUS[4].ar, NADO.arMaximo, 'o degrau pleno é o mergulho livre de antes');
assert.equal(DEGRAUS[4].velocidade, 1);
// Nadar nunca é mais rápido que andar (regra da praia).
assert.ok((NADO.velocidadeFundo) * (1 + NADO.bonusRespeito) * DEGRAUS[4].velocidade <= 1.4 + 1e-9);

// ---------------------------------------------------------------------
// 1. A árvore é OPT-IN: sem `arvore`, o mergulho livre continua igual
// ---------------------------------------------------------------------
{
  const n = criarEstadoNado();
  const fundo = { x: 18.5, y: 2.5 };
  assert.ok(profundidadeEm(map, fundo.x, fundo.y, campo) >= FUNDO_DA_PROVA, 'ponto de teste precisa ser fundo');
  for (let i = 0; i < 60; i++) atualizarNado(n, { map, ...fundo, field: campo, dt: DT });
  assert.equal(n.ativo, true);
  assert.equal(n.submerso, true, 'sem árvore, água funda = submerso (como antes)');
  assert.ok(n.profundidade > 1.8);
  assert.equal(n.nivel, null);
  assert.equal(n.medo, false);
  assert.equal(aguaDoDegrau(null), podeNadar, 'sem árvore o mar inteiro é nadável');
  assert.ok(n.ar < NADO.arMaximo, 'e o fôlego corre');
}

// ---------------------------------------------------------------------
// 2. Estado, migração e leitura sem efeito colateral
// ---------------------------------------------------------------------
{
  const novo = {};
  assert.equal(lerArvore(novo).nivel, 0, 'save novo começa com medo da água');
  assert.equal(novo.nado, undefined, 'ler a árvore não escreve no save');
  assert.equal(resumoDaArvore(novo).prova.id, 'boiar');
  assert.equal(novo.nado, undefined, 'o resumo do HUD também não escreve');
  garantirArvore(novo);
  assert.deepEqual(novo.nado, { nivel: 0, provas: {}, andamento: null, respeito: 0 });

  // Save antigo que já mergulhava não acorda com medo.
  for (const antigo of [
    { flags: { mareFragSupridos: ['ilha:1,2'] } },
    { flags: { mare_profunda_concluida: true } },
    { questLog: { mare_profunda: { status: 'active', counters: [1, 0, 0] } } },
    { faunaCurada: { tartaruga_1: true } },
  ]) {
    assert.equal(jaNadava(antigo), true);
    assert.equal(lerArvore(antigo).nivel, NIVEL_MAXIMO);
    const a = garantirArvore(antigo);
    assert.equal(a.nivel, NIVEL_MAXIMO);
    assert.equal(a.herdado, true);
    assert.equal(provaDe(a), null);
    assert.equal(garantirMissaoDeNado(antigo), null, 'veterano não recebe aula de natação');
    assert.equal(antigo.questLog?.[MISSAO_NADO], undefined);
  }
  assert.equal(jaNadava({ flags: {}, questLog: { mare_profunda: { counters: [0, 0, 0] } } }), false);

  // Valores estragados no save não derrubam o jogo.
  const torto = { nado: { nivel: 99, provas: null, respeito: 'x' } };
  assert.equal(garantirArvore(torto).nivel, NIVEL_MAXIMO);
  assert.deepEqual(torto.nado.provas, {});
  assert.equal(torto.nado.respeito, 0);
  assert.equal(garantirArvore({ nado: [] }).nivel, 0);

  assert.equal(nomeDoDegrau(criarArvore(4), 'mare_astral'), 'MARÉ ASTRAL');
  assert.equal(nomeDoDegrau(criarArvore(4), 'motor_bio_forja'), 'MARÉ PLENA');
  assert.equal(nomeDoDegrau(criarArvore(1), 'mare_astral'), 'BOIAR');
}

// ---------------------------------------------------------------------
// 3. Alcance: distância da AREIA (ponte não conta)
// ---------------------------------------------------------------------
// Linha d'água vale ~.5, primeira célula ~1, e cresce mar adentro.
assert.ok(Math.abs(distanciaDaAreia(map, 14.5, 5.5) - 1) < .15, 'primeira célula de mar fica a 1 da areia');
assert.ok(distanciaDaAreia(map, 16.5, 5.5) > 2.5);
// Entre as duas pontes do canal A-B a água é "rasa" para o campo de costa
// (o deque conta como terra lá), mas está LONGE da areia.
const meioDoCanal = { x: 18, y: 10 };
assert.ok(profundidadeEm(map, meioDoCanal.x, meioDoCanal.y, campo) < .7, 'o campo de costa vê raso ao lado da ponte');
assert.ok(distanciaDaAreia(map, meioDoCanal.x, meioDoCanal.y) > 3.5, 'mas a areia está longe: é isso que a árvore mede');
assert.equal(dentroDoAlcance(map, meioDoCanal.x, meioDoCanal.y, 1), false, 'quem só boia não atravessa pela beira da ponte');
assert.equal(dentroDoAlcance(map, meioDoCanal.x, meioDoCanal.y, 2), true, 'com fôlego o canal é atravessável');
assert.equal(dentroDoAlcance(map, 60.5, 55.5, 2), false, 'mar aberto fica além do degrau 2');
assert.equal(dentroDoAlcance(map, 60.5, 55.5, 3), true);
{
  // A direção de volta aponta mesmo para a areia.
  const d = direcaoDaAreia(map, 15.5, 5.5);
  assert.ok(d.x < -.8, `a areia da ilha de chegada fica a oeste (${JSON.stringify(d)})`);
  assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-6);
}

// Varredura de água por degrau: até onde cada um chega a partir da ilha A.
function alcancados(nivel) {
  const agua = aguaDoDegrau(nivel);
  const Q = 2;
  const chave = (x, y) => y * COLUNAS * Q + x;
  const visto = new Uint8Array(COLUNAS * Q * LINHAS * Q);
  const fila = [];
  // Sementes: toda água permitida encostada na ilha de chegada.
  const ilhaA = ilhaEm(map, 8, 7.5);
  for (let y = 0; y < LINHAS * Q; y++) for (let x = 0; x < COLUNAS * Q; x++) {
    const wx = (x + .5) / Q, wy = (y + .5) / Q;
    if (!agua(map, wx, wy)) continue;
    const vizinha = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ilhaEm(map, wx + dx / Q, wy + dy / Q) === ilhaA);
    if (vizinha) { visto[chave(x, y)] = 1; fila.push(x, y); }
  }
  const ilhas = new Set([ilhaA]);
  let maxDist = 0, maxFundo = 0, n = 0;
  for (let i = 0; i < fila.length; i += 2) {
    const x = fila[i], y = fila[i + 1];
    const wx = (x + .5) / Q, wy = (y + .5) / Q;
    n++;
    maxDist = Math.max(maxDist, distanciaDaAreia(map, wx, wy));
    maxFundo = Math.max(maxFundo, profundidadeEm(map, wx, wy, campo));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = x + dx, b = y + dy;
      if (a < 0 || b < 0 || a >= COLUNAS * Q || b >= LINHAS * Q) continue;
      const ax = (a + .5) / Q, ay = (b + .5) / Q;
      const ilha = ilhaEm(map, ax, ay);
      if (ilha) ilhas.add(ilha);
      if (visto[chave(a, b)] || !agua(map, ax, ay)) continue;
      visto[chave(a, b)] = 1;
      fila.push(a, b);
    }
  }
  return { ilhas, maxDist, maxFundo, n };
}
const porDegrau = [0, 1, 2, 3, 4].map(alcancados);
// O limite de cada degrau VALE em todo ponto alcançável.
for (const nivel of [0, 1, 2]) {
  assert.ok(porDegrau[nivel].maxDist <= DEGRAUS[nivel].alcance + 1e-6,
    `degrau ${nivel} passou do alcance (${porDegrau[nivel].maxDist.toFixed(2)} > ${DEGRAUS[nivel].alcance})`);
}
assert.equal(porDegrau[0].ilhas.size, 1, 'com medo da água não se sai da ilha de chegada pelo mar');
assert.equal(porDegrau[1].ilhas.size, 1, 'boiando também não: o canal é largo demais para o raso');
assert.ok(porDegrau[2].ilhas.size >= 3, `com fôlego dá para atravessar canais (${porDegrau[2].ilhas.size} ilhas)`);
assert.ok(porDegrau[2].n < porDegrau[3].n * .8, 'o degrau 2 ainda não tem o mar aberto');
assert.ok(porDegrau[3].ilhas.size > porDegrau[2].ilhas.size || porDegrau[3].n > porDegrau[2].n);
assert.equal(porDegrau[3].n, porDegrau[4].n, 'travessia e maré plena alcançam a mesma água (muda a profundidade)');
assert.ok(porDegrau[1].n > porDegrau[0].n * 1.5, 'boiar abre o raso de verdade');
assert.ok(porDegrau[3].maxFundo >= FUNDO_DA_PROVA, 'no degrau 3 existe fundo para a última prova');

// ---------------------------------------------------------------------
// 4. Boias: o limite é desenhado, não é parede invisível
// ---------------------------------------------------------------------
for (const nivel of [1, 2]) {
  const boias = boiasDoLimite(map, nivel);
  assert.ok(boias.length > 40, `degrau ${nivel}: poucas boias (${boias.length})`);
  assert.ok(boias.length < 900, `degrau ${nivel}: boias demais (${boias.length})`);
  for (const b of boias) {
    assert.ok(podeNadar(map, b.x, b.y), 'boia fora da água');
    assert.ok(Math.abs(distanciaDaAreia(map, b.x, b.y) - DEGRAUS[nivel].alcance) < .35, 'boia fora da linha do limite');
  }
  assert.equal(boiasDoLimite(map, nivel), boias, 'boias calculadas uma vez por mapa');
}
for (const nivel of [0, 3, 4]) assert.equal(boiasDoLimite(map, nivel).length, 0, `degrau ${nivel} não tem cordão de boias`);

// ---------------------------------------------------------------------
// 5. JOGANDO: do medo da água à maré plena
// ---------------------------------------------------------------------
state.save.activeSlot = null;
state.progress.flags = {};
// Pontes abertas: aqui interessa o mar, não as travas das pontes.
for (const o of map.objects) if (o.gate) state.progress.flags[`gate_${o.id}`] = true;
state.progress.archetype = null;
delete state.progress.nado;
delete state.progress.questLog;
state.progress.inventory = [];
assert.equal(await loadMap('ilha_praia_inicial'), true);
const player = state.player;
const progress = state.progress;

const soltar = () => { for (const k of Object.keys(input.keys)) delete input.keys[k]; };
// Um quadro do jogo: movimento + provas, na mesma ordem do main.js.
let ultimaSubida = null;
function quadro(opcoes = {}) {
  if (opcoes.alvo) player.target = { x: opcoes.alvo[0], y: opcoes.alvo[1] };
  if (opcoes.mergulhar) input.keys[' '] = true; else delete input.keys[' '];
  updatePlayer(DT);
  garantirMissaoDeNado(progress);
  const r = atualizarProvas({ map, player, nado: player.nado, progress, dt: DT, parado: !!player.nadoParado });
  if (r.subiu) ultimaSubida = r.subiu;
  return r;
}
function por(segundos, opcoes) { let r; for (let i = 0; i < Math.round(segundos / DT); i++) r = quadro(opcoes); return r; }
function irPara(x, y, limite = 20, opcoes = {}) {
  for (let i = 0; i < limite / DT; i++) {
    if (Math.hypot(player.x - x, player.y - y) < .2) return true;
    quadro({ ...opcoes, alvo: [x, y] });
    if (opcoes.ate?.()) return true;
  }
  return Math.hypot(player.x - x, player.y - y) < .2;
}
function colocar(x, y) {
  player.x = x; player.y = y; player.target = null;
  if (player.nado) { player.nado.vx = 0; player.nado.vy = 0; }
}
player.invulnerable = 0;

// ---- 5.0 começa no degrau 0, com a missão aberta ----
quadro();
assert.equal(progress.nado.nivel, 0);
assert.equal(getQuestState(progress, MISSAO_NADO).status, 'active', 'pisar na praia abre APRENDER A NADAR');
assert.ok(getQuest(MISSAO_NADO).objectives.every(o => o.type === 'nado_degrau' && o.count === 1));
assert.deepEqual(getQuest(MISSAO_NADO).objectives.map(o => o.target), PROVAS.map(p => p.id));
assert.equal(getItem('boia_de_cortica').kind, 'lembrança', 'a recompensa está catalogada');

// ---- 5.1 MEDO DA ÁGUA: o mar empurra de volta e custa vida ----
colocar(13.5, 5.5);                       // areia na beira leste da ilha de chegada
assert.ok(canStandAt(map, 13.5, 5.5, .25, player));
progress.archetype = 'motor_bio_forja';             // sem módulo não existe barra de vida para o susto cobrar
ensureHealth(player, progress);
player.health = player.maxHealth;
por(.2);
const vidaAntes = player.health;
assert.ok(vidaAntes > 20, 'o operador tem barra de vida');
let entrouNoMar = false, maisLonge = 0;
for (let i = 0; i < 4 / DT; i++) {
  quadro({ alvo: [17.5, 5.5] });
  if (player.nado.ativo) { entrouNoMar = true; maisLonge = Math.max(maisLonge, distanciaDaAreia(map, player.x, player.y)); }
  assert.ok(distanciaDaAreia(map, player.x, player.y) <= DEGRAUS[0].alcance + .05, 'degrau 0 foi fundo demais');
}
por(1.5);                                  // solta: o corpo volta sozinho
assert.equal(entrouNoMar, true, 'dá para molhar o pé (é assim que o susto acontece)');
assert.ok(maisLonge <= DEGRAUS[0].alcance + .05);
assert.equal(player.nado.ativo, false, 'o medo devolve o operador para a areia');
assert.ok(canStandAt(map, player.x, player.y, .2, player), 'devolvido em chão firme');
assert.ok(player.health < vidaAntes, 'o susto custa vida');
assert.ok(vidaAntes - player.health <= 4 * NADO.danoSusto, 'mas custa pouco (e não por quadro)');
assert.equal(player.lastDamageSource, 'medo_da_agua');
assert.equal(progress.nado.nivel, 0);
// Clique no mar aberto não vira caminho no degrau 0.
input.click = { x: 18.5, y: 2.5 };
quadro();
assert.equal(player.target, null, 'clique além do degrau não cria alvo');
assert.equal(dispararArrancada(player.nado, false), false);

// ---- 5.2 A POÇA é a exceção: água rasa em cima de areia ----
const treino = map.pocas.find(p => p.treino);
assert.ok(treino, 'a praia tem poça de treino');
assert.ok('SM'.includes(grade[Math.floor(treino.y)][Math.floor(treino.x)]), 'a poça fica sobre areia (a grade não muda)');
assert.equal(podeNadar(map, treino.x, treino.y), false, 'para a grade, a poça é areia');
assert.ok(Math.abs(profundidadeEm(map, treino.x, treino.y, campo) - treino.profundidade) < 1e-9, 'mas tem profundidade de poça');
// Entra ANDANDO, vindo do spawn (a poça é alcançável a pé no degrau 0).
colocar(4.6, 9.1);
assert.ok(canStandAt(map, 4.6, 9.1, .25, player), 'ponto de partida ao lado da poça');
assert.ok(irPara(treino.x + .35, treino.y + .15, 8), `não consegui andar até a poça (parei em ${player.x.toFixed(2)},${player.y.toFixed(2)})`);
assert.equal(pocaEm(map, player.x, player.y), treino);
assert.equal(player.nado.ativo, true, 'na poça o operador está na água mesmo no degrau 0');
assert.equal(player.nado.medo, false, 'e sem medo: a poça é segura');
assert.equal(player.nado.naPoca, true);
assert.ok(Math.hypot(player.nado.corrente.x, player.nado.corrente.y) === 0, 'poça não tem correnteza');

// ---- 5.3 PROVA 1 — BOIAR ----
// Mexendo-se não vale.
{
  const antes = progress.nado.andamento?.valor ?? 0;
  for (let i = 0; i < 2 / DT; i++) quadro({ alvo: [treino.x + (i % 40 < 20 ? .5 : -.3), treino.y + .1] });
  assert.equal(progress.nado.nivel, 0, 'nadar de um lado para o outro não é boiar');
  assert.ok((progress.nado.andamento?.valor ?? 0) <= antes + .6);
}
player.target = null;
por(.8);                                   // deixa o embalo morrer
const hpBoiar = player.health;
let r = por(1.5);
assert.equal(progress.nado.nivel, 0, 'ainda não deu 3 s');
assert.ok(r.valor > 1 && r.valor < 3, `andamento visível no HUD (${r.valor.toFixed(2)})`);
assert.ok(Math.abs(resumoDaArvore(progress).fracao - r.valor / 3) < 1e-9);
// O andamento mora no SAVE, não no jogador: sobrevive a ida e volta em JSON.
{
  const copia = JSON.parse(JSON.stringify(progress.nado));
  assert.equal(copia.andamento.id, 'boiar');
  assert.ok(copia.andamento.valor > 1);
}
ultimaSubida = null;
por(2.2);
assert.equal(progress.nado.nivel, 1, 'boiou 3 s parado -> DEGRAU 1');
assert.equal(ultimaSubida.degrau.nome, 'BOIAR');
assert.equal(progress.nado.provas.boiar, true);
assert.equal(player.health, hpBoiar, 'boiar na poça não machuca');
assert.equal(getQuestState(progress, MISSAO_NADO).objectives[0].done, true, 'a missão marca a prova');
assert.equal(getQuestState(progress, MISSAO_NADO).objectives[1].done, false);

// ---- 5.4 DEGRAU 1: o raso abriu, o canal não ----
assert.equal(player.nado.arMax > 4.9 && player.nado.arMax < 5.1, true, `boiando cabem 5 s de ar (${player.nado.arMax})`);
colocar(13.5, 5.5);
por(.2);
for (let i = 0; i < 5 / DT; i++) {
  quadro({ alvo: [18.5, 5.5] });
  assert.ok(distanciaDaAreia(map, player.x, player.y) <= DEGRAUS[1].alcance + .05, 'degrau 1 passou do raso');
}
assert.equal(player.nado.ativo, true, 'no degrau 1 o operador fica no raso sem ser expulso');
assert.equal(player.nado.medo, false);
assert.ok(player.x < 15.2, `parou no cordão de boias (${player.x.toFixed(2)})`);
assert.equal(player.nadoEventos.limite, true, 'bater no limite avisa o HUD');
// Sem gesto de mergulho, o corpo fica na superfície; no raso, mesmo com o
// gesto, não passa do limite do degrau.
assert.ok(player.nado.profundidade <= SUPERFICIE + 1e-6);
por(.6, { mergulhar: true });
assert.ok(player.nado.profundidade <= DEGRAUS[1].mergulho + 1e-6, 'degrau 1 põe a cabeça na água mas não desce');
assert.equal(player.nado.submerso, true);
assert.equal(dispararArrancada(player.nado, true), false, 'quem só boia não arranca');
soltar();

// ---- 5.5 PROVA 2 — RESPIRAR (na poça, com o gesto) ----
colocar(treino.x + .3, treino.y + .1);
por(.5);
assert.equal(player.nado.submerso, false, 'sem ESPAÇO a cabeça fica fora');
// Segurar até o ar acabar: engole água, sobe sozinho e a prova NÃO passa...
// só se o ar acabar antes dos 4 s. Com 5 s de ar a prova passa aos 4.
por(2, { mergulhar: true });
assert.equal(player.nado.submerso, true, 'ESPAÇO põe a cabeça na água mesmo na poça rasa');
assert.ok(player.nado.ar < 3.2, 'o ar corre');
assert.equal(progress.nado.nivel, 1);
// Subir para respirar recomeça a contagem (a prova é contínua).
por(.3);
assert.equal(progress.nado.andamento.valor, 0, 'tirou a cabeça: recomeça');
por(1.2);                                   // recupera o ar
ultimaSubida = null;
por(4.1, { mergulhar: true });
assert.equal(progress.nado.nivel, 2, '4 s de cabeça submersa -> DEGRAU 2');
assert.equal(ultimaSubida.degrau.nome, 'FÔLEGO');
soltar();
// Quem insiste além do fôlego engole água (um golpe só) e sobe sozinho.
por(2);
{
  const hp = player.health;
  player.invulnerable = 0;
  let engoliu = false;
  for (let i = 0; i < 12 / DT; i++) {
    quadro({ mergulhar: true });
    if (player.nadoEventos.engoliu) { engoliu = true; player.nadoEventos.engoliu = false; }
  }
  assert.equal(engoliu, true, 'o ar acaba: engole água');
  assert.equal(player.nado.submerso, false, 'e o corpo sobe sozinho, mesmo com a tecla presa');
  assert.equal(hp - player.health, NADO.danoAfogamento, 'um golpe só, não por quadro');
  soltar();
  por(.2);
  assert.equal(player.nado.semFolego, false, 'soltou a tecla: pode mergulhar de novo');
}

// ---- 5.6 DEGRAU 2: canal sim, mar aberto não, fundo não ----
assert.ok(Math.abs(player.nado.arMax - DEGRAUS[2].ar) < .05);
// Teleporte para outra ilha NÃO é travessia.
colocar(13.4, 9.6); por(.2);
colocar(23.5, 9.6); por(.3);
assert.equal(progress.nado.nivel, 2, 'teleporte não conta como travessia');
// Atravessar pela PONTE também não.
colocar(13.0, 7.6); por(.2);
assert.ok(irPara(22.6, 7.6, 12), `a ponte de cima leva à ilha B (parei em ${player.x.toFixed(2)},${player.y.toFixed(2)})`);
por(.2);
assert.equal(progress.nado.nivel, 2, 'andar pela ponte não é nadar');
// Agora de verdade: da ilha de chegada à ilha B, a nado, entre as pontes.
colocar(13.4, 9.75); por(.3);
const ilhaOrigem = ilhaEm(map, player.x, player.y);
assert.ok(ilhaOrigem > 0);
let fundoMaximo = 0, nadou = 0, px = player.x, py = player.y;
ultimaSubida = null;
const chegou = irPara(22.7, 9.75, 25, {
  ate: () => {
    if (player.nado.ativo) { nadou += Math.hypot(player.x - px, player.y - py); fundoMaximo = Math.max(fundoMaximo, player.nado.profundidade); }
    px = player.x; py = player.y;
    assert.ok(distanciaDaAreia(map, player.x, player.y) <= DEGRAUS[2].alcance + .05, 'degrau 2 passou do alcance');
    return progress.nado.nivel === 3;
  },
});
assert.ok(chegou, `não completei a travessia (parei em ${player.x.toFixed(2)},${player.y.toFixed(2)}; ${JSON.stringify(progress.nado.andamento)})`);
assert.equal(progress.nado.nivel, 3, 'chegou a outra ilha a nado -> DEGRAU 3');
assert.equal(ultimaSubida.degrau.nome, 'TRAVESSIA');
assert.notEqual(ilhaEm(map, player.x, player.y), ilhaOrigem, 'saiu da água em OUTRA ilha');
assert.ok(nadou >= PROVAS[2].meta, `nadou de verdade (${nadou.toFixed(1)} tiles)`);
assert.ok(fundoMaximo <= SUPERFICIE + 1e-6, 'atravessou na superfície');

// A prova de fundo agora exige a afinidade do Maré.
progress.archetype = 'mare_astral';
// ---- 5.7 DEGRAU 3: mar aberto na superfície, mergulho curto ----
colocar(18.5, 2.5);                         // azul-escuro ao norte do canal
por(.6);
assert.equal(player.nado.ativo, true);
assert.equal(player.nado.foraDoAlcance, false, 'no degrau 3 o mar aberto é permitido');
assert.equal(player.nado.submerso, false, 'sobre o fundo, mas na superfície: mergulhar é um gesto');
assert.ok(player.nado.profundidade <= SUPERFICIE + 1e-6);
assert.ok(player.nado.fundo >= FUNDO_DA_PROVA);
assert.ok(Math.abs(player.nado.arMax - DEGRAUS[3].ar * (1 + player.nado.respeito.valor * NADO.arBonusMax) * NADO.arMare) < .05);
// ---- PROVA 4 — TOCAR O FUNDO ----
ultimaSubida = null;
const hpFundo = player.health;
por(.5, { mergulhar: true });
assert.equal(player.nado.submerso, true);
assert.equal(progress.nado.nivel, 3, 'ainda descendo');
por(1.6, { mergulhar: true });
assert.equal(progress.nado.nivel, 4, 'tocou o fundo -> DEGRAU 4');
assert.equal(ultimaSubida.degrau.nome, 'MARÉ PLENA');
assert.ok(player.nado.profundidade > 1.8);
assert.equal(player.health, hpFundo, 'a prova cabe no fôlego do degrau 3');
soltar();
por(.5);
assert.equal(player.nado.submerso, false, 'soltou: voltou à tona');

// ---- 5.8 MISSÃO concluída, recompensa uma vez só ----
assert.equal(isQuestComplete(progress, MISSAO_NADO), true);
assert.equal(getQuestState(progress, MISSAO_NADO).status, 'completed');
assert.equal(progress.flags.aprendeu_a_nadar, true);
assert.equal(progress.inventory.filter(i => i === 'boia_de_cortica').length, 1);
assert.equal(ultimaSubida.missoes.length, 1, 'a subida final devolve a missão concluída para o aviso');
garantirMissaoDeNado(progress); garantirMissaoDeNado(progress);
assert.equal(progress.inventory.filter(i => i === 'boia_de_cortica').length, 1, 'recompensa não se repete');
assert.equal(provaDe(progress.nado), null);
assert.equal(resumoDaArvore(progress).fracao, 1);
assert.deepEqual(Object.keys(progress.nado.provas).sort(), ['boiar', 'fundo', 'respirar', 'travessia']);

// ---- 5.9 DEGRAU 4: mergulho livre; o Maré Astral é a maré ----
assert.ok(Math.abs(player.nado.arMax - NADO.arMaximo * (1 + player.nado.respeito.valor * NADO.arBonusMax) * NADO.arMare) < .05, 'degrau pleno = fôlego de antes');
assert.equal(dispararArrancada(player.nado, false), true, 'no degrau pleno a arrancada existe');
player.nado.arrancada = 0; player.nado.vx = 0; player.nado.vy = 0; // prova de fundo sem sair do local
// Fragmentos e fauna leem `profundidade > 1.25`: mergulhando, vale.
por(1, { mergulhar: true });
assert.ok(player.nado.profundidade > 1.25 && player.nado.submerso);
soltar(); por(.5);
// Respeito do mar persiste no save.
assert.ok(progress.nado.respeito > 0, 'o respeito ganho no fundo vai para o save');
assert.equal(progress.nado.respeito, player.nado.respeito.valor);

{
  // Maré Astral pleno com respeito máximo: 22 × 1,8 × 1,3 = 51,5 s.
  const n = criarEstadoNado();
  n.respeito.valor = 1;
  const ctx = { map, x: 18.5, y: 2.5, field: campo, dt: DT, arvore: criarArvore(4) };
  atualizarNado(n, { ...ctx, mareAstral: true });
  assert.ok(Math.abs(n.arMax - 22 * 1.8 * 1.3) < 1e-6, `fôlego do Maré Astral pleno: ${n.arMax}`);
  assert.equal(Math.round(n.arMax), 51);
  assert.equal(n.mareAstral, true);
  // A afinidade já ajuda antes do degrau pleno.
  const m = criarEstadoNado();
  m.respeito.valor = 1;
  atualizarNado(m, { ...ctx, arvore: criarArvore(3), mareAstral: true });
  assert.equal(m.mareAstral, true);
  assert.ok(Math.abs(m.arMax - 13 * 1.8 * NADO.arMare) < 1e-6);
  // Sem ser Maré: 22 × 1,8.
  const o = criarEstadoNado();
  o.respeito.valor = 1;
  atualizarNado(o, ctx);
  assert.ok(Math.abs(o.arMax - 22 * 1.8) < 1e-6);

  // Correnteza contrária freia o Maré pela metade; a favor ajuda igual.
  const contra = (mare) => {
    const s = criarEstadoNado();
    s.ativo = true; s.nivel = 4; s.mareAstral = mare;
    s.corrente = { x: -NADO.correnteForca, y: 0, forca: 1 };
    for (let i = 0; i < 240; i++) moverNaAgua(s, DT, 1, 0, 4);
    return s.vx;
  };
  const vMare = contra(true), vOutro = contra(false);
  assert.ok(vMare > vOutro * 1.2, `Maré contra a corrente: ${vMare.toFixed(2)} vs ${vOutro.toFixed(2)}`);
  const favor = (mare) => {
    const s = criarEstadoNado();
    s.ativo = true; s.nivel = 4; s.mareAstral = mare;
    s.corrente = { x: NADO.correnteForca, y: 0, forca: 1 };
    for (let i = 0; i < 240; i++) moverNaAgua(s, DT, 1, 0, 4);
    return s.vx;
  };
  assert.ok(favor(true) > favor(false), "afinidade também melhora a velocidade base");
  // Nadar nunca passa de andar (4,0 tiles/s) fora da arrancada — nem a favor
  // da corrente... a não ser pelo empurrão da própria correnteza.
  const semCorrente = criarEstadoNado();
  semCorrente.ativo = true; semCorrente.nivel = 4; semCorrente.mareAstral = true; semCorrente.respeito.valor = 0;
  for (let i = 0; i < 240; i++) moverNaAgua(semCorrente, DT, 1, 0, 4);
  assert.ok(semCorrente.vx < 4, `braçada plena sem respeito: ${semCorrente.vx.toFixed(2)} < 4`);

  // A braçada cresce com o degrau.
  const vel = nivel => {
    const s = criarEstadoNado();
    s.ativo = true; s.nivel = nivel;
    for (let i = 0; i < 240; i++) moverNaAgua(s, DT, 1, 0, 4);
    return s.vx;
  };
  assert.ok(vel(1) < vel(2) && vel(2) < vel(3) && vel(3) < vel(4));
  assert.ok(Math.abs(vel(4) - 4 * NADO.velocidade) < .01, 'degrau pleno nada como antes da árvore');
}

// ---------------------------------------------------------------------
// 6. Limite de profundidade em TODO degrau (varredura)
// ---------------------------------------------------------------------
for (const grau of DEGRAUS) {
  const n = criarEstadoNado();
  const arvore = criarArvore(grau.nivel);
  let maxProf = 0;
  for (let i = 0; i < 180; i++) {
    atualizarNado(n, { map, x: 18.5, y: 2.5, field: campo, dt: DT, arvore, mergulhar: true });
    maxProf = Math.max(maxProf, n.profundidade);
  }
  assert.ok(maxProf <= grau.mergulho + 1e-6 || (grau.mergulho === 0 && maxProf <= SUPERFICIE + 1e-6),
    `${grau.nome}: corpo desceu a ${maxProf.toFixed(2)} (limite ${grau.mergulho})`);
  if (grau.nivel === 0) {
    assert.equal(n.submerso, false, 'com medo da água não se põe a cabeça na água');
    assert.equal(n.medo, true);
  }
  if (grau.nivel >= 3) assert.ok(maxProf > 1.8, `${grau.nome} alcança o fundo`);
  if (grau.nivel === 1 || grau.nivel === 2) {
    assert.equal(n.foraDoAlcance, true, `${grau.nome}: azul-escuro está além do alcance`);
  }
}

// ---------------------------------------------------------------------
// 7. Além do alcance (save carregado no fundo, dash, respawn): o corpo volta
// ---------------------------------------------------------------------
progress.nado = criarArvore(1);
colocar(16.5, 5.5);                          // 3 tiles da areia: fundo demais para quem boia
player.health = player.maxHealth; player.invulnerable = 0;
quadro();
assert.equal(player.nado.foraDoAlcance, true);
const hpVolta = player.health;
por(4);
assert.equal(player.nado.foraDoAlcance, false, 'a água devolve o operador para dentro do limite');
assert.ok(distanciaDaAreia(map, player.x, player.y) <= DEGRAUS[1].alcance + .05);
assert.equal(player.health, hpVolta, 'voltar para o raso não custa vida (só o medo custa)');

console.log(`Árvore de nado: 5 degraus conquistados jogando. Água alcançável por degrau: ${porDegrau.map(p => p.n).join(' / ')} amostras; ` +
  `ilhas ${porDegrau.map(p => p.ilhas.size).join(' / ')}; boias ${[1, 2].map(n => boiasDoLimite(map, n).length).join(' / ')}.`);
