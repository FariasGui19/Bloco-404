// Execute: node --experimental-default-type=module tests/nado-desenho.mjs
// =====================================================================
// TESTE: o nado APARECE
//
// A árvore de nado (tests/nado-arvore.mjs) garante a regra. Este contrato
// garante o que o jogador vê:
//   - o corpo deita: existe uma folha de nado por traje, e ela é usada;
//   - o corpo aponta para onde nada (ângulo isométrico) e espelha;
//   - mergulhar muda o desenho (corpo esmaecido, bolhas, sem esteira);
//   - o limite do degrau é um cordão de boias, só perto do operador;
//   - a poça de treino é marcada enquanto as duas primeiras provas não saem;
//   - "cabeça na água" e "corpo no fundo" são perguntas diferentes, e a
//     fauna avisa quando só falta o gesto de mergulhar;
//   - os objetos da praia são copiados de um cache já na escala da tela.
// =====================================================================
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), 'utf8');

// ---------------------------------------------------------------------
// Ambiente mínimo: Image falsa (carrega na hora) e um contexto que grava
// ---------------------------------------------------------------------
globalThis.Image = class {
  set src(valor) {
    this._src = valor;
    this.width = 680; this.height = 120;
    queueMicrotask(() => this.onload?.());
  }
  get src() { return this._src; }
};

function criarCtx() {
  const chamadas = [];
  const estado = { globalAlpha: 1 };
  const ctx = new Proxy({}, {
    get: (_, chave) => {
      if (chave === 'chamadas') return chamadas;
      if (chave in estado) return estado[chave];
      if (chave === 'measureText') return texto => ({ width: String(texto).length * 5 });
      if (chave === 'createRadialGradient' || chave === 'createLinearGradient') return () => ({ addColorStop() {} });
      return (...args) => { chamadas.push({ nome: chave, args, alfa: estado.globalAlpha }); };
    },
    set: (_, chave, valor) => { estado[chave] = valor; return true; },
  });
  return ctx;
}
const contar = (ctx, nome) => ctx.chamadas.filter(c => c.nome === nome).length;

const { loadSprites, getSprite } = await import('../js/engine/sprites.js');
const { spriteDeNado, desenharNadador, desenharBoias, desenharMarcadorDeTreino } = await import('../js/engine/nado-desenho.js');
const { cabecaSubmersa, noFundoDoMar, criarEstadoNado } = await import('../js/game/nado.js');

const HW = 32, HH = 16;
const TRAJES = ['civil', 'mare', 'bio', 'dominio', 'nucleo'];

// ---------------------------------------------------------------------
// 1. Uma folha de nado por traje: arquivo, tamanho, registro e mapeamento
// ---------------------------------------------------------------------
for (const traje of TRAJES) {
  const arquivo = path.join(raiz, `assets/sprites/player/nado-${traje}.png`);
  assert.ok(fs.existsSync(arquivo), `falta a folha de nado: nado-${traje}.png`);
  const png = fs.readFileSync(arquivo);
  assert.equal(png.readUInt32BE(16), 680, `nado-${traje}.png deveria ter 680 px de largura (2 quadros de 340)`);
  assert.equal(png.readUInt32BE(20), 120, `nado-${traje}.png deveria ter 120 px de altura`);
  assert.ok(png.length < 260 * 1024, `nado-${traje}.png pesado demais: ${(png.length / 1024).toFixed(0)} KB`);
}
const main = ler('js/main.js');
for (const traje of TRAJES) {
  assert.match(main, new RegExp(`id: 'nado_${traje}',\\s*src: 'assets/sprites/player/nado-${traje}\\.png'`),
    `main.js não registra a folha nado_${traje}`);
}

assert.equal(spriteDeNado({}, 'mare_astral'), 'nado_civil', 'sem traje: corpo civil');
assert.equal(spriteDeNado({ equippedSuit: 'mare' }, 'mare_astral'), 'nado_mare');
assert.equal(spriteDeNado({ equippedSuit: 'bio_forja' }, 'motor_bio_forja'), 'nado_bio');
assert.equal(spriteDeNado({ equippedSuit: 'dominio' }, 'lamina_dominio_anciao'), 'nado_dominio');
assert.equal(spriteDeNado({ nucleoForm: 'veloz' }, 'nucleo_dez_forma'), 'nado_nucleo', 'forma do Núcleo nada com o traje do Núcleo');
assert.equal(spriteDeNado({ nucleoForm: null }, 'nucleo_dez_forma'), 'nado_civil', 'Núcleo destransformado nada de civil');
assert.equal(spriteDeNado(null, null), 'nado_civil', 'sem jogador não pode quebrar');

