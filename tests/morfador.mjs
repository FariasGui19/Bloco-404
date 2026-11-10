// =====================================================================
// MORFADOR DE RESSONÂNCIA — CONTRATO DO MODO CRIADOR
//
// O modo criador é uma ferramenta de AUTORIA. Este teste é a tranca:
//
//   1. sem a chave, NADA funciona (nem trocar arquétipo, nem abrir modo);
//   2. chave errada não promove save;
//   3. com a chave, troca arquétipo, zera custo e zera recarga;
//   4. ao desligar, o estado REAL volta (o save do criador não fica sujo);
//   5. save de jogador nunca ganha a chave por acidente.
// =====================================================================
import assert from 'node:assert/strict';
import {
  CREATOR_FLAG, MORFADOR, autorizado, registrarAutoria, criarEstadoMorfador,
  alternarMorfador, trocarArquetipo, custoDeEnergia, recargaAplicavel,
  manterInfinitos, catalogo, tempoDoMundo, desligar,
} from '../js/game/morfador.js';
import { ARCHETYPES } from '../js/data/onboarding.js';

const saveJogador = () => ({
  flags: {},
  archetype: 'mare_astral',
  abilities: ['passo_corrente'],
  energia: 40,
  energiaMax: 100,
  archetypeProgress: { mare_astral: { level: 4 } },
});
const playerNovo = () => ({ health: 30, maxHealth: 100, equippedSuit: 'mare' });

// --- 1. Sem chave, nada acontece -------------------------------------
const jogador = saveJogador();
const p1 = playerNovo();
assert.equal(autorizado(jogador), false, 'save de jogador não é de autoria');
assert.equal(trocarArquetipo(jogador, p1, 'nucleo_dez_forma'), false, 'troca deveria ser negada');
assert.equal(alternarMorfador(jogador, p1), null, 'modo deveria ser negado');
assert.equal(jogador.archetype, 'mare_astral', 'arquétipo não podia mudar');
assert.equal(jogador.energia, 40, 'energia não podia mudar');
assert.equal(p1.health, 30, 'vida não podia mudar');
assert.equal(catalogo(jogador).length, 0, 'catálogo deveria vir vazio sem autoria');
assert.equal(custoDeEnergia(jogador, p1, 25), 25, 'custo deveria continuar normal');
assert.equal(recargaAplicavel(jogador, p1, 8), 8, 'recarga deveria continuar normal');
console.log('Sem chave: troca, modo, catálogo e infinitos todos negados.');

// --- 2. Chave errada não promove ------------------------------------
assert.equal(registrarAutoria(jogador, 'senha'), false, 'chave errada aceita?');
assert.equal(registrarAutoria(jogador, ''), false, 'chave vazia aceita?');
assert.equal(autorizado(jogador), false, 'save promovido por engano');

// --- 3. Chave certa promove e o modo abre ---------------------------
assert.equal(registrarAutoria(jogador, CREATOR_FLAG), true, 'chave certa deveria promover');
assert.equal(autorizado(jogador), true);

const p2 = playerNovo();
const modo = alternarMorfador(jogador, p2);
assert(modo?.ativo, 'modo deveria ligar');
assert.equal(jogador.archetype, 'mare_astral', 'ligar o modo NÃO troca de arquétipo sozinho');
assert.equal(p2.health, p2.maxHealth, 'vida deveria ir ao teto no modo criador');
assert.equal(jogador.energia, jogador.energiaMax, 'energia deveria ir ao teto');

// Catálogo mostra os 4 módulos.
const cat = catalogo(jogador);
assert.equal(cat.length, Object.keys(ARCHETYPES).length, 'catálogo incompleto');
assert(cat.every(a => a.nome && a.cor), 'catálogo sem nome/cor');

// Troca real entre todos.
for (const id of Object.keys(ARCHETYPES)) {
  assert(trocarArquetipo(jogador, p2, id), `deveria trocar para ${id}`);
  assert.equal(jogador.archetype, id);
  assert(jogador.abilities.length > 0, `${id} ficou sem habilidades`);
}
console.log(`Catálogo: ${cat.length} módulos, troca livre entre todos.`);

// --- 4. Custo e recarga zerados -------------------------------------
assert.equal(custoDeEnergia(jogador, p2, 40), 0, 'energia deveria ser infinita');
assert.equal(recargaAplicavel(jogador, p2, 12), 0, 'recarga deveria ser zero');
p2.energia = 3; p2.health = 5;
manterInfinitos(jogador, p2);
assert.equal(jogador.energia, jogador.energiaMax, 'manterInfinitos não repôs energia');
assert.equal(p2.health, p2.maxHealth, 'manterInfinitos não repôs vida');

// Congelar mundo é opt-in.
assert.equal(tempoDoMundo(p2), 1, 'mundo deveria correr por padrão');
p2.morfador.mundoCongelado = true;
assert.equal(tempoDoMundo(p2), 0, 'congelar mundo deveria zerar o tempo');
p2.morfador.mundoCongelado = false;
console.log('Custo 0, recarga 0, infinitos mantidos; congelar mundo é opcional.');

// --- 5. Desligar devolve o estado real -------------------------------
// Antes de desligar, garante que um nível real foi guardado.
p2.morfador.nivelReal ??= {};
desligar(jogador, p2);
assert.equal(p2.morfador.ativo, false, 'modo deveria desligar');
assert.equal(jogador.archetype, 'mare_astral', 'deveria voltar ao arquétipo original');
assert.deepEqual(jogador.abilities, ['passo_corrente'], 'habilidades originais perdidas');
assert.equal(jogador.archetypeProgress.mare_astral.level, 4, 'nível real deveria voltar (não 99)');
assert.equal(jogador.energia, jogador.energiaMax, 'energia volta ao teto ao sair');
console.log('Desligar: arquétipo, habilidades e nível real restaurados.');

// --- 6. Estado inicial é seguro -------------------------------------
const estado = criarEstadoMorfador();
assert.equal(estado.ativo, false, 'o Morfador não pode nascer ligado');
assert.equal(estado.mundoCongelado, false, 'não pode nascer com o mundo parado');
assert.equal(MORFADOR.sigla, 'MR-404');

// A chave é o nome da flag — documentado, não escondido em hash obscuro.
assert.equal(CREATOR_FLAG, 'morfador_de_ressonancia');

console.log('\nMorfador: modo criador trancado, reversível e documentado.');
