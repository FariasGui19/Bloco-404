// Depura um objeto: imprime posição de tela, tamanho e se o sprite carregou.
// Uso: node tools/qa/debug-obj.mjs <trecho-do-id>
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
process.chdir(root);
const filtro = process.argv[2] ?? 'terraco';
const { map } = await import('../../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js');
const { getObjectSpriteConfig } = await import('../../js/engine/renderer.js').catch(() => ({}));
const src = fs.readFileSync('js/main.js', 'utf8');
for (const o of map.objects.filter(o => o.id.includes(filtro) || (o.sprite ?? '').includes(filtro))) {
  console.log(JSON.stringify(o));
  const reg = src.split('\n').find(l => l.includes(`'${o.sprite}'`));
  console.log('registro:', reg?.trim() ?? 'NAO ENCONTRADO em main.js');
  if (reg) {
    const m = reg.match(/src: '([^']+)'/);
    console.log('arquivo existe?', fs.existsSync(m[1]), m[1]);
  }
}
