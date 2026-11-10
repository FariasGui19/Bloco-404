import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { getVelozAnimation } from '../js/data/veloz-animation.js';

// As folhas verticais são geradas por tools/preparar-veloz-caminhada.py:
// 4 quadros em uma linha, 256 px por célula, RGBA com alpha real.
const SHEETS = {
  veloz_andar_frente: 'assets/sprites/player/player-10x-veloz-andar-frente.png',
  veloz_andar_costas: 'assets/sprites/player/player-10x-veloz-andar-costas.png',
};

function readPngHeader(path) {
  const buffer = readFileSync(path);
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${path} deve ser PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
    bytes: buffer.length,
  };
}

for (const [id, path] of Object.entries(SHEETS)) {
  assert(existsSync(path), `${id} precisa existir em ${path}`);
  const png = readPngHeader(path);
  assert.equal(png.width, 1024, '4 quadros de 256 px');
  assert.equal(png.height, 256, 'uma única linha de quadros');
  assert.equal(png.colorType, 6, 'RGBA com transparência real (sem fundo magenta)');
  assert(png.bytes > 20000, 'arte não pode ser um placeholder vazio');
}

// O jogo só pede essas folhas andando para cima/baixo; o resto continua igual.
const progress = { archetype: 'nucleo_dez_forma' };
const player = { nucleoForm: 'forma_veloz', moving: true, ability: {} };
for (const [facing, sprite] of [['down', 'veloz_andar_frente'], ['up', 'veloz_andar_costas']]) {
  player.facing = facing;
  const frame = getVelozAnimation(progress, player, 0);
  assert.equal(frame.sprite, sprite);
  assert(Object.hasOwn(SHEETS, sprite), `${sprite} precisa estar registrado no carregamento`);
  assert.equal(frame.cols, 4);
  assert.equal(frame.rows, 1);
  assert(frame.footY > 150 && frame.footY < 256, 'apoio dos pés dentro da célula');
}

const lateral = getVelozAnimation({ ...progress }, { ...player, facing: 'right' }, 0);
assert.equal(lateral.cols, 6);
assert.equal(lateral.rows, 4);
assert(!Object.hasOwn(SHEETS, lateral.sprite), 'corrida lateral continua na folha original');

console.log('Forma veloz: folhas de caminhada vertical em PNG RGBA 4×1 e ligação com o renderer OK.');
