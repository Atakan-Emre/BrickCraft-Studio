import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { assetUrl } from '../src/asset-url.js';
import { MODEL_LIST } from '../src/catalog.js';

const root = resolve('dist/client');
const base = process.env.VITE_BASE_PATH || '/';
assert.ok(base.startsWith('/') && base.endsWith('/'), 'Base must start and end with /');
const checked = new Set();
async function check(url) {
  assert.ok(url.startsWith(base), `Asset escapes deployment prefix ${base}: ${url}`);
  const relative = decodeURIComponent(url.slice(base.length).split(/[?#]/)[0]);
  const file = resolve(root, relative);
  assert.ok(file.startsWith(root + sep), `Asset escapes build directory: ${url}`);
  assert.ok((await stat(file)).isFile(), `Missing deployment asset: ${url}`);
  checked.add(url);
  return file;
}
const html = await readFile(resolve(root,'index.html'),'utf8');
const resources = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
assert.ok(resources.some(url=>url.endsWith('.js')), 'Missing JavaScript entry');
assert.ok(resources.some(url=>url.endsWith('.css')), 'Missing stylesheet');
for (const url of resources) await check(url);
for (const {id,count} of MODEL_LIST) {
  const file = await check(assetUrl(`/models/${id}.json`,base));
  const model = JSON.parse(await readFile(file,'utf8'));
  assert.equal(model.id,id);
  assert.equal(model.pieces.length,count);
  await check(assetUrl(`/models/previews/${id}.png`,base));
  await check(assetUrl(model.metadata.sourceFile,base));
  for (const part of Object.values(model.parts)) await check(assetUrl(part.assetUrl,base));
}
for (const name of ['LDConfig.ldr','CAreadme.txt','CAlicense.txt','CAlicense4.txt']) {
  await check(assetUrl(`/ldraw/${name}`,base));
}
console.log(`Deployment verified: ${checked.size} assets, ${MODEL_LIST.length} models, prefix ${base}`);
