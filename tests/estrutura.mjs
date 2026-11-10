import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// =====================================================================
// SANIDADE DO CARREGAMENTO
//
// O navegador pede index.html, depois cada módulo ES e cada asset citado.
// Se um import aponta para arquivo removido/renomeado (ou com caixa errada),
// o servidor devolve HTML no lugar do JS e o console estoura com
// "Uncaught SyntaxError: Unexpected token '<'". Este teste pega isso antes.
// =====================================================================

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function listFiles(dir, extension, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    if (entry.isDirectory()) listFiles(full, extension, acc);
    else if (entry.name.endsWith(extension)) acc.push(full);
  }
  return acc;
}

// Existência com caixa exata: em produção (Linux/GitHub Pages) `Codex.js`
// não é `codex.js`, mesmo funcionando no Windows do autor.
function exactIssue(target) {
  if (!fs.existsSync(target)) return 'arquivo inexistente';
  const base = path.dirname(target);
  const name = path.basename(target);
  const matches = fs.readdirSync(base).filter(entry => entry.toLowerCase() === name.toLowerCase());
  if (!matches.includes(name)) return `caixa diferente (no disco: ${matches[0]})`;
  return null;
}

const problems = [];
const jsFiles = listFiles(path.join(root, 'js'), '.js');

// 1. Nenhum marcador de conflito esquecido em código.
const conflict = /^(?:<{7}|>{7}|={7})(?:\s|$)/m;
for (const file of listFiles(root, '.js').concat(listFiles(root, '.css'))) {
  if (conflict.test(fs.readFileSync(file, 'utf8'))) problems.push(`${path.relative(root, file)}: marcador de conflito`);
}

// 2. Todo import relativo aponta para um arquivo real, com a caixa certa.
let imports = 0;
for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) continue;
    imports += 1;
    const target = path.resolve(path.dirname(file), match[1]);
    const issue = exactIssue(target);
    if (issue) problems.push(`${path.relative(root, file)} → ${match[1]}: ${issue}`);
  }
}

// 3. index.html só referencia arquivos existentes (script, css, sprite).
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"#?:]+)"/g)) {
  const target = match[1];
  if (/^(https?:|\/\/|data:)/.test(target)) continue;
  const issue = exactIssue(path.resolve(root, target));
  if (issue) problems.push(`index.html → ${target}: ${issue}`);
}

// 4. CSS não aponta para sprite fantasma.
const cssPath = path.join(root, 'css/style.css');
for (const match of fs.readFileSync(cssPath, 'utf8').matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
  const target = match[1];
  if (/^(https?:|data:|#)/.test(target)) continue;
  const issue = exactIssue(path.resolve(path.dirname(cssPath), target));
  if (issue) problems.push(`css/style.css → ${target}: ${issue}`);
}

// 5. index.html precisa carregar o jogo como módulo e ter o canvas.
assert.match(html, /<canvas[^>]*id="game"/, 'index.html precisa do canvas do jogo');
assert.match(html, /<script[^>]+type="module"[^>]+src="js\/main\.js"/, 'index.html precisa carregar js/main.js como módulo');

assert.deepEqual(problems, [], `referências quebradas:\n${problems.join('\n')}`);
assert(jsFiles.length > 60, 'o grafo do jogo deve continuar grande; algo sumiu?');
console.log(`Estrutura: ${jsFiles.length} módulos, ${imports} imports relativos, assets do HTML/CSS todos resolvidos, sem marcadores de conflito.`);
