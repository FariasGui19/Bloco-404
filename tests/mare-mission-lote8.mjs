import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMission, canStand, sceneryProps, scannerTarget} from '../js/dimension/mare-mission-model.js';
import {
  lote8Names, lote8Decor, lote8Props, isInteractiveLote8,
  useLote8, lote8Readout, conchaRegistrada,
} from '../js/dimension/mare-mission-lote8.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const spriteDir = path.join(root, 'assets/sprites/mare-missao-lote8');
const sourceDir = path.join(root, 'assets/source-art/mare-missao-lote8');
const mission = read('js/dimension/mare-mission.js');
const prep = read('tools/preparar-mare-lote8.py');

// 1. Dez sprites próprios, RGBA, PSX-size, com fonte autoral.
assert.equal(lote8Names.length, 10, 'lote 8 entrega dez artes');
for (const name of lote8Names) {
  const file = path.join(spriteDir, `${name}.png`);
  assert.ok(fs.existsSync(file), `sprite ausente: ${name}`);
  assert.ok(fs.existsSync(path.join(sourceDir, `${name}.png`)), `fonte ausente: ${name}`);
  const png = fs.readFileSync(file);
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png[25], 6, `${name} é RGBA`);
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.ok(width <= 192 && height <= 192, `${name} cabe no sprite PSX`);
  assert.ok(width >= 40 && height >= 40, `${name} tem silhueta legível`);
  assert.ok(png.length > 600, `${name} tem detalhe suficiente`);
}
assert.match(prep, /NEAREST/);
assert.match(prep, /MinFilter\(5\)/);
assert.match(prep, /MAGENTA|magenta/);

// 2. Nada reutilizado do lote 7 e distribuição real pela orla.
const lote7 = read('js/dimension/mare-mission-lote7.js');
for (const name of lote8Names) assert.ok(!lote7.includes(`'${name}'`), `${name} não vem do lote 7`);
assert.ok(lote8Decor.length >= 10);
for (const d of lote8Decor) {
  assert.ok(d.x >= 0 && d.x <= 30 && d.y >= 0 && d.y <= 30, `${d.art} dentro do setor`);
  assert.ok(lote8Names.includes(d.art), `${d.art} tem arte declarada`);
}
const arts = new Set(lote8Decor.map((d) => d.art));
assert.ok(arts.size >= 8, 'a orla usa quase todas as artes novas');

// 3. Concha interativa: persiste, dá leitura e não trava a passagem.
assert.equal(lote8Props.length, 1);
const concha = lote8Props[0];
assert.ok(isInteractiveLote8(concha));
assert.ok(!isInteractiveLote8(lote8Decor[0]));
assert.ok(canStand(concha.x + 0.9, concha.y), 'concha não fecha o caminho');
assert.ok([[0.8,0],[-0.8,0],[0,0.8],[0,-0.8]].some(([dx,dy]) => canStand(concha.x+dx, concha.y+dy)));
const m = createMission({});
assert.equal(conchaRegistrada(m), false);
assert.match(lote8Readout(m), /0\/1/);
m.x = concha.x; m.y = concha.y - 1;
assert.match(useLote8(m, concha), /CONCHA CROMÁTICA/);
assert.equal(m.p.lote8.concha, true);
assert.match(useLote8(m, concha), /já está registrada/);
assert.match(lote8Readout(m), /1\/1/);
assert.deepEqual(createMission({mareMission: {lote8: {concha: true, lixo: true}}}).p.lote8, {concha: true});

// 4. Integração atual: os adereços selecionados são os mesmos em WebGL e
// fallback, sem colisões invisíveis nem prompts de coleta no antigo ponto.
const selected = sceneryProps.filter(p => lote8Names.includes(p.art));
assert.ok(selected.length > 0 && selected.length < lote8Decor.length);
for (const p of selected) assert.ok(mission.includes(p.art));
assert.equal(scannerTarget(m),null);
assert.ok(canStand(concha.x,concha.y));
assert.deepEqual(m.p.data,[]);
console.log('Maré lote 8: acervo preservado, flags legadas e decoração sem alvos falsos OK');
