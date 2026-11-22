import assert from 'node:assert/strict';
import fs from 'node:fs';
import {map} from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
const ids=['enseada_vegetacao_5','enseada_vegetacao_6','carrilhao_vento_enseada','bambus_portico_oeste',...Array.from({length:6},(_,i)=>`arbusto_anotado_oeste_${i+1}`)];
const main=fs.readFileSync('js/main.js','utf8');
for(const id of ids){
 const o=map.objects.find(o=>o.id===id);assert.ok(o&&o.renderizar!==false&&o.useCrop,`${id} precisa estar visível`);
 const a=o.animacaoFolha;assert.ok(a&&a.quadros===8&&a.periodo>0&&a.margem===(a.sprite.startsWith('enseada_folha4_') || a.sprite.startsWith('enseada_folha7_') ? 24 : 8),`${id} precisa de oito quadros`);
 assert.ok(main.includes(`id: '${a.sprite}'`),`${a.sprite} não carregado`);
 assert.ok(!o.oscilaBrisa,`${id} não deve mover a base`);
}
assert.equal(map.objects.find(o=>o.id==='carrilhao_vento_enseada').interacao.label,'OUVIR O CARRILHÃO');
console.log('Lote 4: dez objetos visíveis, folhas registradas e interação preservada.');