// ---------------------------------------------------------------------
// 2. Sem a folha carregada o renderer cai no sprite de sempre
// ---------------------------------------------------------------------
const nadador = (extra = {}, nadoExtra = {}) => ({
  x: 18.5, y: 3.2,
  nado: { ...criarEstadoNado(), ativo: true, profundidade: .9, fundo: 2.4, submerso: false, vx: 0, vy: 0, dirX: 1, dirY: 0, ...nadoExtra },
  ...extra,
});
{
  const ctx = criarCtx();
  assert.equal(getSprite('nado_civil'), null);
  assert.equal(desenharNadador(ctx, nadador(), 0, 0, { arquetipo: 'mare_astral', HW, HH, t: 1 }), false,
    'sem a folha, desenharNadador deve devolver false (o renderer desenha o corpo de pé)');
  assert.equal(contar(ctx, 'drawImage'), 0);
}
await loadSprites(TRAJES.map(t => ({ id: `nado_${t}`, src: `assets/sprites/player/nado-${t}.png` })));
for (const t of TRAJES) assert.ok(getSprite(`nado_${t}`), `folha nado_${t} não carregou`);

// ---------------------------------------------------------------------
// 3. Na superfície: o corpo deita, aponta para o rumo e deixa esteira
// ---------------------------------------------------------------------
function desenhar(player, quadros = 1, t0 = 10, mover = null) {
  let ctx = null;
  for (let i = 0; i < quadros; i++) {
    ctx = criarCtx();
    if (mover) mover(player, i);
    assert.equal(desenharNadador(ctx, player, (player.x - player.y) * HW, (player.x + player.y) * HH,
      { arquetipo: 'mare_astral', HW, HH, t: t0 + i / 60 }), true);
  }
  return ctx;
}
const anguloDaTela = (dx, dy) => Math.atan2((dx + dy) * HH, (dx - dy) * HW);
{
  // Leste no mundo = descendo para a direita na tela.
  const p = nadador({}, { vx: 2.6, vy: 0, dirX: 1, dirY: 0 });
  const ctx = desenhar(p, 40, 10, (j, i) => { j.x += 2.6 / 60; });
  const giros = ctx.chamadas.filter(c => c.nome === 'rotate').map(c => c.args[0]);
  assert.ok(giros.length >= 1, 'o corpo não girou');
  const esperado = anguloDaTela(1, 0);
  assert.ok(giros.some(g => Math.abs(g - esperado) < .02), `ângulo do corpo ${giros.map(g => g.toFixed(2))} ≠ rumo na tela ${esperado.toFixed(2)}`);
  const imagens = ctx.chamadas.filter(c => c.nome === 'drawImage');
  assert.ok(imagens.length >= 16 && imagens.length <= 40, `corpo em fatias: ${imagens.length} drawImage (esperado 16–40)`);
  assert.ok(imagens.every(c => c.args[0] === getSprite('nado_civil')), 'o corpo deveria vir da folha de nado');
  // Linha d'água: a parte de baixo do corpo é translúcida.
  assert.ok(imagens.some(c => c.alfa === 1) && imagens.some(c => c.alfa < .7), 'faltou a linha d\'água (parte submersa translúcida)');
  assert.ok(!ctx.chamadas.some(c => c.nome === 'scale' && c.args[0] === 1 && c.args[1] === -1), 'nadando para a direita não espelha');
  assert.ok(p._esteira.length >= 3 && p._esteira.length <= 16, `esteira com ${p._esteira.length} pontos`);
  assert.ok(p._topo >= 40 && p._topo < 70, 'altura do corpo deitado (para barra de vida e textos) fora do esperado');
  // Do peito à ponta da mão o corpo não pode avançar demais sobre a areia.
  const xs = imagens.map(c => c.args[5]);
  const frente = Math.max(...imagens.map(c => c.args[5] + c.args[7]));
  assert.ok(frente > 30 && frente < 64, `a cabeça avança ${frente.toFixed(0)} px à frente da âncora (30–64)`);
  assert.ok(Math.min(...xs) < -60, 'os pés deveriam ficar para trás da âncora');
}
{
  // Oeste no mundo: o corpo vira para a esquerda da tela e ESPELHA (não fica de cabeça para baixo).
  const p = nadador({}, { vx: -2.6, vy: 0, dirX: -1, dirY: 0 });
  const ctx = desenhar(p, 40, 20, j => { j.x -= 2.6 / 60; });
  assert.ok(ctx.chamadas.some(c => c.nome === 'scale' && c.args[0] === 1 && c.args[1] === -1),
    'nadando para a esquerda da tela o corpo precisa espelhar na vertical');
  const giros = ctx.chamadas.filter(c => c.nome === 'rotate').map(c => c.args[0]);
  assert.ok(giros.some(g => Math.abs(Math.cos(g) - Math.cos(anguloDaTela(-1, 0))) < .03), 'ângulo para oeste errado');
}
{
  // Virada suave: de leste para sul o ângulo não salta num quadro só.
  const p = nadador({}, { vx: 2, vy: 0, dirX: 1, dirY: 0 });
  desenhar(p, 30, 30);
  const antes = p._nadoAng;
  p.nado.dirX = 0; p.nado.dirY = 1; p.nado.vx = 0; p.nado.vy = 2;
  desenhar(p, 1, 31);
  const salto = Math.abs(p._nadoAng - antes);
  assert.ok(salto > .01 && salto < Math.abs(anguloDaTela(0, 1) - antes) * .5, `a virada deveria ser suave (girou ${salto.toFixed(2)} rad num quadro)`);
  desenhar(p, 60, 32);
  assert.ok(Math.abs(p._nadoAng - anguloDaTela(0, 1)) < .02, 'a virada não chegou no rumo novo');
}

