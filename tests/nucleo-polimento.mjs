// node tests/nucleo-polimento.mjs
// Regressão da rodada 0.11.6: arte limpa/orientada, colisão de verdade,
// Q durante a metamorfose, feedback de bloqueio e cena viva do viaduto.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { readFileSync, existsSync } from 'node:fs';
import { state } from '../js/game/state.js';
import { input } from '../js/engine/input.js';
import { loadMap } from '../js/game/map-manager.js';
import { getArchetypeAbilities, updateAbilities } from '../js/game/abilities.js';
import { toggleNucleoForm } from '../js/game/nucleo-form.js';
import { canStandAt, moveWithCollision, getObjectHitbox } from '../js/game/collision.js';
import { isGateOpen } from '../js/game/gates.js';
import { getInteractionPrompt, checkInteractions } from '../js/game/interactions.js';
import { closeDialogue } from '../js/ui/dialogue.js';
import { ensureArchetypeProgress } from '../js/game/progression.js';
import { viadutoPortalFacing, renderViadutoVetores } from '../js/engine/viaduto-view.js';
import { camera, snapCameraTo } from '../js/engine/camera.js';

// ---- DOM/canvas mínimos: o renderer roda de verdade, sem navegador ----
const gradient = { addColorStop() {} };
const calls = [];
const badNumbers = [];
function makeCtx() {
  const target = {
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  };
  return new Proxy(target, {
    get(t, key) {
      if (key in t) return t[key];
      return (...args) => {
        calls.push([String(key), ...args]);
        for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) badNumbers.push(`${String(key)}(${a})`);
      };
    },
    set(t, key, value) { t[key] = value; return true; },
  });
}
const element = () => ({
  dataset: {}, children: [], style: {}, textContent: '', innerHTML: '',
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  addEventListener() {}, appendChild(c) { this.children.push(c); }, click() {},
  setAttribute() {}, focus() {}, querySelector: () => null, querySelectorAll: () => [],
});
const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, element()]));
globalThis.document = {
  getElementById: id => elements[id] ?? element(),
  createElement: tag => tag === 'canvas' ? { width: 0, height: 0, getContext: () => makeCtx() } : element(),
  body: element(),
};
globalThis.window = { addEventListener() {}, innerWidth: 1280, innerHeight: 720 };
state.save.loaded = false;
state.save.activeSlot = null;

function progresso(level = 4) {
  const p = {
    archetype: 'nucleo_dez_forma', abilities: getArchetypeAbilities('nucleo_dez_forma'),
    archetypeProgress: {}, tools: { nucleo_dez_forma: 'nucleo_bruto' }, flags: {}, inventory: [],
  };
  ensureArchetypeProgress(p);
  p.archetypeProgress.nucleo_dez_forma.level = level;
  return p;
}
function press(key) {
  input.pressed.clear(); input.pressed.add(key);
  updateAbilities(0);
  input.pressed.clear();
}
function tick(seconds, step = .02) {
  for (let t = 0; t < seconds - 1e-6; t += step) updateAbilities(step);
}

