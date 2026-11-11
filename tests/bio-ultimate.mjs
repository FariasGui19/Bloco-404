// =====================================================================
// MOTOR BIO-FORJA — A ULTIMATE QUE A FERRAMENTA INSTALA
//
// No Bio a Ultimate nível 1 não inventa outro gesto: ela faz a FERRAMENTA
// escolhida executar o próprio golpe. Este teste amarra as três pontas:
//
//   1. cada ferramenta tem assinatura própria e ela chega no efeito;
//   2. existe folha de execução para cada assinatura, no manifesto e no disco;
//   3. o renderer sabe qual desenhar em carga/impacto/recuperação;
//   4. o bônus da ferramenta fica ativo durante a janela da Ultimate;
//   5. o corpo da arte não muda de tamanho em relação ao operador equipado.
// =====================================================================
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { getTool, getTools } from '../js/data/archetype-tools.js';
import { getUltimate } from '../js/data/ultimates.js';
import {
  BIO_ULTIMATE_SHEETS, getBioUltimateFrame, getBioUltimatePosePath, getBioUltimateSprite,
} from '../js/data/bio-ultimate-animation.js';
import { canCastUltimate, beginUltimate, updateUltimate, getActiveUltimate } from '../js/game/ultimate.js';

const ARQ = 'motor_bio_forja';

function progresso(ferramenta) {
  return {
    archetype: ARQ,
    archetypeProgress: { [ARQ]: { level: 5, xp: 0 } },
    abilities: {},
    tools: { [ARQ]: ferramenta },
    flags: {},
  };
}

function jogador(extra = {}) {
  return {
    x: 10, y: 10, facing: 'down',
    health: 120, maxHealth: 120,
    energy: 100, maxEnergy: 100,
    equippedSuit: 'bio_forja',
    ability: { cooldowns: {}, dash: null },
    moving: false,
    combat: null,
    ultimate: { cooldown: 0, buff: null, effect: null, casts: 0, charge: 0, shake: null, flash: null },
    ...extra,
  };
}

// ---------------------------------------------------------------
// 1. FERRAMENTA → ASSINATURA → FOLHA
// ---------------------------------------------------------------
const ESPERADO = {
  lamina_de_forja: { signature: 'serra', sprite: 'player_bio_ult_serra', buff: 'FIO INSTÁVEL' },
  punho_de_impacto: { signature: 'martelo', sprite: 'player_bio_ult_martelo', buff: 'PESO DE FORJA' },
  gancho_magnetico: { signature: 'cabos', sprite: 'player_bio_ult_cabos', buff: 'REDE ESTENDIDA' },
  asa_de_impulso: { signature: 'propulsores', sprite: 'player_bio_ult_propulsores', buff: 'PROPULSOR ABERTO' },
};
const ferramentas = getTools(ARQ).map(t => t.id);
assert.equal(ferramentas.length, 4, 'o módulo tem as quatro ferramentas');
for (const id of ferramentas) assert(ESPERADO[id], `ferramenta inesperada: ${id}`);

for (const [id, alvo] of Object.entries(ESPERADO)) {
  const tool = getTool(ARQ, id);
  assert(tool, `${id} existe`);
  assert.equal(tool.ultimate.tier, 'tool', `${id}: a Ultimate é da ferramenta`);
  assert.equal(tool.ultimate.signature, alvo.signature, `${id}: assinatura ${alvo.signature}`);
  assert.equal(tool.ultimate.buff.label, alvo.buff, `${id}: bônus ${alvo.buff}`);
  const sheet = BIO_ULTIMATE_SHEETS[alvo.signature];
  assert(sheet, `${alvo.signature}: folha declarada`);
  assert.equal(sheet.sprite, alvo.sprite);
  assert.equal(sheet.cols, 4, 'quatro quadros por folha');
}

// A base do módulo (sem ferramenta escolhida) é a cúpula.
const base = getUltimate(ARQ);
assert.equal(base.signature, 'forja_dome');
assert.equal(BIO_ULTIMATE_SHEETS.forja_dome.sprite, 'player_bio_ult_forja_dome');

// ---------------------------------------------------------------
// 2. FOLHAS NO DISCO E NO MANIFESTO
// ---------------------------------------------------------------
const manifesto = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
for (const sheet of Object.values(BIO_ULTIMATE_SHEETS)) {
  const arquivo = `assets/sprites/player/${sheet.sprite.replaceAll('_', '-')}.png`;
  assert(existsSync(new URL(`../${arquivo}`, import.meta.url)), `${arquivo} existe`);
  const png = readFileSync(new URL(`../${arquivo}`, import.meta.url));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png[25], 6, `${arquivo}: alpha real, sem fundo magenta`);
  assert.equal(png.readUInt32BE(16), 1280, `${arquivo}: 4 quadros de 320 px`);
  assert.equal(png.readUInt32BE(20), 320, `${arquivo}: uma linha de quadros`);
  assert.match(manifesto, new RegExp(`'${sheet.sprite}'`), `${sheet.sprite} no manifesto`);
}

