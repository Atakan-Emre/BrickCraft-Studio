import * as THREE from 'three';
import { LDrawLoader } from 'three/addons/loaders/LDrawLoader.js';
import { LDrawConditionalLineMaterial } from 'three/addons/materials/LDrawConditionalLineMaterial.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assetUrl } from './asset-url.js';

const sources = new Map();
const library = new LDrawLoader().setConditionalLineMaterial(LDrawConditionalLineMaterial);
let ready;
function prepareMaterials() {
  ready ??= library.preloadMaterials(assetUrl('/ldraw/LDConfig.ldr'))
    .then(() => library.materials.forEach(material => material.fog = false))
    .catch(error => { ready = undefined; throw error; });
  return ready;
}
export async function loadPart(key, url) {
  if (!sources.has(key)) sources.set(key, (async () => {
    await prepareMaterials();
    const loader = new LDrawLoader().setConditionalLineMaterial(LDrawConditionalLineMaterial);
    loader.setMaterials(library.materials);
    const group = await loader.loadAsync(assetUrl(url || `/ldraw/detail/${key}.mpd`));
    group.rotation.x = Math.PI;
    group.scale.setScalar(.05);
    group.updateMatrixWorld(true);
    // Bake library coordinates once. Instances share immutable geometry and materials.
    const result = new THREE.Group();
    group.traverse(object => {
      if (!object.isMesh) return;
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      (Array.isArray(object.material)?object.material:[object.material]).forEach(material=>material.fog=false);
      const mesh = new THREE.Mesh(geometry, object.material);
      result.add(mesh);
    });
    result.userData.bounds = new THREE.Box3().setFromObject(result);
    return result;
  })().catch(error => { sources.delete(key); throw error; }));
  return sources.get(key);
}
const COLOR_TR = {'0':'Siyah','1':'Mavi','2':'Yeşil','3':'Turkuaz','4':'Kırmızı','5':'Pembe','6':'Kahverengi','7':'Açık gri','8':'Koyu gri','9':'Açık mavi','10':'Parlak yeşil','11':'Açık turkuaz','12':'Açık kırmızı','13':'Açık pembe','14':'Sarı','15':'Beyaz','19':'Bej','25':'Turuncu','26':'Mor','27':'Limon yeşili','28':'Koyu bej','29':'Açık pembe','70':'Kızıl kahve','71':'Açık gri','72':'Koyu gri','73':'Orta mavi','74':'Orta yeşil','77':'Açık mor','78':'Açık ten','84':'Orta kahve','85':'Koyu mor','86':'Koyu ten','89':'Mavi mor','92':'Ten','115':'Açık limon','118':'Açık mavi','120':'Açık yeşil','125':'Açık turuncu','151':'Kum yeşili','191':'Parlak açık turuncu','212':'Parlak açık mavi','216':'Pas kırmızısı','226':'Açık sarı','272':'Koyu mavi','288':'Koyu yeşil','308':'Koyu kahverengi','320':'Koyu kırmızı','321':'Koyu gök mavisi','322':'Gök mavisi','323':'Açık su yeşili','326':'Sarı yeşil','330':'Zeytin yeşili','334':'Krom altın','366':'Toprak turuncusu','373':'Kum moru','378':'Kum yeşili','379':'Kum mavisi','383':'Krom gümüş','450':'Metalik mavi','462':'Orta turuncu','484':'Koyu turuncu','503':'Çok açık gri','256':'Kauçuk siyah','80':'Metalik gümüş','297':'İnci altın','179':'İnci gümüş','135':'İnci gümüş','47':'Şeffaf','40':'Şeffaf siyah','36':'Şeffaf kırmızı','57':'Şeffaf turuncu','33':'Şeffaf mavi','34':'Şeffaf yeşil'};
export function colorInfo(code, language='tr') {
  const material=library.materialLibrary[String(code)];
  const name=material?.name?.replaceAll('_',' ')||String(code);
  return {hex:material?`#${material.color.getHexString()}`:'#a3a3a3',name:language==='tr'?(COLOR_TR[String(code)]||name):name};
}
export function makePiece(source, color) {
  const group = source.clone(true);
  const replace = material => String(material.userData.code) === '16' ? (library.materialLibrary[String(color)] || material) : material;
  group.traverse(object => {
    if (object.isMesh) {
      object.material = Array.isArray(object.material) ? object.material.map(replace) : replace(object.material);
      object.castShadow = true; object.receiveShadow = true;
    }
  });
  return group;
}
export function applyPose(object, pose) {
  object.position.fromArray(pose.position);
  object.quaternion.fromArray(pose.quaternion);
  object.scale.fromArray(pose.scale || [1,1,1]);
  object.updateMatrixWorld(true);
}
export function poseOf(object) {
  return {position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray()};
}
const conversion = new THREE.Matrix4().makeScale(.05, -.05, -.05);
const inverse = conversion.clone().invert();
export async function prepareModel(raw, onProgress = () => {}) {
  const entries = Object.entries(raw.parts), loaded = {};
  let done = 0, cursor = 0;
  await Promise.all(Array.from({length: Math.min(6, entries.length)}, async () => {
    while (cursor < entries.length) {
      const [key, info] = entries[cursor++];
      loaded[key] = await loadPart(key, info.assetUrl);
      onProgress(++done / entries.length);
    }
  }));
  const bounds = new THREE.Box3();
  const pieces = raw.pieces.map(piece => {
    const matrix = conversion.clone().multiply(new THREE.Matrix4().fromArray(piece.matrix)).multiply(inverse);
    const object = new THREE.Object3D();
    matrix.decompose(object.position, object.quaternion, object.scale);
    bounds.union(loaded[piece.part].userData.bounds.clone().applyMatrix4(matrix));
    return {...piece, ...poseOf(object), bottom:loaded[piece.part].userData.bounds.clone().applyMatrix4(matrix).min.y};
  });
  const center = bounds.getCenter(new THREE.Vector3());
  const offset = new THREE.Vector3(-center.x, -bounds.min.y, -center.z);
  pieces.forEach(piece => {piece.position = new THREE.Vector3().fromArray(piece.position).add(offset).toArray();piece.bottom+=offset.y;});
  const groups = {};
  pieces.forEach(piece => {
    const key = `${piece.part}:${piece.color}`;
    groups[key] ||= {key, part:piece.part, color:piece.color, name:raw.parts[piece.part].name, sourceId:raw.parts[piece.part].sourceId, count:0};
    groups[key].count++;
  });
  return {...raw, pieces, loaded, groups:Object.values(groups), size:bounds.getSize(new THREE.Vector3()).toArray()};
}
export function setupLights(scene, shadows=false) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x969ca6, 2.8));
  const key = new THREE.DirectionalLight(0xffffff, 3.4);
  key.position.set(-50,90,50);key.castShadow=shadows;
  if(shadows){key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:220});key.shadow.normalBias=.03;key.shadow.bias=-.0002;}scene.add(key);
  const fill = new THREE.DirectionalLight(0xc8dbff, 1.1);
  fill.position.set(20,10,-15); scene.add(fill);
}
export function referenceObject(model) {
  // Merge the completed model by material to keep a 1,157-piece reference fluid.
  const materials = new Map();
  model.pieces.forEach(piece => {
    const object = makePiece(model.loaded[piece.part], piece.color);
    applyPose(object, piece);
    object.traverse(mesh => {
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      const groups = geometry.groups.length ? geometry.groups : [{start:0,count:geometry.attributes.position.count,materialIndex:0}];
      groups.forEach(group => {
        const mat = mats[group.materialIndex || 0];
        const src = geometry.index ? geometry.toNonIndexed() : geometry;
        const sub = new THREE.BufferGeometry();
        for (const name of ['position','normal']) {
          const attr = src.getAttribute(name);
          if (attr) sub.setAttribute(name,new THREE.BufferAttribute(attr.array.slice(group.start*3,(group.start+group.count)*3),3));
        }
        if (!sub.getAttribute('normal')) sub.computeVertexNormals();
        if (!materials.has(mat)) materials.set(mat,[]);
        materials.get(mat).push(sub);
      });
      geometry.dispose();
    });
  });
  const result = new THREE.Group();
  materials.forEach((geometries,material) => {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(g => g.dispose());
    if (merged){const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;result.add(mesh);}
  });
  return result;
}
let thumbRenderer, thumbQueue = Promise.resolve();
const thumbCache = new Map();
export function thumbnail(source, color, key, size=180) {
  if (thumbCache.has(key)) return thumbCache.get(key);
  const promise = thumbQueue.then(() => {
    if (!thumbRenderer) {
      thumbRenderer = new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
      thumbRenderer.setPixelRatio(1); thumbRenderer.setClearColor(0xffffff,0);
      thumbRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    }
    const scene = new THREE.Scene(); setupLights(scene);
    const object = color === null ? source : makePiece(source,color); scene.add(object);
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3()), dimensions = box.getSize(new THREE.Vector3());
    const range = Math.max(dimensions.x, dimensions.y, dimensions.z) * .75;
    const camera = new THREE.OrthographicCamera(-range,range,range,-range,.1,1000);
    camera.position.copy(center).add(new THREE.Vector3(40,30,50)); camera.lookAt(center);
    thumbRenderer.setSize(size,size,false); thumbRenderer.render(scene,camera);
    const url = thumbRenderer.domElement.toDataURL('image/png');
    scene.remove(object);
    return url;
  });
  thumbQueue = promise.catch(()=>{}); thumbCache.set(key,promise); return promise;
}