// ---------------------------------------------------------------
// 1. ARTE — nada de placeholder procedural ou magenta preso no vão
// ---------------------------------------------------------------
const mainJs = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const pipeline = readFileSync(new URL('../tools/preparar-sala-nucleo.py', import.meta.url), 'utf8');
assert(!pipeline.includes('def draw_regulator'), 'regulador procedural removido do pipeline');
assert(!pipeline.includes('def draw_relicario'), 'relicário procedural removido do pipeline');
assert(!pipeline.includes('def draw_arch'), 'arco procedural removido do pipeline');
assert.match(pipeline, /ImageOps\.mirror\(remove_magenta\(spindle/, 'eixo espelhado na fonte para face SE');
assert.match(pipeline, /ImageOps\.mirror\(remove_magenta\(Image\.open\(SRC \/ "terminal-registro\.png"\)/, 'terminal espelhado na fonte para face SE');
const rendererSrc = readFileSync(new URL('../js/engine/renderer.js', import.meta.url), 'utf8');
assert.match(rendererSrc, /nucleo_10x'\) drawObjectContactShadows/, 'campo sombra:[w,h] é consumido no renderer do Núcleo');
assert.match(rendererSrc, /drawNucleo10xViadutoGate/, 'eclusa do viaduto tem filme/varredura animados');
assert.match(rendererSrc, /estiloSala === 'carga_eco'/, 'Área de Carga tem renderer vivo próprio');
for (const file of ['regulador-inercia-v2.png', 'relicario-vetor-v2.png', 'arco-viaduto-v2.png']) {
  assert(existsSync(new URL(`../assets/source-art/sala-nucleo/${file}`, import.meta.url)), `fonte pintada ${file}`);
}
const pecas = ['panorama-noite', 'vao-trelica', 'pod-carga', 'guindaste', 'totem-sinal', 'modulo-bomba'];
for (const name of pecas) {
  const path = new URL(`../assets/sprites/viaduto-vetores/${name}.png`, import.meta.url);
  assert(existsSync(path), `peça pintada ${name}`);
  const png = readFileSync(path);
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png[25], name === 'panorama-noite' ? 2 : 6, `${name}: alpha só nos sprites, fundo opaco`);
  assert(png.length > 10000, `${name}: arte real, não placeholder`);
  assert(mainJs.includes(`assets/sprites/viaduto-vetores/${name}.png`), `${name} no manifesto`);
}
// PNG RGBA: nenhum pixel VISÍVEL pode continuar magenta saturado. A checagem
// de alpha evita falso positivo em RGB de pixel totalmente transparente.
function decodeRgba(path) {
  // Decoder mínimo para PNG 8-bit RGBA não entrelaçado (saída do Pillow).
  const buf = readFileSync(path);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  assert.equal(buf[24], 8, `${path}: 8 bits`);
  assert.equal(buf[25], 6, `${path}: RGBA`);
  assert.equal(buf[28], 0, `${path}: não entrelaçado`);
  const chunks = [];
  for (let off = 8; off < buf.length;) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') chunks.push(buf.subarray(off + 8, off + 8 + len));
    off += len + 12;
  }
  const { inflateSync } = require('node:zlib');
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = w * 4, out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? out[y * stride + x - 4] : 0;
      const b = y ? out[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y ? out[(y - 1) * stride + x - 4] : 0;
      let v = raw[pos++];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, data: out };
}
for (const name of ['eixo-adaptacao', 'terminal-registro', 'malha-cinetica', 'pilar-cinetico', 'regulador-inercia', 'relicario-vetor', 'arco-viaduto', 'bigorna-contrapeso']) {
  const { data } = decodeRgba(new URL(`../assets/sprites/sala-nucleo/${name}.png`, import.meta.url));
  let magenta = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a > 40 && Math.min(r, b) - g > 82 && Math.abs(r - b) < 64 && g < 150) magenta++;
  }
  assert.equal(magenta, 0, `${name}: nenhum magenta visível preso`);
}

// ---------------------------------------------------------------
// 2. COLISÃO — o corpo não atravessa a bigorna por nenhum lado
// ---------------------------------------------------------------
state.progress = progresso();
await loadMap('sala_nucleo', 'vindo_do_aeroporto');
const map = state.world.currentMap;
const weight = state.objects.find(o => o.id === 'contrapeso_viaduto');
assert.equal(weight.bloqueia, true);
const arch = state.objects.find(o => o.id === 'arco_viaduto_nucleo');
assert.equal(arch?.espelhar, true, 'arco do viaduto olha para a rota, não para fora da sala');
const box = getObjectHitbox(weight);
assert(box.width >= 1.2 && box.height >= .9, 'hitbox acompanha a base larga da bigorna');
assert(!canStandAt(map, weight.x, weight.y, .25, state.player));
// Isola a bigorna das paredes: na câmara leste real há muro a oeste/leste.
// O teste de quatro lados roda no piso aberto oeste e depois restaura o mapa.
const weightHome = { x: weight.x, y: weight.y };
weight.x = 5.5; weight.y = 6.0;
for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  const body = { x: weight.x + dx * 2.1, y: weight.y + dy * 2.1 };
  assert(canStandAt(map, body.x, body.y, .25, state.player), `ponto de partida (${body.x},${body.y}) vindo de (${dx},${dy}) é piso livre`);
  // Passos pequenos, como o updatePlayer real; nunca um teleport de teste.
  for (let i = 0; i < 60; i++) moveWithCollision(map, body, -dx * .06, -dy * .06, .25);
  const dist = Math.hypot(body.x - weight.x, body.y - weight.y);
  const stop = (dx ? box.width / 2 : box.height / 2) + .25;
  assert(dist >= stop - .04 && dist <= stop + .15, `corpo parado na face da bigorna vindo de (${dx},${dy}), dist=${dist}, esperado≈${stop}`);
  assert(canStandAt(map, body.x, body.y, .25, state.player), 'corpo fica FORA do sólido, não dentro');
}
Object.assign(weight, weightHome);
const relic = state.objects.find(o => o.id === 'relicario_vetor_nucleo');
assert.equal(relic.bloqueia, true, 'relicário também é pedestal sólido');
assert(!canStandAt(map, relic.x, relic.y, .25, state.player));