// O script de arte é reproduzível: as fontes e o preparador ficam no repo.
for (const fonte of ['bio-ultimate', 'bio-ult-lamina', 'bio-ult-punho', 'bio-ult-gancho', 'bio-ult-asa']) {
  assert(existsSync(new URL(`../assets/source-art/bio/${fonte}.png`, import.meta.url)), `fonte ${fonte}`);
}
const preparador = readFileSync(new URL('../tools/preparar-bio-ultimate.py', import.meta.url), 'utf8');
// O recorte vive em tools/bio_arte.py, compartilhado com as folhas de ação.
const recorte = readFileSync(new URL('../tools/bio_arte.py', import.meta.url), 'utf8');
assert.match(preparador, /load_frames/, 'o preparador usa o recorte compartilhado');
assert.match(preparador, /compose/, 'o preparador compõe células iguais');
assert.match(recorte, /def remove_magenta/, 'o recorte limpa o fundo magenta');
assert.match(recorte, /def fit_bands/, 'o recorte descarta a linha de grade');

// ---------------------------------------------------------------
// 3. QUADRO POR ESTADO REAL — carga, impacto, recuperação
// ---------------------------------------------------------------
const progress = progresso('punho_de_impacto');
const ativo = getActiveUltimate(progress);
assert.equal(ativo.tier, 'tool', 'com ferramenta escolhida, o F é da ferramenta');
assert.equal(ativo.definition.name, 'MARTELO DE FORJA');

// Sem Ultimate acontecendo, ninguém desenha a folha.
assert.equal(getBioUltimateFrame(progress, jogador()), null, 'parado, sem Ultimate: sem quadro');
// Outro arquétipo nunca usa a folha do Bio.
assert.equal(getBioUltimateFrame({ archetype: 'nucleo_dez_forma' }, jogador()), null);

const player = jogador();
assert(canCastUltimate(player, progress).ok, 'o F está disponível');
beginUltimate({ player, progress, targets: [] });
assert(player.ultimate.charge > 0, 'a carga abre antes de soltar');

const cargaInicio = getBioUltimateFrame(progress, player);
assert.equal(cargaInicio.phase, 'charge');
assert.equal(cargaInicio.sprite, 'player_bio_ult_martelo', 'a carga já veste a arte da ferramenta escolhida');
assert.equal(cargaInicio.col, 0);

// Meio da carga: segundo quadro.
player.ultimate.charge = player.ultimate.chargeDuration * .2;
assert.equal(getBioUltimateFrame(progress, player).col, 1, 'carga avança para o segundo quadro');

// A carga termina e o efeito nasce: impacto.
updateUltimate(player, progress, .5, { targets: [] });
const impacto = getBioUltimateFrame(progress, player);
assert(impacto, 'a soltura tem quadro');
assert.equal(impacto.phase, 'impact');
assert.equal(impacto.col, 2);
assert.equal(impacto.sprite, 'player_bio_ult_martelo');
assert(player.ultimate.effect.signature, 'martelo', 'o efeito carrega a assinatura até o desenho');

// O bônus da ferramenta vale durante a janela da Ultimate.
assert(player.ultimate.buff, 'a ferramenta liga o próprio bônus');
assert.equal(player.ultimate.buff.label, 'PESO DE FORJA');

// Fim do efeito: recuperação e depois nada.
const efeito = player.ultimate.effect;
player.ultimate.effect = { ...efeito, timeLeft: efeito.duration * .3 };
assert.equal(getBioUltimateFrame(progress, player).phase, 'recover');
assert.equal(getBioUltimateFrame(progress, player).col, 3);
player.ultimate.effect = { ...efeito, timeLeft: .01 };
player.ultimate.effect = null;
assert.equal(getBioUltimateFrame(progress, player), null, 'sem efeito, o corpo volta ao normal');

// Durante a varredura ou o dash a folha não rouba o corpo.
const ocupado = jogador({ ultimate: { ...jogador().ultimate, charge: .2, chargeDuration: .42, chargeSignature: 'serra' } });
ocupado.ability.scanning = .4;
assert.equal(getBioUltimateFrame(progress, ocupado), null, 'varredura tem prioridade');

// ---------------------------------------------------------------
// 4. TODAS AS CINCO ASSINATURAS DESENHAM
// ---------------------------------------------------------------
for (const [assinatura, sheet] of Object.entries(BIO_ULTIMATE_SHEETS)) {
  const p = jogador();
  p.ultimate.effect = {
    id: assinatura, signature: assinatura, timeLeft: .9, duration: 1, color: '#3fd0ff',
  };
  const quadro = getBioUltimateFrame(progresso(null), p);
  assert(quadro, `${assinatura}: tem quadro na soltura`);
  assert.equal(quadro.sprite, sheet.sprite);
}

