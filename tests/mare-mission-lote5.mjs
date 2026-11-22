import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMission, canStand} from '../js/dimension/mare-mission-model.js';
import {enemyArt} from '../js/dimension/mare-mission-life.js';
import {lote5Props, useLote5, lote5Complete, lote5Readout} from '../js/dimension/mare-mission-lote5.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, 'assets/sprites/mare-missao-lote5');
const art = path.join(root, 'assets/source-art/mare-missao-lote5');
const sheets = ['caldeira-sala','tubo-vapor','cristal-mare','valvula-pressao','painel-recompilacao','selo-recompilado','guardiao-mare','guardiao-dano','porta-recompilacao','piso-metal'];
const missionSource = fs.readFileSync(path.join(root, 'js/dimension/mare-mission.js'), 'utf8');

// Every lote 5 name is published, original and actually loaded by the mission.
for (const name of sheets) {
  assert.ok(fs.existsSync(path.join(dir, `${name}.png`)), `sprite ausente: ${name}`);
  assert.ok(fs.existsSync(path.join(art, `${name}.png`)), `arte original ausente: ${name}`);
  assert.ok(missionSource.includes(`"${name}"`), `missão não referencia ${name}`);
}
assert.ok(fs.statSync(path.join(dir, 'piso-metal.png')).size > 1000);

// The model exposes collision radii for the whole machine room, and each prop
// still has a walkable approach within interaction range.
assert.equal(lote5Props.length, 7);
for (const prop of lote5Props) {
  const approaches = [[0.8,0],[-0.8,0],[0,0.8],[0,-0.8]].filter(([dx,dy]) => canStand(prop.x+dx, prop.y+dy));
  assert.ok(approaches.length, `sem aproximação para ${prop.id}`);
  assert.ok(prop.r > 0 && prop.r < 0.7, `raio inválido em ${prop.id}`);
}

// Interactions are local, one-shot, and the seal needs both machine readings.
const m = createMission({});
assert.equal(lote5Complete(m), false);
assert.match(lote5Readout(m), /VÁLVULA PENDENTE.*PAINEL PENDENTE.*SELO ABERTO/);
assert.match(useLote5(m, lote5Props[3]), /Aproxime-se/);
m.x = 25.0; m.y = 14.0;
assert.match(useLote5(m, lote5Props[3]), /VÁLVULA DE PRESSÃO FECHADA/);
assert.equal(m.p.lote5.valvula, true);
assert.match(useLote5(m, lote5Props[3]), /já está firme/);
m.x = 14.0; m.y = 27.0;
assert.match(useLote5(m, lote5Props[4]), /pressão estável/);
assert.equal(m.p.lote5.painel, true);
m.x = 28.5; m.y = 28.5;
assert.match(useLote5(m, lote5Props[6]), /SELO RECOMPILADO/);
assert.equal(lote5Complete(m), true);
assert.match(useLote5(m, lote5Props[6]), /três tempos/);
assert.match(lote5Readout(m), /SELO RECOMPILADO/);

// Optional local layer never charges data/rank and remains readable by the HUD.
const rank = m.p.rank, data = m.p.data;
assert.equal(m.p.rank, rank);
assert.equal(m.p.data, data);
assert.ok(m.stress >= 0);

// Reopening a mission keeps only the accepted booleans.
const resumed = createMission({mareMission: {lote5: {valvula: true, painel: 1, selo: true, lixo: true}}});
assert.deepEqual(resumed.p.lote5, {valvula: true, selo: true});

// The guardian uses its own silhouette and hurt sheet.
assert.equal(enemyArt({guardian: true, phase: 'hunt'}), 'guardiao-mare');
assert.equal(enemyArt({guardian: true, phase: 'hurt'}), 'guardiao-dano');
assert.equal(enemyArt({guardian: true, phase: 'dissolve'}), 'guardiao-dano');
assert.match(missionSource, /guardian: true/);
assert.match(missionSource, /scale: e\.hunter \? 0\.58 : e\.guardian \? 1\.12 : 1/);

// Transition, ambience and audio hooks are wired without gating progression.
const css = fs.readFileSync(path.join(root, 'css/dimension.css'), 'utf8');
assert.match(css, /\.mare-mission\.recompilado::after/);
assert.match(missionSource, /shell\.classList\.toggle\("recompilado"/);
assert.match(missionSource, /if\(lote5Complete\(m\)&&beat%4===0\)tone\(/);
assert.match(missionSource, /lote5-valve"\)\{tone\(52/);
assert.match(missionSource, /lote5-seal"\)\{tone\(440/);
assert.match(missionSource, /images\["piso-metal"\]/);

console.log('Maré lote 5: 10 folhas, sala de máquinas alcançável, válvula/painel/selo, guardião, transição e áudio OK');