// ---------------------------------------------------------------
// 3. Q DURANTE O T — o pedido não some no meio da metamorfose
// ---------------------------------------------------------------
Object.assign(state.player, {
  x: weight.x, y: weight.y - 1.5, facing: 'down', energy: 100, maxEnergy: 100,
  nucleoForm: null, nucleoRuntime: { remaining: 0, recharge: 0 },
  ability: { cooldowns: {}, dash: null, scanning: 0, cast: null, effect: null },
});
state.progress.flags.base_vetores_sincronizada = true;
state.progress.flags.scan_contrapeso_nucleo = true;
assert(toggleNucleoForm(state.progress, state.player, 'forma_bruta'));
assert.equal(state.player.ability.effect?.activating, true);
press('q');
assert.equal(state.player.ability.queuedSmash?.facing, 'down', 'Q guarda a mira durante o T');
assert.match(state.player.ability.lastMessage, /PANCADA NA FILA/);
assert.equal(state.player.ability.cast, null, 'não interrompe a metamorfose');
tick(1.1);
assert.equal(state.player.ability.queuedSmash, null);
assert.equal(state.player.ability.cast?.id, 'pancada_quebra', 'pedido sai sozinho no primeiro quadro livre');
assert(Math.abs(state.player.ability.cast.dx - Math.SQRT1_2) < 1e-12, 'mira congelada aponta para baixo no iso');
tick(.6);
assert(isGateOpen(weight), 'Q enfileirado parte o contrapeso de verdade');
assert.equal(state.progress.flags.rota_viaduto_vetores_aberta, true);
assert.equal(weight.bloqueia, true, 'contrapeso partido vira entulho sólido, não porta atravessável');
assert(!canStandAt(map, weight.x, weight.y, .25, state.player), 'rota liberada não deixa o corpo entrar no entulho');
assert.match(state.player.ability.lastMessage, /CONTRAPESO PARTIDO/);

// Cancelar a forma limpa a fila; trocar de mapa também. Nada dispara depois.
state.player.ability.cast = null;
state.player.ability.queuedSmash = { timeLeft: 1, facing: 'down', dx: 1, dy: 1 };
state.player.nucleoForm = null;
updateAbilities(.02);
assert.equal(state.player.ability.queuedSmash, null, 'retorno ao operador cancela a fila');
state.player.nucleoForm = 'forma_bruta';
state.player.ability.queuedSmash = { timeLeft: 1, facing: 'down', dx: 1, dy: 1 };
await loadMap('viaduto_dos_vetores', 'vindo_da_base_nucleo');
assert.equal(state.player.ability.queuedSmash, null, 'fila não atravessa a eclusa');

