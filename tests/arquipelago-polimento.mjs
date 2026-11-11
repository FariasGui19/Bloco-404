import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map as bio } from '../js/data/worlds/arquipelago-rotas-perdidas/estacao-bio.js';
import { map as praia } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { map as sala } from '../js/data/worlds/arquipelago-rotas-perdidas/bio-sala-controle.js';
import { loadMap } from '../js/game/map-manager.js';
import { state } from '../js/game/state.js';
import { canStandAt } from '../js/game/collision.js';

// Fundação e hitbox compartilham coordenadas e toda sua área tem terra por baixo.
// Usa o objeto já carregado (x/y no centro do tile), que é o que a colisão lê.
state.save.loaded = false; state.progress = { flags: {}, inventory: [], archetype: 'motor_bio_forja' };
await loadMap(bio.id, 'inicio');
const terminal = state.objects.find(o => o.id === 'bio_terminal_principal');
const h = terminal.hitbox, ox = terminal.x, oy = terminal.y;
for (let y = Math.floor(oy + h.offsetY); y <= Math.floor(oy + h.offsetY + h.height); y++)
  for (let x = Math.floor(ox + h.offsetX); x <= Math.floor(ox + h.offsetX + h.width); x++)
    assert.equal(bio.walkMask[y]?.[x], '.', `fundação em ${x},${y} sem terra`);
assert(ox + h.offsetX >= 2 && oy + h.offsetY >= 2, 'recuo mínimo da costa');
const fundacao = state.objects.find(o => o.id === 'bio_fundacao_bio_terminal_principal');
assert.deepEqual([fundacao.x, fundacao.y], [terminal.x, terminal.y], 'placa acompanha a máquina');
const entrance = bio.portals.find(o => o.id === 'entrar_controle_bio');
const station = bio.portals.find(o => o.id === 'estacao_voltar');
for (const [portal, marker] of [[entrance, 'acesso_controle_bio'], [station, 'estacao_cabo_chegada']]) {
  const obj = bio.objects.find(o => o.id === marker);
  assert.deepEqual([portal.x, portal.y], [obj.x, obj.y]);
}
assert.deepEqual(entradaSpawn(bio.spawnPoints.vindo_controle), [entrance.x, entrance.y]);
function entradaSpawn(p) { return [Math.floor(p.x), Math.floor(p.y)]; }
for (const id of ['inicio', 'vindo_controle']) {
  await loadMap(bio.id, id);
  assert(canStandAt(bio, state.player.x, state.player.y, .28, state.player), `spawn ${id} livre`);
}
// O novo pavimento da estação de trem é visual; faixa de ferro continua bloqueada.
assert.equal(praia.aguaPraia[2][8], 'R');
assert.notEqual(praia.walkMask[2][8], '.');
assert.equal(praia.walkMask[4][8], '.');
assert(praia.objects.some(o => o.id === 'praia_placa_estacao' && !o.bloqueia));
assert(sala.objects.some(o => o.id === 'controle_saida_marco' && !o.bloqueia));
assert(sala.objects.length > 8);
for (const name of ['piso-pixel-09.png', 'jardim-pixel-09.png'])
  assert(existsSync(new URL(`../assets/source-art/estacao-bio/${name}`, import.meta.url)));
const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
assert(main.includes('piso-pixel-09.png') && main.includes('jardim-pixel-09.png'));
console.log('Arquipélago: fundação em terra, acessos, plataforma e pisos OK.');