// ---------------------------------------------------------------
// 5. O CORPO NÃO MUDA DE TAMANHO
// ---------------------------------------------------------------
// O operador equipado desenha a folha de 4×2 com escala .31: ~130 px úteis.
// A folha da Ultimate tem 230 px úteis por célula de 320; .57 devolve ~131.
for (const sheet of Object.values(BIO_ULTIMATE_SHEETS)) {
  const altura = 230 * sheet.scale;
  assert(Math.abs(altura - 130) < 12, `${sheet.sprite}: altura ${altura.toFixed(0)}px perto do operador`);
  assert.equal(sheet.cell, 320);
  assert.equal(sheet.footY, 276);
}

// ---------------------------------------------------------------
// 6. RENDERER — a folha do Bio entra no caminho do desenho
// ---------------------------------------------------------------
const renderer = readFileSync(new URL('../js/engine/renderer.js', import.meta.url), 'utf8');
assert.match(renderer, /getBioUltimateFrame/, 'o renderer consulta a animação do Bio');
// Agora são três módulos com execução desenhada; a ordem é Núcleo → Bio → Maré.
const posNucleo = renderer.indexOf('getUltimateFrame(state.progress, player)');
const posBio = renderer.indexOf('getBioUltimateFrame(state.progress, player)');
const posMare = renderer.indexOf('getMareUltimateFrame(state.progress, player)');
assert(posNucleo > 0 && posBio > posNucleo && posMare > posBio,
  'Núcleo, depois Bio, depois Maré — sem brigar pelo corpo');

// ---------------------------------------------------------------
// 7. CÓDEX — a ferramenta mostra a própria execução antes de gastar energia
// ---------------------------------------------------------------
for (const assinatura of Object.keys(BIO_ULTIMATE_SHEETS)) {
  const caminho = getBioUltimatePosePath(assinatura);
  assert.equal(caminho, `assets/sprites/player/${getBioUltimateSprite(assinatura).replaceAll('_', '-')}.png`);
  assert(existsSync(new URL(`../${caminho}`, import.meta.url)), `${assinatura}: miniatura ${caminho} existe`);
}
assert.equal(getBioUltimatePosePath('assinatura_inexistente'), null, 'sem assinatura, sem miniatura');
const codex = readFileSync(new URL('../js/ui/codex.js', import.meta.url), 'utf8');
assert.match(codex, /getBioUltimatePosePath/, 'o Códex usa a arte da execução');
assert.match(codex, /codex-tool-pose/, 'cartão da ferramenta tem a pose');
assert.match(codex, /--pose-sheet/, 'a folha entra como variável de recorte');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const blocoPose = css.slice(css.indexOf('.codex-tool-pose'), css.indexOf('.codex-tool-tag'));
assert.match(blocoPose, /background-size: calc\(var\(--poses, 4\) \* 100%\) 100%/, 'recorte pela largura da folha');
assert.match(blocoPose, /aspect-ratio: 1 \/ 1/, 'a célula é quadrada');
assert.match(blocoPose, /image-rendering: pixelated/, 'pixel art sem borrão');

// LiqUIdo de verdade: monta a aba de progressão com o DOM mínimo (mesmo
// caminho do tests/codex.mjs) e confere o HTML do cartão da ferramenta.
{
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
  globalThis.document = { createElement: () => overlay, body: { appendChild() {} } };
  const { openCodex, setTab } = await import('../js/ui/codex.js');
  const p = progresso('lamina_de_forja');
  p.archetypeProgress[ARQ].level = 5;
  const hero = jogador();
  openCodex(p, null, hero);
  setTab('progressao');
  const html = elements.get('#codexPanel').innerHTML;
  assert.match(html, /assets\/sprites\/player\/player-bio-ult-serra\.png/, 'o cartão da Lâmina mostra a folha da serra');
  assert.match(html, /class="codex-tool-pose"/, 'miniatura de execução presente');
  assert.match(html, /--poses:4;--pose:0/, 'o recorte começa no quadro do preparo');
  assert.match(html, /FÍO INSTÁVEL|CORTE DE RECONFIGURAÇÃO|FIO INSTÁVEL/);
  assert.match(html, /LÂMINA DE FORJA/, 'a ferramenta continua listada');
  delete globalThis.document;
}

// ---------------------------------------------------------------
// 8. EXO VIVO — vapor de pistão e bobina da ferramenta
// ---------------------------------------------------------------
assert.match(renderer, /function drawBioForjaFx/, 'o exo tem leitura própria');
assert.match(renderer, /drawBioForjaFx\(player, ix, iy, player\.moving/, 'respira parado e no passo');
assert.match(renderer, /getSelectedToolId\(state\.progress\)/, 'a bobina acesa segue a ferramenta instalada');
for (const [id, brilho] of Object.entries({
  lamina_de_forja: '#8ff2ff', punho_de_impacto: '#ffc23d', gancho_magnetico: '#7dffd8', asa_de_impulso: '#3fd0ff',
})) {
  assert(renderer.includes(`${id}: { cor: '${brilho}'`), `${id}: cor própria no exo`);
}

console.log('Motor Bio-Forja: as quatro ferramentas executam a própria Ultimate, com arte e bônus OK.');