// ---------------------------------------------------------------
// 4. BLOQUEIO EXPLICADO — nível/scan/pré-requisito nunca são no-op
// ---------------------------------------------------------------
state.progress = progresso(1);
state.progress.flags.base_vetores_sincronizada = true;
state.progress.flags.scan_contrapeso_nucleo = true;
await loadMap('sala_nucleo', 'vindo_do_aeroporto');
const w2 = state.objects.find(o => o.id === 'contrapeso_viaduto');
Object.assign(state.player, {
  x: w2.x, y: w2.y - 1.5, facing: 'down', energy: 100,
  nucleoForm: 'forma_bruta', nucleoRuntime: { remaining: 20, recharge: 0 },
  ability: { cooldowns: {}, dash: null, scanning: 0, cast: null, effect: null },
});
press('q'); tick(.6);
assert(!isGateOpen(w2));
assert.match(state.player.ability.lastMessage, /NÍVEL 4/, 'nível insuficiente responde');
state.progress.archetypeProgress.nucleo_dez_forma.level = 4;
delete state.progress.flags.scan_contrapeso_nucleo;
state.player.ability.cooldowns = {};
press('q'); tick(.6);
assert(!isGateOpen(w2));
assert.match(state.player.ability.lastMessage, /\[R\]/, 'scan ausente manda ler com R');
const prompt = getInteractionPrompt({ kind: 'object', data: w2 });
assert.match(prompt, /\[R\].*\[Q\]/, 'prompt E também explica a sequência');
state.progress.flags.scan_contrapeso_nucleo = true;
state.player.facing = 'up'; state.player.ability.cooldowns = {};
press('q'); tick(.6);
assert(!isGateOpen(w2));
assert.match(state.player.ability.lastMessage, /VIRE DE FRENTE/, 'golpe de costas não abre e explica a mira');

// ---------------------------------------------------------------
// 5. VIADUTO — peças novas, portas viradas para a rota, cena viva
// ---------------------------------------------------------------
assert.equal(viadutoPortalFacing('retorno_base_vetores'), 'right', 'eclusa oeste olha para dentro/leste');
assert.equal(viadutoPortalFacing('chegada_estacao_bio_viaduto'), 'left', 'eclusa leste olha para dentro/oeste');
await loadMap('viaduto_dos_vetores', 'vindo_da_base_nucleo');
const vmap = state.world.currentMap;
assert.equal(vmap.meta.sideView, true);
assert(vmap.objects.some(o => o.id === 'bomba_inducao_viaduto' && o.sprite === 'viaduto_modulo_bomba'));
assert(!vmap.objects.some(o => String(o.sprite).includes('pilar_cinetico')), 'sem pilar iso solto no side-view');
const pump = state.objects.find(o => o.id === 'bomba_inducao_viaduto');
Object.assign(state.player, { x: pump.x, y: pump.y + 1.5, nucleoForm: null, ability: { cooldowns: {} } });
await checkInteractions(true); closeDialogue();
assert.equal(state.progress.flags.bomba_viaduto_estabilizada, true, 'bomba interage e persiste');
const xpBefore = state.progress.archetypeProgress.nucleo_dez_forma.xp;
await checkInteractions(true); closeDialogue();
assert.equal(state.progress.archetypeProgress.nucleo_dez_forma.xp, xpBefore, 'bomba não paga XP duas vezes');

// Render completo em três instantes/posições: nenhuma coordenada inválida.
// getSprite sem manifesto devolve null e o renderer exercised os fallbacks;
// o QA de navegador separadamente confere as imagens carregadas.
for (const [wx, time] of [[2.5, 0], [16.5, 9000], [30.5, 19000]]) {
  state.player.x = wx; state.player.y = 5.5;
  snapCameraTo(wx, 5.5, vmap);
  calls.length = 0;
  renderViadutoVetores(makeCtx(), vmap, state, camera.x, camera.y, 1280, 720, 1, 1, time, { drawPlayer() {} });
  assert(calls.length > 150, `cena desenha de verdade em x=${wx}`);
  assert(calls.some(([name]) => name === 'fillText'), 'HUD/letreiros desenham');
}
assert.equal(badNumbers.length, 0, `renderer sem NaN/Infinity: ${badNumbers.slice(0, 5).join(', ')}`);

console.log('Núcleo 0.11.6: arte limpa, SE, colisão, Q enfileirado, feedback e viaduto vivo OK.');
