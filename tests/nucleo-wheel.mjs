// =====================================================================
// RODA DO NÚCLEO (T) — escolha de forma, duas jogáveis e projeto travado
//
// A roda deixou de ser markup fixo com três cadeados pintados à mão: ela
// lista as formas do dado. O teste garante que escolher a Quebra Sistemas
// transforma nela, que as formas em projeto continuam travadas e que a
// confirmação só retorna ao operador em área segura.
// =====================================================================
import assert from 'node:assert/strict';
import { input } from '../js/engine/input.js';
import { openNucleoWheel, isNucleoWheelOpen, updateNucleoWheel } from '../js/ui/nucleo-wheel.js';

let visible = false;
let built = '';
const buttons = [];
const status = { innerHTML: '' };
const overlay = {
  innerHTML: '',
  dataset: {},
  classList: { list: new Set(), add(n) { this.list.add(n); visible = true; }, remove(n) { this.list.delete(n); visible = false; }, contains(n) { return this.list.has(n); } },
  querySelector(selector) {
    if (selector === '#nucleo-status') return status;
    if (selector === '.nucleo-form.selected:not([disabled])') return buttons.find(b => b.classList.contains('selected') && !b.disabled) ?? null;
    return null;
  },
  querySelectorAll(selector) {
    // A roda reconstrói o HTML a cada abertura; os botões nascem daí.
    if (selector === '.nucleo-form') {
      if (overlay.innerHTML !== built) { built = overlay.innerHTML; rebuildButtons(); }
      return buttons;
    }
    return [];
  },
  addEventListener() {},
};
globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') return { width: 0, height: 0, getContext: () => ({ drawImage() {} }), toDataURL: () => '' };
    return overlay;
  },
  body: { appendChild() {} },
};

// A roda é reconstruída a cada abertura: os botões nascem do innerHTML.
function rebuildButtons() {
  buttons.length = 0;
  for (const match of overlay.innerHTML.matchAll(/data-tool="([a-z_]+)"([^>]*)/g)) {
    const id = match[1];
    const disabled = /disabled/.test(match[2]);
    const classes = new Set();
    const button = {
      dataset: { tool: id },
      disabled,
      classes,
      classList: {
        add: n => classes.add(n), remove: n => classes.delete(n), contains: n => classes.has(n),
        toggle(n, on) { if (on) classes.add(n); else classes.delete(n); },
      },
      setAttribute() {},
      // A roda registra três eventos no mesmo cartão; o teste guarda todos e
      // expõe .click como o caminho de ponteiro (pointerdown/click).
      addEventListener(event, fn) { this[event] = fn; if (event !== 'keydown') this.click = fn; },
      focus() {},
    };
    buttons.push(button);
  }
}
const abrir = (...args) => openNucleoWheel(...args);

const player = { ability: { dash: null } };
assert(!abrir({ archetype: 'mare_astral' }, player));
assert(!abrir({ archetype: 'nucleo_dez_forma' }, { ability: { dash: {} } }));

const progress = { archetype: 'nucleo_dez_forma', abilities: ['forma_veloz', 'eco_scan'], tools: {} };
assert(abrir(progress, player));
assert(isNucleoWheelOpen() && visible);
assert.match(overlay.innerHTML, /QUEBRA SISTEMAS/, 'a roda lista a segunda forma');
assert.match(overlay.innerHTML, /disponível|VELOZ/, 'a roda mantém a forma veloz');
assert.equal(buttons.length, 4, 'quatro formas no anel');
assert.equal(buttons.filter(b => b.disabled).length, 2, 'fluida e núcleo continuam em projeto');

// CADA CARTA NO SEU ENCAIXE. O relato "só muda o nome, a foto fica de um" era
// exatamente isto: as quatro cartas no mesmo ponto do anel. As posições são
// quatro pares diferentes, e as duas formas jogáveis têm a SUA miniatura.
const posicoes = [...overlay.innerHTML.matchAll(/--slot-x: ([\d.]+%); --slot-y: ([\d.]+%)/g)]
  .map(m => `${m[1]}/${m[2]}`);
assert.equal(posicoes.length, 4, 'quatro cartas com posição declarada');
assert.equal(new Set(posicoes).size, 4, 'nenhuma carta divide o mesmo encaixe');
const arts = [...overlay.innerHTML.matchAll(/class="nucleo-preview" src="([^"]+)"/g)].map(m => m[1]);
assert.equal(arts.length, 2, 'uma arte por forma jogável');
assert.equal(new Set(arts).size, 2, 'a Veloz e a Quebra têm imagens DIFERENTES');
assert.match(arts.join(' '), /nucleo-forma-veloz\.png/);
assert.match(arts.join(' '), /nucleo-quebra-sistemas\.png/);

// Fecha com ESC.
input.pressed.add('escape'); updateNucleoWheel(); input.pressed.clear();
assert(!isNucleoWheelOpen() && !visible);

// Escolher a Quebra Sistemas transforma nela e grava a escolha.
assert(abrir(progress, player));
const quebra = buttons.find(b => b.dataset.tool === 'nucleo_bruto');
assert(quebra && !quebra.disabled, 'quebra sistemas escolhível');
quebra.click();
assert.equal(progress.tools.nucleo_dez_forma, 'nucleo_bruto', 'escolha fica no progresso');
assert.equal(player.nucleoForm, 'forma_bruta', 'a transformação é a da forma escolhida');
assert.equal(player.ability.effect.id, 'transformacao_10x');
assert.equal(player.ability.effect.form, 'forma_bruta', 'o efeito diz qual forma está entrando');
assert(!isNucleoWheelOpen(), 'confirmar fecha a roda');
assert(!abrir(progress, player), 'não interrompe a transição');

// Retorno só em área segura, e volta ao operador.
player.ability.effect = null;
assert(abrir(progress, player, () => false));
quebra.click();
assert(isNucleoWheelOpen(), 'não retorna em área insegura');
input.pressed.add('escape'); updateNucleoWheel(); input.pressed.clear();
assert(abrir(progress, player));
input.pressed.add(' '); updateNucleoWheel(); input.pressed.clear();
assert.equal(player.nucleoForm, null, 'espaço confirma o retorno');
assert.equal(player.ability.effect.activating, false);

// A forma veloz continua funcionando e pode ser reescolhida. A recarga entre
// transformações é regra do jogo: o teste espera ela zerar como no loop real.
player.ability.effect = null; // a transição de volta já terminou
player.nucleoRuntime.recharge = 0;
assert(abrir(progress, player));
const veloz = buttons.find(b => b.dataset.tool === 'nucleo_veloz');
veloz.click();
assert.equal(progress.tools.nucleo_dez_forma, 'nucleo_veloz');
assert.equal(player.nucleoForm, 'forma_veloz');

console.log('Núcleo: roda lista as formas do dado, escolhe, transforma e trava projeto OK.');
