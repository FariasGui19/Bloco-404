import * as T from "../vendor/three.module.js";
import { hash2 } from "./environment-data.js";
export function createSectorMaterials() {
  const textures = [];
  function tile(kind) {
    const size = 128,
      data = new Uint8Array(size * size * 4);
    for (let z = 0; z < size; z++)
      for (let x = 0; x < size; x++) {
        const row = Math.floor(z / 16),
          xx = (x + (row % 2) * 16) % 128,
          brick = Math.floor(xx / 32),
          mortar = xx % 32 < 2 || z % 16 < 2;
        const base = hash2(brick, row, 17),
          grain = hash2(Math.floor(x / 2), Math.floor(z / 2), 33);
        let rgb;
        if (kind === "masonry") {
          const s =
            (mortar ? 0.57 : 0.87 + base * 0.24) + (grain - 0.5) * 0.045;
          rgb = [119 * s, 126 * s, 143 * s];
        } else if (kind === "wood") {
          const seam = x % 16 < 2,
            board = hash2(Math.floor(x / 16), 0, 71),
            line = Math.sin(z * 0.14 + Math.sin(x * 0.4) * 2) * 0.035;
          const s = (seam ? 0.48 : 0.78 + board * 0.28) + line;
          rgb = [146 * s, 116 * s, 88 * s];
          if (x % 16 === 4 && (z === 8 || z === 116)) rgb = [53, 60, 65];
        } else {
          const tx = (x + (Math.floor(z / 32) % 2) * 12) % 128,
            gap = tx % 32 < 2 || z % 32 < 2,
            s = gap
              ? 0.52
              : 0.86 +
                hash2(Math.floor(tx / 32), Math.floor(z / 32), 91) * 0.22;
          rgb = [118 * s, 125 * s, 133 * s];
        }
        const i = (z * size + x) * 4;
        for (let k = 0; k < 3; k++) data[i + k] = Math.round(rgb[k]);
        data[i + 3] = 255;
      }
    const t = new T.DataTexture(data, size, size);
    t.colorSpace = T.SRGBColorSpace;
    t.magFilter = t.minFilter = T.NearestFilter;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    t.name = "limiar-" + kind;
    textures.push(t);
    return t;
  }
  const wall = tile("masonry"),
    wood = tile("wood"),
    floor = tile("flagstone");
  const lambert = (color, map = null) =>
    new T.MeshLambertMaterial({ color, map, flatShading: true });
  return {
    textures,
    masonry: lambert(0xcbd2da, wall),
    floor: lambert(0xb7c5ce, floor),
    wood: lambert(0xc8b9a4, wood),
    trim: lambert(0x3c4b60),
    copper: lambert(0xba8e68),
    iron: lambert(0x263748),
    foliage: new T.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    }),
    rock: new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    teal: new T.MeshBasicMaterial({ color: 0x8df4d7 }),
    violet: new T.MeshBasicMaterial({ color: 0xc3a0eb }),
    amber: new T.MeshBasicMaterial({ color: 0xffdaa1 }),
  };
}