// ---------------------------------------------------------------------
// 4. Mergulho: corpo esmaecido, bolhas, sem esteira nova; arrancada risca
// ---------------------------------------------------------------------
{
  const p = nadador({ equippedSuit: 'mare' }, { vx: 2, vy: 0, submerso: true, profundidade: 2 });
  const ctx = desenhar(p, 30, 40, j => { j.x += 2 / 60; });
  const imagens = ctx.chamadas.filter(c => c.nome === 'drawImage');
  assert.ok(imagens.length >= 16, 'mergulhado o corpo continua desenhado');
  assert.ok(imagens.every(c => c.args[0] === getSprite('nado_mare')), 'traje Maré deveria usar a folha nado_mare');
  assert.ok(imagens.every(c => c.alfa < .75), 'mergulhado, o corpo inteiro fica esmaecido');
  assert.equal(p._esteira.length, 0, 'mergulhado não deixa esteira na superfície');
  assert.ok(contar(ctx, 'arc') >= 4, 'faltaram as bolhas de quem prende o ar');
}
{
  const parado = desenhar(nadador({}, { vx: 0, vy: 0 }), 5, 50);
  const correndo = desenhar(nadador({}, { vx: 3.4, vy: 0, arrancada: .3 }), 5, 50, j => { j.x += 3.4 / 60; });
  assert.ok(contar(correndo, 'lineTo') >= 5, 'a arrancada deveria riscar a água');
  assert.equal(contar(parado, 'lineTo'), 0, 'parado não há riscos de arrancada');
  assert.ok(contar(parado, 'ellipse') >= 3, 'boiando parado: sombra + anéis');
}

// ---------------------------------------------------------------------
// 5. Cordão de boias: só as próximas, dentro da tela
// ---------------------------------------------------------------------
{
  const boias = [
    { x: 10, y: 10, fase: 0 }, { x: 11, y: 10, fase: 1 },      // perto
    { x: 18, y: 10, fase: 2 },                                  // 8 tiles: esmaecendo
    { x: 40, y: 40, fase: 3 },                                  // longe demais
    { x: 10.5, y: 3, fase: 4 },                                 // fora da tela (range)
  ];
  const range = { x0: 4, x1: 30, y0: 6, y1: 30 };
  const ctx = criarCtx();
  desenharBoias(ctx, boias, { x: 10, y: 10 }, range, 0, HW, HH);
  const corpos = ctx.chamadas.filter(c => c.nome === 'fillRect');
  assert.equal(corpos.length, 3, `deveriam aparecer 3 boias (2 perto + 1 esmaecendo), apareceram ${corpos.length}`);
  assert.ok(Math.min(...corpos.map(c => c.alfa)) < .6, 'a boia distante deveria esmaecer');
  const vazio = criarCtx();
  desenharBoias(vazio, [], { x: 0, y: 0 }, range, 0, HW, HH);
  desenharBoias(vazio, boias, null, range, 0, HW, HH);
  assert.equal(vazio.chamadas.length, 0, 'sem boias ou sem jogador não desenha nada');
}

