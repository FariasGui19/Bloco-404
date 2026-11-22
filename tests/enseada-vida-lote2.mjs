import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { ELEMENTOS_LOTE2, quadroEnseada, temDetalheEnseada, desenharDetalheEnseada } from '../js/engine/enseada-vida-lote2.js';

assert.equal(ELEMENTOS_LOTE2.length,10);
assert.equal(new Set(ELEMENTOS_LOTE2).size,10);
const main=readFileSync('js/main.js','utf8');
for (const id of ELEMENTOS_LOTE2) {
  const object=map.objects.find(o=>o.id===id);
  assert(object && object.renderizar!==false && object.useCrop, `${id}: sprite visível`);
  for(const sprite of object.quadrosAnimacao ?? []) {
    const entry=main.match(new RegExp(`id: '${sprite}', src: '([^']+)'`));
    assert(entry && existsSync(entry[1]),`${sprite}: quadro registrado`);
  }
  if(object.quadrosAnimacao) {
    assert.notEqual(quadroEnseada(object,.36),quadroEnseada(object,1.1),`${id}: troca de quadro`);
    assert.equal(quadroEnseada(object,123,true),object.sprite,'movimento reduzido mantém arte original');
  }
}
// Verifica que os efeitos mudam com o tempo e congelam em movimento reduzido.
function registrar() {
  const ops=[];
  const target={save(){ops.push('save')},restore(){ops.push('restore')},
    translate(...a){ops.push(['translate',...a])},scale(...a){ops.push(['scale',...a])},
    beginPath(){ops.push('begin')},ellipse(...a){ops.push(['ellipse',...a])},fill(){ops.push('fill')},
    moveTo(...a){ops.push(['moveTo',...a])},lineTo(...a){ops.push(['lineTo',...a])},stroke(){ops.push('stroke')}};
  return {ops,ctx:new Proxy(target,{set(o,k,v){ops.push([k,v]);o[k]=v;return true}})};
}
for(const id of ELEMENTOS_LOTE2.filter(temDetalheEnseada)) {
  const source=map.objects.find(o=>o.id===id), obj={...source,x:source.x+.5,y:source.y+.5};
  const a=registrar(),b=registrar(),c=registrar(),d=registrar(), crop={w:100,h:150};
  desenharDetalheEnseada(a.ctx,obj,crop,.36);desenharDetalheEnseada(b.ctx,obj,crop,1.1);
  desenharDetalheEnseada(c.ctx,obj,crop,.36,true);desenharDetalheEnseada(d.ctx,obj,crop,1.1,true);
  assert.notDeepEqual(a.ops,b.ops,`${id}: animação varia com tempo`);
  assert.deepEqual(c.ops,d.ops,`${id}: movimento reduzido congela`);
}
const renderer=readFileSync('js/engine/renderer.js','utf8');
assert(renderer.includes('quadroEnseada(object, performance.now()'));
assert(renderer.includes('desenharDetalheEnseada(ctx, object, crop'));
console.log('Lote de 10: quadros, efeitos, registros e movimento reduzido OK.');
