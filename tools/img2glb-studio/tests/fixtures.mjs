export function glb(json, bin = Buffer.alloc(0)) {
  let chunk = Buffer.from(JSON.stringify(json));
  chunk = Buffer.concat([chunk, Buffer.alloc((4 - chunk.length % 4) % 4, 0x20)]);
  bin = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
  const total = 20 + chunk.length + (bin.length ? 8 + bin.length : 0);
  const out = Buffer.alloc(total); out.write('glTF'); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  out.writeUInt32LE(chunk.length, 12); out.write('JSON', 16); chunk.copy(out, 20);
  if (bin.length) { out.writeUInt32LE(bin.length, 20 + chunk.length); out.write('BIN\0', 24 + chunk.length); bin.copy(out, 28 + chunk.length); }
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}
export function sample() {
  // Triângulo skinned com um osso e translação animada; tudo incorporado.
  const binary = Buffer.alloc(116);
  [0,0,0, 1,0,0, 0,2,0].forEach((n,i) => binary.writeFloatLE(n, i*4));
  // 3 conjuntos de JOINTS_0 (zeros) em 36..47.
  [1,0,0,0, 1,0,0,0, 1,0,0,0].forEach((n,i) => binary.writeFloatLE(n, 48 + i*4));
  binary.writeFloatLE(0, 96); binary.writeFloatLE(1, 100);
  // Accessor de translação: dois vetores VEC3, começa no offset 104.
  const extra = Buffer.alloc(12); extra.writeFloatLE(0.5, 4);
  const bytes = Buffer.concat([binary, extra]);
  return glb({ asset:{version:'2.0'}, buffers:[{byteLength:128}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:12},{buffer:0,byteOffset:48,byteLength:48},{buffer:0,byteOffset:96,byteLength:8},{buffer:0,byteOffset:104,byteLength:24}],
    accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,2,0]},{bufferView:1,componentType:5121,count:3,type:'VEC4'},{bufferView:2,componentType:5126,count:3,type:'VEC4'},{bufferView:3,componentType:5126,count:2,type:'SCALAR',min:[0],max:[1]},{bufferView:4,componentType:5126,count:2,type:'VEC3'}],
    meshes:[{primitives:[{attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2}}]}], nodes:[{mesh:0,skin:0},{name:'Bone'}], skins:[{joints:[1]}], scenes:[{nodes:[0,1]}],scene:0,
    animations:[{name:'Idle',samplers:[{input:3,output:4}],channels:[{sampler:0,target:{node:1,path:'translation'}}]}] }, bytes);
}
