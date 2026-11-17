import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { findNearestInteraction, checkInteractions } from '../js/game/interactions.js';
import { tryModuleInteraction } from '../js/game/module-interactions.js';
import { initDialogue, isDialogueOpen, closeDialogue } from '../js/ui/dialogue.js';

// Simula o DOM de diálogo, mas usa o mesmo seletor e os mesmos handlers E/R
// do jogo, além do estado e dos colisores carregados pelo map-manager.
const el = () => ({ dataset: {}, classList: { add(){}, remove(){}, toggle(){} },
  addEventListener(){}, appendChild(){}, replaceChildren(){}, textContent:'', innerHTML:'' });
const elements = Object.fromEntries(['dialogueBox','dialogueSpeaker','dialogueText','dialogueHint','dialogueChoices'].map(id=>[id,el()]));
globalThis.document = {getElementById:id=>elements[id]??null, createElement:el};
globalThis.window = {addEventListener(){}, removeEventListener(){}};
initDialogue();
state.save.loaded = false;
state.progress.flags = {frequencia666Registrada:true, metroCalibrado:true};
state.progress.archetype = 'motor_bio_forja';
state.progress.abilities = ['bio_diagnostic'];
await loadMap('ilha_enseada_ecos', 'vindo_da_praia');
const map = state.world.currentMap;
const queue = [[Math.round(state.player.x*2), Math.round(state.player.y*2)]];
const seen = new Set(), reachable = [];
for (let i=0; i<queue.length; i++) {
  const [ix,iy] = queue[i], key = `${ix},${iy}`;
  if (seen.has(key)) continue; seen.add(key);
  const x=ix/2, y=iy/2;
  if (!canStandAt(map,x,y,.2,state.player)) continue;
  reachable.push([x,y]);
  queue.push([ix+1,iy],[ix-1,iy],[ix,iy+1],[ix,iy-1]);
}
for (const id of ['acesso_estacao_666','enseada_retorno','totem_eco_enseada',
  'espelho_arquetipos_enseada','bancada_campo_enseada','terminal_frequencia_666']) {
  const ponto = reachable.find(([x,y]) => {
    Object.assign(state.player,{x,y});
    return findNearestInteraction()?.data.id === id;
  });
  assert(ponto, `${id}: nenhum ponto de interação alcançável sem atravessar colisão`);
  Object.assign(state.player,{x:ponto[0],y:ponto[1]});
  if (id === 'acesso_estacao_666' || id === 'enseada_retorno') continue;
  closeDialogue();
  await checkInteractions(true);
  assert(isDialogueOpen(), `${id}: [E] não abriu diálogo`);
  closeDialogue();
  if (id === 'terminal_frequencia_666') {
    assert(tryModuleInteraction(), 'terminal: [R] não acionou diagnóstico');
    assert(isDialogueOpen(), 'terminal: [R] não abriu diagnóstico');
    closeDialogue();
  }
}
assert(!state.objects.find(o=>o.id==='portal_submarino_sul').bloqueia,
  'portal oculto não pode deixar colisão invisível no mar');
console.log('Enseada: caminhos com colisão e handlers [E]/[R] OK.');
