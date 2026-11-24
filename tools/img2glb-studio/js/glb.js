import * as THREE from '../../../js/vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

const MAX_BYTES = 100 * 1024 * 1024;
const unsupported = new Set(['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu']);

// Checa o container e impede requisições externas feitas pelo GLTFLoader.
export function inspectGLB(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20 || buffer.byteLength > MAX_BYTES) throw new Error('Use um GLB válido de até 100 MiB.');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) throw new Error('Arquivo inválido. Selecione um GLB 2.0 completo.');
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || length > buffer.byteLength - 20) throw new Error('O GLB não contém um JSON válido.');
  let json;
  try { json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length)).trim()); }
  catch { throw new Error('Não foi possível ler o conteúdo do GLB.'); }
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('O conteúdo do GLB é inválido.');
  for (const resource of [...(json.buffers || []), ...(json.images || [])]) {
    if (resource.uri && !resource.uri.startsWith('data:')) throw new Error('Este GLB depende de arquivos externos. Exporte novamente com recursos incorporados.');
  }
  for (const extension of json.extensionsRequired || []) {
    if (unsupported.has(extension)) throw new Error(`Extensão ${extension} não suportada neste laboratório. Exporte sem essa compressão.`);
  }
  return json;
}

export function disposeModel(root) {
  const geometry = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometry.add(object.geometry);
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometry.forEach(x => x.dispose()); materials.forEach(x => x.dispose());
  textures.forEach(x => { x.source?.data?.close?.(); x.dispose(); });
}

export async function loadGLB(buffer) {
  inspectGLB(buffer);
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => {
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    throw new Error('O GLB requer um recurso externo.');
  });
  const gltf = await new GLTFLoader(manager).parseAsync(buffer, '');
  const model = gltf.scene;
  try {
    let meshes = 0, skins = 0, bones = 0;
    model.traverse(object => { if (object.isMesh) meshes++; if (object.isSkinnedMesh) skins++; if (object.isBone) bones++; });
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true), size = box.getSize(new THREE.Vector3());
    if (!meshes || box.isEmpty() || !Number.isFinite(size.y) || size.y < 1e-6 || ![size.x, size.z, box.min.y].every(Number.isFinite)) throw new Error('O GLB não contém uma malha com dimensões válidas.');
    const center = box.getCenter(new THREE.Vector3()), height = 1.85;
    // Não altera a raiz animada: a compensação é aplicada no pai, fora do rig.
    const offset = new THREE.Group(), pivot = new THREE.Group();
    offset.position.set(-center.x, -box.min.y, -center.z);
    offset.add(model); pivot.add(offset); pivot.scale.setScalar(height / size.y);
    const mixer = new THREE.AnimationMixer(model);
    return { pivot, model, mixer, clips: gltf.animations, meshes, skins, bones, originalHeight: size.y };
  } catch (error) { disposeModel(model); throw error; }
}

export function findClip(clips, kind) {
  const patterns = {
    idle: /(^|[^a-z])(idle|standing|stand|parad[oa])([^a-z]|$)/i,
    walk: /(^|[^a-z])(walk|walking|andar|caminhada)([^a-z]|$)/i,
    run: /(^|[^a-z])(run|running|correr|corrida)([^a-z]|$)/i,
  };
  return clips.find(clip => patterns[kind].test(clip.name)) || null;
}
