import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMission, canStand} from '../js/dimension/mare-mission-model.js';
import {enemyArt} from '../js/dimension/mare-mission-life.js';
import {
  lote6Props, nuloPoints, nuloStageIndex, nuloEntity, nuloArt, useNulo,
  useLote6, lote6Readout, fendaOpen, objectiveLine,
} from '../js/dimension/mare-mission-lote6.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, 'assets/sprites/mare-missao-lote6');
const art = path.join(root, 'assets/source-art/mare-missao-lote6');
const sheets = ['nulo-operador','nulo-operador-voz','cacador-mare','cacador-dano','parede-azulejo','parede-ferrugem','chao-grade','turbina-sala','escada-servico','transicao-fenda'];
const textures = new Set(['parede-azulejo','parede-ferrugem','chao-grade']);
const source = fs.readFileSync(path.join(root, 'js/dimension/mare-mission.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/dimension.css'), 'utf8');

for (const name of sheets) {
  const sprite = path.join(dir, `${name}.png`), original = path.join(art, `${name}.png`);
  assert.ok(fs.existsSync(sprite), `sprite ausente: ${name}`);
  assert.ok(fs.existsSync(original), `arte original ausente: ${name}`);
  assert.equal(fs.readFileSync(sprite).toString('ascii', 1, 4), 'PNG');
  assert.equal(fs.readFileSync(sprite)[25], 6, `${name} sprite is RGBA`);
  assert.ok(source.includes(`"${name}"`), `missão não referencia ${name}`);
}
assert.ok(fs.statSync(path.join(dir, 'chao-grade.png')).size > 1000);

// Walls and floor use the ten-sheet material, not the old flat fill.
assert.match(source, /parede-azulejo/);
assert.match(source, /parede-ferrugem/);
assert.match(source, /chao-grade/);
assert.match(source, /floorCtx\.putImageData/);
assert.match(source, /transicao-fenda/);
assert.match(css, /\.mare-mission\.fenda-aberta/);

// Three structures have collision and a walkable interaction approach.
assert.equal(lote6Props.length, 3);
for (const prop of lote6Props) {
  const approaches = [[0.9,0],[-0.9,0],[0,0.9],[0,-0.9]].filter(([dx,dy]) => canStand(prop.x+dx, prop.y+dy));
  assert.ok(approaches.length, `sem aproximação para ${prop.id}`);
  assert.ok(prop.r > 0 && prop.scale > 0.5);
}

// Nulo follows rank/data, keeps four authored stages, and never blocks a path.
assert.equal(nuloPoints.length, 4);
const m = createMission({});
assert.equal(nuloStageIndex(m), 0);
assert.equal(nuloEntity(m, 0).art, 'nulo-operador');
assert.equal(nuloArt(m, 1), 'nulo-operador');
assert.equal(nuloArt(m, 11.5), 'nulo-operador-voz');
for (const point of nuloPoints) {
  const approaches = [[0,0],[0.8,0],[-0.8,0],[0,0.8],[0,-0.8]].filter(([dx,dy]) => canStand(point.x+dx, point.y+dy));
  assert.ok(approaches.length, `Nulo sem aproximação em ${point.id}`);
}
m.p.data = ['fita']; assert.equal(nuloStageIndex(m), 1);
m.p.rank = 2; assert.equal(nuloStageIndex(m), 2);
m.p.rank = 4; assert.equal(nuloStageIndex(m), 3);
assert.equal(nuloEntity(m, 0).stage, 'ultimo');

// Encounters are local, one-shot for stress and persistent across a reload.
const encounter = createMission({});
encounter.x = nuloPoints[0].x; encounter.y = nuloPoints[0].y; encounter.stress = 40;
assert.match(useNulo(encounter, nuloEntity(encounter, 0)), /NULO:/);
assert.equal(encounter.stress, 32);
assert.deepEqual(encounter.p.nulo, ['primeiro']);
assert.match(useNulo(encounter, nuloEntity(encounter, 0)), /NULO:/);
assert.equal(encounter.stress, 32, 'repeat reading does not farm stress');
assert.match(useNulo(encounter, {kind: 'nulo', stage: 'segundo', x: 99, y: 99}), /fora do alcance/);
const resumed = createMission({mareMission: {nulo: ['primeiro', 'segundo', 'lixo', 9]}});
assert.deepEqual(resumed.p.nulo, ['primeiro', 'segundo']);

// Turbine/pressure and rift only open at rank 4; escada is a safe local read.
const site = createMission({});
site.x = lote6Props[0].x; site.y = lote6Props[0].y - 0.8; site.stress = 22;
assert.match(useLote6(site, lote6Props[0]), /TURBINA/);
assert.equal(site.stress, 12);
assert.match(useLote6(site, lote6Props[0]), /já gira/);
assert.equal(site.stress, 12);
site.x = lote6Props[2].x; site.y = lote6Props[2].y - 0.8;
assert.match(useLote6(site, lote6Props[2]), /selada/);
site.p.rank = 4;
assert.match(useLote6(site, lote6Props[2]), /FENDA DE RECOMPILAÇÃO/);
assert.equal(site.p.lote6.fenda, true);
assert.match(useLote6(site, lote6Props[2]), /já está aberta/);
assert.match(lote6Readout(site), /NULO 0\/4.*FENDA ABERTA/);
assert.equal(fendaOpen(site), true);
assert.match(objectiveLine(createMission({})), /MEMÓRIAS 0\/3/);
const objective = createMission({});
objective.p.data = ['fita','sal','eco'];
assert.match(objectiveLine(objective), /recompile no terminal/);
objective.p.rank = 4;
assert.match(objectiveLine(objective), /ÂNCORA A SUDESTE/);
assert.match(source, /objectiveLine\(m\)/);
assert.match(source, /A FENDA DE RECOMPILAÇÃO ABRIU A SUDESTE/);

// Hunter and guardian keep distinct silhouettes; both still use two enemies.
assert.equal(enemyArt({hunter: true, phase: 'hunt'}), 'cacador-mare');
assert.equal(enemyArt({hunter: true, phase: 'hurt'}), 'cacador-dano');
assert.equal(enemyArt({guardian: true, phase: 'hunt'}), 'guardiao-mare');
assert.match(source, /hunter: true/);
assert.match(source, /scale: e\.hunter \? 0\.58/);

// Stage/audio/transition hooks remain wired to the main mission.
assert.match(source, /nuloEntity\(m, t\)/);
assert.match(source, /shell\.classList\.toggle\("fenda-aberta"/);
assert.match(source, /lote6Readout\(m\)/);
assert.match(source, /if\(near\?\.kind===\"nulo\"\)/);
assert.match(source, /ctx\.drawImage\(images\["transicao-fenda"\]/);
console.log('Maré lote 6: 10 folhas, Nulo em quatro estágios, caçador, paredes/piso texturizados, estruturas e fenda OK');