// ---------------------------------------------------------------------
// 6. Marcador da poça de treino
// ---------------------------------------------------------------------
{
  const poca = { x: 2.5, y: 8.72, rx: 1.42, ry: 1.2 };
  const ctx = criarCtx();
  desenharMarcadorDeTreino(ctx, poca, 3, HW, HH, 'POÇA DE TREINO · BOIAR', 1);
  const texto = ctx.chamadas.find(c => c.nome === 'fillText');
  assert.equal(texto?.args[0], 'POÇA DE TREINO · BOIAR');
  assert.ok(contar(ctx, 'ellipse') >= 2, 'faltaram os anéis da poça');
  const nada = criarCtx();
  desenharMarcadorDeTreino(nada, poca, 3, HW, HH, 'X', 0);
  desenharMarcadorDeTreino(nada, null, 3, HW, HH, 'X', 1);
  assert.equal(nada.chamadas.length, 0, 'com força 0 (operador dentro da poça) o marcador some');
}

// ---------------------------------------------------------------------
// 7. Ligação no renderer e no HUD
// ---------------------------------------------------------------------
const renderer = ler('js/engine/renderer.js');
assert.match(renderer, /import \{ desenharNadador, desenharBoias, desenharMarcadorDeTreino \} from '\.\/nado-desenho\.js'/);
const entidade = renderer.slice(renderer.indexOf('function drawEntity(entity, state)'));
const iNadador = entidade.indexOf('desenharNadador(');
const iDePe = entidade.indexOf('drawPlayerSprite(');
assert.ok(iNadador > 0 && iDePe > iNadador, 'o nadador precisa ser tentado ANTES do sprite de pé');
assert.match(entidade.slice(0, iNadador), /_nadoVis/, 'sem histerese o corpo pisca entre em pé e deitado na franja da praia');
assert.match(entidade.slice(0, iNadador), /combat\?\.timeLeft/, 'atacando na água o operador usa a arte de ataque');
assert.match(renderer, /desenharBoias\(ctx, boiasDoLimite\(map, nivelNado\)/, 'cordão de boias não está ligado');
assert.match(renderer, /nivelNado === 1 \|\| nivelNado === 2/, 'boias só existem nos degraus com alcance');
assert.match(renderer, /drawMarcadorDeTreino\(map, state\)/, 'marcador da poça não está ligado');
assert.match(renderer, /arvore\.nivel >= 2\) return/, 'o marcador da poça some depois da prova de respirar');

const css = ler('css/style.css');
assert.match(css, /#hudLeft > \.ability-message \{[^}]*left: 50% !important/s,
  'o aviso do centro precisa vencer `#hudLeft > *` (senão fica cortado no canto de cima)');
