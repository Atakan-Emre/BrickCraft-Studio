import fs from 'node:fs/promises';
import {LDrawLoader} from 'three/addons/loaders/LDrawLoader.js';
import {LDrawConditionalLineMaterial} from 'three/addons/materials/LDrawConditionalLineMaterial.js';
import {MODEL_LIST} from '../src/catalog.js';
// Actual Three parser, no renderer or browser needed. ProgressEvent is not in Node.
globalThis.ProgressEvent ??= class {constructor(type,options){this.type=type;Object.assign(this,options);}};
const materials=new LDrawLoader().setConditionalLineMaterial(LDrawConditionalLineMaterial);
await materials.preloadMaterials((process.env.MODEL_VALIDATION_ORIGIN||'http://localhost:4173')+'/ldraw/LDConfig.ldr');
const unique=new Map(),models=[];
for(const {id,count} of MODEL_LIST){
 const raw=JSON.parse(await fs.readFile(`public/models/${id}.json`,'utf8'));
 if(raw.pieces.length!==count)throw Error(`Catalog count mismatch: ${id}`);
 models.push({id,elements:raw.pieces.length,parts:Object.keys(raw.parts).length});
 for(const [key,info] of Object.entries(raw.parts))unique.set(key,info.assetUrl);
}
const results=[],failures=[];
for(const [key,url] of unique){
 try {
  const loader=new LDrawLoader().setConditionalLineMaterial(LDrawConditionalLineMaterial).setMaterials(materials.materials);
  const text=await fs.readFile('public'+url,'utf8');
  const group=await new Promise((resolve,reject)=>loader.parse(text,resolve,reject));
  let vertices=0;
  group.traverse(o=>{if(o.isMesh){const attr=o.geometry.getAttribute('position');vertices+=attr.count;if(!attr.array.every(Number.isFinite))throw Error('Non-finite geometry');o.geometry.dispose();}});
  if(!vertices)throw Error('Empty geometry');results.push({key,vertices});
 }catch(error){failures.push({key,error:String(error)});}
}

const report={generatedAt:new Date().toISOString(),models,packageCount:unique.size,validCount:results.length,failures,results};
await fs.writeFile('public/models/geometry-validation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({models,packages:unique.size,valid:results.length,failures}));
if(failures.length)process.exitCode=1;
