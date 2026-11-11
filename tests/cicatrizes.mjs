// =====================================================================
// TESTE — CICATRIZES DO CHÃO (fenda permanente da Quebra Sistemas)
//
// O relato original: "a Ultimate desenha a fenda mas não altera o layout".
// A fenda agora FICA: vira dado do progresso (entra no save porque o save
// clona `progress` inteiro), é desenhada como decalque de chão e reforça em
// vez de duplicar quando a marreta cai duas vezes no mesmo lugar.
// =====================================================================
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addTectonicFissure, getFissures, clearFissures, MAX_FISSURAS } from '../js/game/scars.js';

const progress = { flags: {} };

// 1) Uma fenda nasce do golpe e guarda o essencial para o desenho.
const primeira = addTectonicFissure({ progress, mapId: 'hub_saguao', x: 12, y: 7, facing: 'down', radius: 5.6 });
assert(primeira, 'a fenda é registrada');
assert.equal(primeira.mapId, 'hub_saguao');
assert(primeira.len >= 2.6 && primeira.len <= 5.2, 'comprimento dentro do razoável');
assert(Number.isInteger(primeira.seed), 'semente estável para o desenho');
assert.deepEqual([primeira.dx, primeira.dy], [1, 1], 'direção ISO do "down"');

// 2) Só aparece no mapa onde foi aberta.
assert.equal(getFissures(progress, 'hub_saguao').length, 1);
assert.equal(getFissures(progress, 'praia').length, 0);
assert.equal(getFissures(progress).length, 1, 'sem mapa, lista tudo');

// 3) Mesmo ponto = reforço, não duplicata. (O reforço mexe no MESMO objeto,
// então o comprimento anterior precisa ser lido antes do segundo golpe.)
const comprimentoAntes = primeira.len;
const reforco = addTectonicFissure({ progress, mapId: 'hub_saguao', x: 12.1, y: 7.05, facing: 'down', radius: 5.6 });
assert.equal(getFissures(progress).length, 1, 'não duplica a mesma cova');
assert(reforco.len > comprimentoAntes, 'a segunda marretada alarga a fenda');

// 4) Outro ponto = outra fenda, e o teto do save manda: as antigas cedem.
addTectonicFissure({ progress, mapId: 'hub_saguao', x: 20, y: 4, facing: 'left', radius: 5.6 });
assert.equal(getFissures(progress).length, 2);
for (let i = 0; i < MAX_FISSURAS + 5; i++) {
  addTectonicFissure({ progress, mapId: 'hub_saguao', x: i * 3 + .5, y: i * 2, facing: 'up', radius: 5.6 });
}
assert.equal(getFissures(progress).length, MAX_FISSURAS, `teto de ${MAX_FISSURAS} fendas por save`);
// As mais novas ficam, as antigas saem (ordem de chegada).
const ultima = getFissures(progress).at(-1);
assert.equal(ultima.facing, 'up', 'a última fenda aberta continua lá');

// 5) Limpeza por mapa (depuração/testes) e por save inteiro.
assert(clearFissures(progress, 'hub_saguao') > 0);
assert.equal(getFissures(progress).length, 0);
addTectonicFissure({ progress, mapId: 'praia', x: 1, y: 1 });
assert.equal(clearFissures(progress), 1);

// 6) A fenda entra no save: `buildCurrentSave` clona o progresso inteiro.
const save = readFileSync(new URL('../js/game/save.js', import.meta.url), 'utf8');
assert.match(save, /progress: clone\(state\.progress\)/, 'o save leva o progresso (e as cicatrizes)');

// 7) A Ultimate tectônica é quem abre a fenda, e o renderer a desenha no chão.
const ultimate = readFileSync(new URL('../js/game/ultimate.js', import.meta.url), 'utf8');
assert.match(ultimate, /definition\.blast === 'tectonica'/, 'só a Ultimate marcada racha o chão');
assert.match(ultimate, /addTectonicFissure\(/);
const renderer = readFileSync(new URL('../js/engine/renderer.js', import.meta.url), 'utf8');
assert.match(renderer, /function drawWorldScars/, 'existe desenho de cicatriz');
const posScars = renderer.indexOf('drawWorldScars(state)');
const posWorld = renderer.indexOf('drawWorld(map, state)');
assert(posScars > 0 && posScars < posWorld, 'a fenda é chão: desenhada antes do mundo');
// Mesma projeção e mesma câmera do mundo: nada de fenda flutuando.
assert.match(renderer, /\(f\.x - f\.y\) \* HW/, 'projeção isométrica do mundo');
// Nada de segunda transformação dentro do desenho: o laço principal já
// aplicou zoom, câmera e tremor. Uma camada extra fazia a fenda flutuar.
const blocoScars = renderer.slice(renderer.indexOf('function drawWorldScars'), renderer.indexOf('function drawWorld('));
assert.doesNotMatch(blocoScars, /ctx\.scale\(camera\.zoom/, 'não reaplica o zoom');
assert.doesNotMatch(blocoScars, /ctx\.translate\(view\.w/, 'não reaplica a origem da tela');

console.log('Cicatrizes do chão: fenda permanente, reforço no mesmo ponto, teto e save OK.');
