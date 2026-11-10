// =====================================================================
// A FORMA DO NÚCLEO NA INTERFACE — HUD e Códex
//
// O "relógio pelo T" precisava dizer mais do que segundos: qual forma está
// ativa, quanto da duração dela ainda resta e (na Quebra) quantas marretadas
// ainda cabem na barra. HUD e Códex mostram a MESMA leitura.
// =====================================================================
import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { __codexInternals as codex } from '../js/ui/codex.js';
import { getFormDuration, NUCLEO_BRUTA, NUCLEO_VELOZ } from '../js/data/nucleo-forms.js';

const progress = {
  archetype: 'nucleo_dez_forma',
  archetypeProgress: { nucleo_dez_forma: { level: 3, xp: 0 } },
  abilities: ['forma_veloz'],
  tools: { nucleo_dez_forma: 'nucleo_bruto' },
  flags: {},
};

// Quebra ativa com 12 s de 20: barra em 60% e 4 marretadas pagáveis.
const bruto = { nucleoForm: NUCLEO_BRUTA, nucleoRuntime: { remaining: 12, recharge: 0 } };
const linhaBruta = codex.formRow(progress, bruto, { formId: NUCLEO_BRUTA });
assert.match(linhaBruta, /QUEBRA SISTEMAS/);
assert.match(linhaBruta, /width:60%/, 'barra proporcional à duração da forma');
assert.match(linhaBruta, /4 marretada\(s\) ainda cabem/, '12 s ÷ 3 s por golpe = 4 golpes');
assert.match(linhaBruta, /#ffc94a/, 'cor própria da forma');

// Veloz: 15 s de 30, sem custo por golpe.
const veloz = { nucleoForm: NUCLEO_VELOZ, nucleoRuntime: { remaining: 15, recharge: 0 } };
const linhaVeloz = codex.formRow(progress, veloz, { formId: NUCLEO_VELOZ });
assert.match(linhaVeloz, /FORMA VELOZ/);
assert.match(linhaVeloz, /width:50%/);
assert.doesNotMatch(linhaVeloz, /marretada/, 'a Veloz não cobra golpe');

// Sem forma ativa, a linha diz que está esperando o T e não mente um tempo.
const parado = codex.formRow(progress, { nucleoForm: null, nucleoRuntime: { remaining: 0, recharge: 3 } }, { formId: NUCLEO_BRUTA });
assert.match(parado, /aguardando o T/);
assert.match(parado, /width:0%/);

// Outro arquétipo não vê a linha do Núcleo.
assert.equal(codex.formRow({ archetype: 'mare_astral' }, bruto, {}), '');

// Duração vem do dado, não de constante escondida.
assert.equal(bruto.nucleoRuntime.remaining / getFormDuration({ form: { duration: 20 } }, 0), .6);

// O Códex continua montando os atributos do Núcleo com a linha dentro.
state.player = { ...state.player, ...bruto, health: 100, maxHealth: 120, energy: 50, maxEnergy: 100 };
const atributos = codex.renderAttributes(progress, state.player);
assert.match(atributos, /codex-form-row/, 'a linha da forma está no painel de atributos');

console.log('Forma do Núcleo na UI: barra, segundos, custo de golpe e Códex OK.');
