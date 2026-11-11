// =====================================================================
// TESTE: a praia cresceu, e a praia aprovada continua a mesma
//
// Pedido: "aumentar um pouco o tamanho" (frente 2). O risco é claro —
// crescer o mapa e mexer sem querer no que já estava aprovado: gates,
// spawns, rotas, estação. Este contrato congela o NÚCLEO 48x48 pelo
// hash da grade e cobra as beiradas novas em cima disso.
// =====================================================================

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';

const NUCLEO = 48;
const grade = map.aguaPraia;



// ---------------------------------------------------------------------
// 1. Cresceu de verdade
// ---------------------------------------------------------------------
assert.equal(grade.length, 64, `esperava 64 linhas, veio ${grade.length}`);
assert.equal(grade[0].length, 66, `esperava 66 colunas, veio ${grade[0].length}`);
assert.ok(grade.length * grade[0].length > NUCLEO * NUCLEO * 1.7, 'o mapa quase não cresceu');

// ---------------------------------------------------------------------
// 2. O núcleo aprovado continua o mesmo
//
// Separo duas coisas que parecem a mesma e não são:
//
//   CONTEÚDO  terra, areia molhada, ponte, poça, água rasa, água funda
//             do miolo. É intocável: o hash disto é o da praia 2.0.
//   FRANJA    as células `X` (mar aberto, deliberadamente sem desenho)
//             na borda leste/sul. Ao crescer, elas passaram a ter água
//             desenhada — a borda deixou de ser um recorte seco. Isso é
//             melhoria permitida e confinada; abaixo provo o confinamento.
// ---------------------------------------------------------------------
// O mapa exporta a própria lista congelada do núcleo: é ela que o teste
// hasheia. Se alguém "crescer" a praia mexendo no miolo, o hash muda.
const nucleo = map.nucleo;
assert.ok(nucleo && nucleo.grade?.length === 48, 'o mapa não exporta o núcleo congelado');
assert.equal(nucleo.tamanho, 48);

const conteudoAprovado = nucleo.grade
  .map(r => [...r].map(c => (c === 'X' ? '.' : c)).join(''))
  .join('');
const hashConteudo = createHash('sha256').update(conteudoAprovado).digest('hex').slice(0, 32);
assert.equal(hashConteudo, '043c864b83c9165704bd6245b2e617a3',
  'o conteúdo aprovado do núcleo mudou! (o crescimento deve ser só para fora)');

// E a grade ATUAL no miolo bate com a congelada: só a franja `X` pode
// ter virado água desenhada — nunca terra, ponte ou caminho novo.
const passarelas = new Set((nucleo.passarelas ?? []).map(([x, y]) => `${x},${y}`));
let franjaVirada = 0;
let passarelasAplicadas = 0;
let iguais = 0;
for (let y = 0; y < NUCLEO; y++) {
  for (let x = 0; x < NUCLEO; x++) {
    const aprovado = nucleo.grade[y][x];
    const atual = grade[y][x];
    if (atual === aprovado) { iguais++; continue; }
    // 1. A franja de mar aberto pode ganhar água desenhada.
    if (aprovado === 'X' && 'YyDd'.includes(atual)) { franjaVirada++; continue; }
    // 2. Célula declarada como passarela pode virar ponte.
    if (passarelas.has(`${x},${y}`) && 'Bb'.includes(atual)) { passarelasAplicadas++; continue; }
    assert.fail(`célula ${x},${y} do núcleo: "${aprovado}" virou "${atual}" — só franja X ou passarela declarada`);
  }
}
// A aritmética do núcleo tem que fechar: cada uma das 48x48 células é
// preservada, virou franja desenhada ou foi passarela declarada. Se
// alguém mexer em qualquer outra, sobra célula sem classificação.
assert.equal(iguais, nucleo.preservadas, 'contagem de preservadas divergente');
assert.equal(franjaVirada, nucleo.franjaConvertida, 'contagem de franja divergente');
assert.equal(
  nucleo.preservadas + nucleo.franjaConvertida + nucleo.passarelasAplicadas,
  NUCLEO * NUCLEO,
  'a soma de preservadas + franja + passarelas não fecha o núcleo');
assert.ok(franjaVirada > 100, 'a franja deveria ter ganhado água desenhada');
assert.ok(passarelasAplicadas > 0, 'as passarelas declaradas não foram aplicadas');
assert.equal(passarelasAplicadas, nucleo.passarelasAplicadas,
  'contagem de passarelas divergente');
assert.equal(nucleo.passarelasAplicadas, nucleo.passarelas.length,
  'passarela declarada que não virou ponte (a lista mentiu)');

