// node --experimental-default-type=module tests/mergulho-ponte.mjs
import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { moveWithCollision } from '../js/game/collision.js';
import { criarEstadoNado, atualizarNado, aguaSobPonte, podeNadar, profundidadeEm, profundidadeSubmersaEm, moverNaAgua, dispararPropulsao } from '../js/game/nado.js';
import { criarArvore } from '../js/game/nado-arvore.js';
import { createCoastField } from '../js/engine/coast-field.js';
import { nadadorNoFundo } from '../js/engine/renderer.js';
import { camera, updateCamera } from '../js/engine/camera.js';
import { tryArchetypePower } from '../js/game/archetype-powers.js';

// Deck ocupa apenas água neste mapa sintético. Ilhas e limites continuam sólidos.
const rows = ['SSSSSSSSS','SDDDBDDDS','SDDDBDDDS','SDDDBDDDS','SDDDBDDDS','SDDDBDDDS','SDDDBDDDS','SDDDBDDDS','SSSSSSSSS'];
const map = { id: 'teste_fundo', aguaPraia: rows, aguaSobPontes: true, walkMask: rows.map(r => r.replace(/[BD]/g, '.')), layout: rows.map(r => [...r].map(() => 0)) };
const field = createCoastField(rows, 8);
assert.equal(podeNadar(map, 4.5, 4.5), false, 'ponte é superfície');
assert.equal(aguaSobPonte(map, 4.5, 4.5), true);
assert.equal(aguaSobPonte({...map, aguaSobPontes: false}, 4.5, 4.5), false);
assert.ok(profundidadeEm(map, 3.8, 4.5, field) < 1.25, 'campo superficial vê o deque');
assert.ok(profundidadeSubmersaEm(map, 3.8, 4.5, field) > 1.25, 'batimetria ignora o deque');
const agua = (m, x, y) => podeNadar(m, x, y) || aguaSobPonte(m, x, y);
const n = criarEstadoNado(); Object.assign(n, { ativo: true, profundidade: 1.8, submerso: true, mareAstral: true, nivel: 3 });
const p = { x: 3.5, y: 4.5, nado: n };
state.objects = [{ id: 'trava', x: 4.5, y: 4.5, bloqueia: true, gate: {}, hitbox: { offsetX: -.2, offsetY: -.5, width: .4, height: 1 } }];
state.actors = [];
assert.equal(moveWithCollision(map, p, 2, 0, .2, agua, { submerso: true }), true);
assert.ok(p.x > 5.4, 'atravessa água abaixo da ponte e trava');
const p2 = { x: 3.5, y: 4.5 };
state.objects[0].submersoSolido = true;
moveWithCollision(map, p2, 2, 0, .2, agua, { submerso: true });
assert.ok(p2.x < 4.3, 'pilar marcado continua sólido');
state.objects = [];
map.pilaresSubmersos = [{x: 4.5, y: 4.5, raio: .16}];
const estaca = { x: 3.5, y: 4.5 };
moveWithCollision(map, estaca, 2, 0, .2, agua, { submerso: true });
assert.ok(estaca.x < 4.34, 'estaca física do fundo interrompe o nado');
map.pilaresSubmersos = [];
const borda = { x: 1.5, y: 4.5 };
moveWithCollision(map, borda, -2, 0, .2, agua, { submerso: true });
assert.ok(borda.x >= 1.2 - 1e-8, 'não atravessa a ilha nem borda do mapa');
// O corpo permanece ativo sob a ponte; subir volta ao deck sem softlock.
for (let i = 0; i < 20; i++) atualizarNado(n, { map, x: 4.5, y: 4.5, field, arvore: criarArvore(3), dt: .016, mareAstral: true, mergulhoLivre: true, mergulhar: true });
assert.ok(n.ativo && n.profundidade > 1.25 && nadadorNoFundo({nado:n}, map));
for (let i = 0; i < 100; i++) atualizarNado(n, { map, x: 4.5, y: 4.5, field, arvore: criarArvore(3), dt: .016, mareAstral: true, mergulhoLivre: true, mergulhar: false });
assert.equal(n.ativo, false, 'subir sob a ponte termina na superfície');
// Dash aplica impulso imediato e soltar a direção conserva parte do embalo.
Object.assign(n, {ativo:true, profundidade:1.8, submerso:true, mareAstral:true, nivel:3, dirX:1, dirY:0, vx:0,vy:0, recargaArrancada:0});
assert.ok(dispararPropulsao(n, true)); assert.ok(n.vx > 0);
moverNaAgua(n, .1, 0, 0, 4); assert.ok(n.vx > 0);
// Q submerso usa a propulsão em vez do dash terrestre de walkMask.
state.progress = { archetype:'mare_astral', abilities:['passo_corrente','senso_corrente'], flags:{}, inventory:[] };
state.world.currentMap = map; state.player = { x:2.5, y:4.5, facing:'right', nado:n, energy:100, ability:{cooldowns:{}} };
n.recargaArrancada = 0; n.arrancada = 0;
let msg = ''; assert.equal(tryArchetypePower('passo_corrente', m => msg = m), false);
assert.ok(n.arrancada > 0 && !state.player.ability.dash && msg.includes('SUBMERSA'));
const energy = state.player.energy; state.player.ability.cooldowns.passo_corrente = 0;
tryArchetypePower('passo_corrente', m => msg = m);
assert.equal(state.player.energy, energy, 'recarga da propulsão não consome energia');
state.player.fragmentosMare = [{id:'teste:1', x:3.5, y:4.5}];
tryArchetypePower('senso_corrente', m => msg = m);
assert.equal(state.player.ability.sonarAquatico.x, 3.5); assert.ok(msg.includes('FRAGMENTO'));
// Zoom volta à preferência sem alterá-la.
camera.targetZoom = 1; camera.zoom = 1; camera.follow = true;
updateCamera(1, 0, 0, n); assert.equal(camera.targetZoom, 1);
updateCamera(2, 0, 0); assert.ok(Math.abs(camera.zoom - 1) < .01);
console.log('Ponte submersa, batimetria, pilares, subida, Q/R e câmera conferidos.');
