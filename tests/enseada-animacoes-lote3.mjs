import assert from 'node:assert/strict';
import fs from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
const ids = ['enseada_vegetacao_1','enseada_vegetacao_2','enseada_vegetacao_3','enseada_vegetacao_4','acampamento_vigilia_enseada','tenda_expedicao_enseada','bandeirola_vento_enseada','enseada_arvore_camp_esquerda','enseada_arvore_camp_direita','algas_douradas_enseada'];
const objetos=map.objects.filter(o=>ids.includes(o.id));
assert.deepEqual(objetos.map(o=>o.id),ids);
const main=fs.readFileSync('js/main.js','utf8');
for(const o of objetos){
 assert.notEqual(o.renderizar,false); assert.equal(o.animacaoFolha.quadros,8); assert.ok(o.animacaoFolha.periodo>0);
 assert.match(main,new RegExp(`id: '${o.animacaoFolha.sprite}'`));
 if(o.id!=='bandeirola_vento_enseada') assert.ok(!o.oscilaBrisa,`${o.id}: não deslocar a base`);
}
console.log('Lote 3: dez objetos visíveis e folhas registradas OK.');