// ---------------------------------------------------------------------
// 3. Nada do conteúdo antigo se moveu
// ---------------------------------------------------------------------
const SPAWNS = {
  inicio: [8.0, 7.5],
  vindo_do_trem: [8.0, 5.5],
  vindo_da_enseada: [11.5, 10.5],
  vindo_da_estacao: [8.5, 23.5],
};
for (const [nome, [x, y]] of Object.entries(SPAWNS)) {
  const sp = map.spawnPoints[nome];
  assert.equal(sp.x, x, `spawn ${nome}.x mudou`);
  assert.equal(sp.y, y, `spawn ${nome}.y mudou`);
}

const GATES = ['rocha_rachada', 'travessia_mare_eco', 'passagem_mare_eco',
  'teleferico_quebrado', 'caverna_alagada', 'fenda_estreita'];
const gatesNoMapa = map.objects.filter(o => o.gate).map(o => o.id);
assert.deepEqual([...gatesNoMapa].sort(), [...GATES].sort(), 'os 6 gates mudaram');

// A área nova recebe a MESMA decoração procedural do resto (palmeira,
// coral, arbusto...). O que não pode existir lá é conteúdo com
// significado: gate, portal, baú de missão ou ponto de embarque.
const CONTEUDO = /gate|portal|bau|cofre|embarque|terminal|totem|farol/i;
const novos = map.objects.filter(o => o.x >= NUCLEO || o.y >= NUCLEO);
assert.ok(novos.length > 20, `a área nova está vazia demais (${novos.length} objetos)`);
for (const o of novos) {
  assert.ok(!CONTEUDO.test(o.id), `conteúdo "${o.id}" colocado na área nova sem curadoria`);
  // E nenhum gate novo pode ter surgido lá.
  assert.ok(!o.gate, `gate "${o.id}" apareceu na área nova`);
}
// Decoração de verdade: tem palmeira e coral na orla nova.
assert.ok(novos.some(o => /palmeira/.test(o.id)), 'orla nova sem palmeiras');
assert.ok(novos.some(o => /coral|pedra|rocha/.test(o.id)), 'orla nova sem pedra/coral');

// ---------------------------------------------------------------------
// 4. As beiradas novas têm o que prometem
// ---------------------------------------------------------------------
const contar = (fn) => {
  let n = 0;
  for (let y = 0; y < grade.length; y++) {
    for (let x = 0; x < grade[y].length; x++) if (fn(grade[y][x], x, y)) n++;
  }
  return n;
};

// Areia de verdade = seco ('S') + molhado ('M'). A costa de uma praia é
// areia molhada; contar só 'S' subestima a faixa.
const ehAreia = (c) => c === 'S' || c === 'M';

// Enseada do Leste: faixa contínua, colunas 48..65
const areiaLeste = contar((c, x) => x >= 48 && ehAreia(c));
assert.ok(areiaLeste > 180, `pouca areia na enseada leste: ${areiaLeste}`);
// E ela se estende no eixo norte-sul: praia, não losango.
let linhasComAreiaLeste = 0;
for (let y = 0; y < grade.length; y++) {
  if ([...grade[y].slice(48)].some(ehAreia)) linhasComAreiaLeste++;
}
assert.ok(linhasComAreiaLeste >= 25, `enseada leste curta demais: ${linhasComAreiaLeste} linhas`);
// Larga no meio: a meia-lua precisa de miolo, não fio de areia.
const larguraMeio = Math.max(...grade.slice(24, 36).map(l => [...l.slice(48)].filter(ehAreia).length));
assert.ok(larguraMeio >= 8, `enseada fina demais no meio: ${larguraMeio} tiles`);

// Cabo do Eco: areia no sul, linhas 48..63
const areiaSul = contar((c, x, y) => y >= 48 && ehAreia(c));
assert.ok(areiaSul > 200, `pouco Cabo do Eco: ${areiaSul}`);

// Rocha nas beiradas (costão + ponta de pedra)
assert.ok(contar((c, x, y) => (x >= 48 || y >= 48) && c === 'R') > 60, 'beiradas sem costão rochoso');

// Ilhota satélite: terra ISOLADA por água na coluna alta, para ser
// alcançada nadando (não por ponte contínua de areia).
const ilhota = [];
for (let y = 0; y < grade.length; y++) {
  for (let x = 58; x < grade[y].length; x++) if (ehAreia(grade[y][x])) ilhota.push([x, y]);
}
assert.ok(ilhota.length > 8, `ilhota satélite pequena demais: ${ilhota.length} tiles`);
// E é ILHA: existe água entre ela e a enseada (senão é só uma ponta
// de areia e o nado não tem destino).
const faixaCanal = [];
for (let y = 28; y <= 38; y++) faixaCanal.push(grade[y].slice(55, 59));
assert.ok(faixaCanal.join('').match(/[YyDdX]/), 'ilhota colada na enseada, sem canal de água');

