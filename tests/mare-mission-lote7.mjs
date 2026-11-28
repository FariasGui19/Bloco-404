import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cell, createMission, canStand} from '../js/dimension/mare-mission-model.js';
import {enemyArt} from '../js/dimension/mare-mission-life.js';
import {lote7Props, lote7Walls, useLote7, lampOn, lote7Readout} from '../js/dimension/mare-mission-lote7.js';
import {fenda} from '../js/data/worlds/arquipelago-rotas-perdidas/mare-cromatica.js';
import {INTERATIVOS_EXTERIORES_DOCAS as pieces} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-exterior-lote8.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, 'assets/sprites/mare-missao-lote7');
const art = path.join(root, 'assets/source-art/mare-missao-lote7');
const sheets = ['parede-concreto-umido','parede-azulejo-quebrado','chao-concreto-umido','chao-agua-rasa','teto-metal-escuro','portal-mare','porta-pesada','lampada-industrial','afogado-mare','afogado-dano'];
const textures = new Set(['parede-concreto-umido','parede-azulejo-quebrado','chao-concreto-umido','chao-agua-rasa','teto-metal-escuro']);
const source = fs.readFileSync(path.join(root, 'js/dimension/mare-mission.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');

for (const name of sheets) {
  const sprite = path.join(dir, `${name}.png`), original = path.join(art, `${name}.png`);
  assert.ok(fs.existsSync(sprite), `sprite ausente: ${name}`);
  assert.ok(fs.existsSync(original), `arte original ausente: ${name}`);
  assert.equal(fs.readFileSync(sprite).toString('ascii', 1, 4), 'PNG');
  assert.equal(fs.readFileSync(sprite)[25], 6, `${name} sprite is RGBA`);
  assert.ok(source.includes(name) || main.includes(`/${name}.png`), `missão/docas não referencia ${name}`);
  if (textures.has(name)) assert.deepEqual([...fs.readFileSync(sprite).subarray(16, 24)], [0, 0, 0, 64, 0, 0, 0, 64], `${name} is 64x64`);
}

// Material pass: wet concrete floor, puddle mask, broken tile/concrete walls,
// metal ceiling, VHS finish and the tactical map all live in the renderer.
assert.match(source, /chao-concreto-umido/);
assert.match(source, /chao-agua-rasa/);
assert.match(source, /teto-metal-escuro/);
assert.match(source, /parede-azulejo-quebrado/);
assert.match(source, /parede-concreto-umido/);
assert.match(source, /ancora-cromatica/);
assert.match(source, /drawServiceMap\(ctx, m\)/);
assert.match(source, /requestPointerLock/);
assert.match(source, /noiseBurst/);
assert.match(source, /CAM 02/);

// Só as rochas periféricas permanecem; as portas e o pátio ficam abertos.
assert.ok(lote7Walls.every(([x,y]) => x < 4 || y < 8));
assert.equal(cell(2.5, 27.5), 2);
assert.equal(cell(9.5, 27.5), 0, 'west cabin door approach stays open');
assert.equal(cell(15.5, 27.5), 0, 'central spawn gap stays open');
assert.equal(cell(23.5, 27.5), 0, 'east cabin door approach stays open');
for (const [id, x, y] of [['spawn',16,28],['terminal',16,16],['ancora',24.5,24.5],['eco',9.5,23.5]]) assert.ok(canStand(x,y), `${id} still walkable`);

// One service lamp, safe local toggle, persistent boolean.
assert.equal(lote7Props.length, 1);
const lamp = lote7Props[0];
assert.ok([[0.8,0],[-0.8,0],[0,0.8],[0,-0.8]].some(([dx,dy]) => canStand(lamp.x+dx, lamp.y+dy)));
const m = createMission({});
m.x = lamp.x; m.y = lamp.y - 0.8;
assert.equal(lampOn(m), false);
assert.match(useLote7(m, lamp), /LÂMPADA DE SERVIÇO/);
assert.equal(m.p.lote7.lampada, true);
assert.match(useLote7(m, lamp), /LÂMPADA APAGADA/);
assert.match(lote7Readout(m), /LUZ OFF/);
assert.deepEqual(createMission({mareMission: {lote7: {lampada: true, lixo: true}}}).p.lote7, {lampada: true});

// The drowned man carries the hunter silhouette and its hurt frame.
assert.equal(enemyArt({hunter: true, phase: 'hunt'}), 'afogado-mare');
assert.equal(enemyArt({hunter: true, phase: 'hurt'}), 'afogado-dano');
assert.match(source, /afogado-mare/);

// The echo portal grew up on the pier and the fenda room is no longer empty.
assert.ok(pieces.docas_portal_fenda_visual.width >= 150);
assert.match(main, /cromatica_porta_fenda', src: 'assets\/sprites\/mare-missao-lote7\/portal-mare.png/);
const limiar = fenda.objects.find((o) => o.id === 'cromatica_limiar_final');
assert.equal(limiar.useCrop, false, 'portal uses the full painted gate');
assert.ok(limiar.scale >= 0.7 && limiar.scale <= 1, 'portal fills the chamber without swallowing it');
assert.ok(fenda.objects.some((o) => o.id === 'fenda_lampada_esq'));
assert.ok(fenda.objects.some((o) => o.id === 'fenda_console'));
assert.ok(fenda.layout.flat().filter(Boolean).length > 30, 'chamber has interior mass');

console.log('Maré lote 7: 10 folhas, concreto/água/teto, portal grande, câmara da fenda, afogado, mapa e VHS OK');