assert.match(css, /#elevatorPrompt\.nadando/, 'nadando, o aviso do [E] precisa descer para não tapar o corpo');
assert.match(ler('js/ui/hud.js'), /classList\.toggle\('nadando'/);

// ---------------------------------------------------------------------
// 8. Cabeça na água × corpo no fundo
// ---------------------------------------------------------------------
assert.equal(cabecaSubmersa(null), false);
assert.equal(cabecaSubmersa({ ativo: false, submerso: true, profundidade: 2 }), false, 'fora da água ninguém está submerso');
assert.equal(cabecaSubmersa({ ativo: true, submerso: true, profundidade: .9 }), true, 'mergulho raso (degraus 1 e 2) já é cabeça na água');
assert.equal(cabecaSubmersa({ ativo: true, submerso: false, profundidade: .9 }), false);
assert.equal(cabecaSubmersa({ ativo: true, submerso: false, profundidade: 1.6 }), true, 'nado antigo (sem árvore): fundo = submerso');
assert.equal(noFundoDoMar({ ativo: true, submerso: true, profundidade: .9 }), false, 'cabeça na água não é fundo do mar');
assert.equal(noFundoDoMar({ ativo: true, submerso: true, profundidade: 1.8 }), true);
assert.match(main, /const submerso = cabecaSubmersa\(player\.nado\)/, 'o socorro de bicho aquático deve pedir só a cabeça na água');
assert.match(renderer, /const submerso = cabecaSubmersa\(nado\)/, 'raios de sol abrem com a cabeça na água');

// ---------------------------------------------------------------------
// 9. A fauna avisa quando só falta o gesto
// ---------------------------------------------------------------------
{
  const { BICHOS, podeAjudar, ajudarBicho } = await import('../js/game/fauna-ferida.js');
  const tipoAgua = Object.keys(BICHOS).find(t => BICHOS[t].meio === 'agua');
  const tipoTerra = Object.keys(BICHOS).find(t => BICHOS[t].meio === 'terra');
  const bicho = tipo => ({ id: `t:${tipo}`, tipo, def: BICHOS[tipo], x: 5, y: 5, estado: 'ferido', carinho: 0 });

  const naSuperficie = podeAjudar(bicho(tipoAgua), BICHOS[tipoAgua].cura, false);
  assert.equal(naSuperficie.ok, false);
  assert.equal(naSuperficie.falta, 'meio', 'módulo certo na superfície: só falta mergulhar');
  assert.match(naSuperficie.motivo, /ESPAÇO/, 'o motivo precisa dizer a tecla');
  assert.equal(podeAjudar(bicho(tipoAgua), BICHOS[tipoAgua].cura, true).ok, true);

  const errado = Object.keys(BICHOS).map(t => BICHOS[t].cura).find(c => c !== BICHOS[tipoAgua].cura && c !== BICHOS[tipoAgua].alternativa);
  assert.equal(podeAjudar(bicho(tipoAgua), errado, false).falta, 'modulo', 'módulo errado não é caso de dica de mergulho');

  const naAgua = podeAjudar(bicho(tipoTerra), BICHOS[tipoTerra].cura, true);
  assert.equal(naAgua.falta, 'meio');
  assert.equal(naAgua.meio, 'terra');

  const passo = ajudarBicho(bicho(tipoAgua), { player: { x: 5.4, y: 5 }, arquetipo: BICHOS[tipoAgua].cura, submerso: false, dt: 1 / 60, nado: null });
  assert.equal(passo.falta, 'meio', 'ajudarBicho precisa repassar o que falta');
  assert.equal(passo.meio, 'agua');
  assert.match(main, /fauna\.dica/, 'main.js não mostra a dica da fauna');
  assert.match(main, /FRAGMENTO NO FUNDO • SEGURE ESPAÇO PARA MERGULHAR/, 'faltou a dica do fragmento');
}

// ---------------------------------------------------------------------
// 10. Objetos da praia: cache na escala da tela
// ---------------------------------------------------------------------
assert.match(renderer, /export function estadoDosEscalados\(\)/);
assert.match(renderer, /prepararEscalados\(z\);/, 'o cache precisa ser preparado a cada quadro, com o zoom do quadro');
assert.match(renderer, /ESCALADOS_MAX_BYTES = \d+ \* 1024 \* 1024/, 'o cache precisa de orçamento de memória');
const recorte = renderer.slice(renderer.indexOf('function drawCroppedObject('), renderer.indexOf('function drawCroppedObject(') + 5200);
assert.match(recorte, /escaladosAtivo && !filtro && skewY === 0 && escalaY === 1/,
  'peça com filtro, skew ou escalaY não pode vir do cache');
assert.match(recorte, /ctx\.setTransform\(1, 0, 0, 1, 0, 0\);[\s\S]{0,200}ctx\.setTransform\(mundoZ, 0, 0, mundoZ, mundoTx, mundoTy\);/,
  'a cópia 1:1 precisa devolver a transformação do mundo');
assert.match(recorte, /Math\.round\(esquerda \* mundoZ \+ mundoTx\)/, 'a cópia precisa alinhar ao pixel da tela');

console.log('Desenho do nado: 5 folhas, rumo isométrico, mergulho, boias, marcador, dicas e cache de sprites conferidos.');