// ---------------------------------------------------------------------
// 5. O mar continua em camadas (raso perto da terra, fundo depois)
// ---------------------------------------------------------------------
const ehTerra = (c) => 'SMTPRBb'.includes(c);
let rasoPerto = 0, rasoLonge = 0;
for (let y = 1; y < grade.length - 1; y++) {
  for (let x = 1; x < grade[y].length - 1; x++) {
    if (grade[y][x] !== 'Y' && grade[y][x] !== 'y') continue;
    let tocaTerra = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (ehTerra(grade[y + dy]?.[x + dx])) tocaTerra = true;
    }
    if (tocaTerra) rasoPerto++; else rasoLonge++;
  }
}
assert.ok(rasoPerto > rasoLonge, 'o mar raso deveria ficar na costa, não no meio');

// ---------------------------------------------------------------------
// 6. A água nova é NAVEGÁVEL: existe água funda na enseada e no cabo
// ---------------------------------------------------------------------
const fundaNova = contar((c, x, y) => (x >= 48 || y >= 48) && (c === 'D' || c === 'd'));
assert.ok(fundaNova > 80, `a área nova quase não tem água funda (${fundaNova}) — nado sem lugar`);

// ---------------------------------------------------------------------
// 6b. TUDO é alcançável a pé a partir do spawn
//
// Foi o erro mais caro desta frente: a orla nova nasceu bonita e
// DESCONECTADA (907 tiles que o jogador via e não alcançava). Praia que
// se vê e não se pisa é cenário, não é mapa.
// ---------------------------------------------------------------------
const andavel = (c) => 'SMTPBbR'.includes(c);
const visto = new Set(['8,7']);
const fila = [[8, 7]];
while (fila.length) {
  const [cx, cy] = fila.pop();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = cx + dx, ny = cy + dy;
    if (nx < 0 || ny < 0 || ny >= grade.length || nx >= grade[0].length) continue;
    const k = `${nx},${ny}`;
    if (visto.has(k) || !andavel(grade[ny][nx])) continue;
    visto.add(k);
    fila.push([nx, ny]);
  }
}
let andaveis = 0;
const inalcancaveis = [];
for (let y = 0; y < grade.length; y++) {
  for (let x = 0; x < grade[0].length; x++) {
    if (!andavel(grade[y][x])) continue;
    andaveis++;
    if (!visto.has(`${x},${y}`)) inalcancaveis.push(`${x},${y}`);
  }
}
assert.equal(inalcancaveis.length, 0,
  `tiles andáveis inalcançáveis: ${inalcancaveis.length} (ex.: ${inalcancaveis.slice(0, 6).join(' ')})`);
// E as três beiradas novas são pisáveis de fato.
for (const [nome, teste] of [
  ['enseada leste', (x) => x >= 52],
  ['cabo do eco', (x, y) => y >= 52],
  ['ilhota', (x) => x >= 58],
]) {
  assert.ok([...visto].some(k => teste(+k.split(',')[0], +k.split(',')[1])),
    `${nome} não é alcançável a pé`);
}

// ---------------------------------------------------------------------
// 7. O mapa maior não virou um problema de desempenho
//
// O mar é assado por mapa, uma vez. O que importa é: (a) a montagem
// continua abaixo do orçamento, (b) o custo por FRAME não depende do
// tamanho do mapa. Se alguém dobrar o mapa de novo, isto acusa.
// ---------------------------------------------------------------------
const area = grade.length * grade[0].length;
assert.ok(area < 6000, `mapa grande demais para o orçamento de textura: ${area} tiles`);
// 792x768 px de textura = 2,4 MB. Acima de 3 MB a inicialização pesa em
// celular, que é onde o jogo precisa rodar.
const pxTextura = grade[0].length * 12 * grade.length * 12;
assert.ok(pxTextura * 4 < 3.5 * 1024 * 1024,
  `textura do mar passaria de 3,5 MB (${(pxTextura * 4 / 1048576).toFixed(1)} MB)`);

console.log('Praia: %dx%d (núcleo aprovado 48x48 intacto, hash %s)',
  grade[0].length, grade.length, hashConteudo);
console.log('  enseada leste : %d tiles de areia em %d linhas', areiaLeste, linhasComAreiaLeste);
console.log('  cabo do eco   : %d tiles de areia', areiaSul);
console.log('  ilhota        : %d tiles de terra isolada', ilhota.length);
console.log('  água funda nova: %d tiles', fundaNova);
console.log('  área total    : %d tiles (textura do mar ~%s MB)', area, (pxTextura * 4 / 1048576).toFixed(1));
