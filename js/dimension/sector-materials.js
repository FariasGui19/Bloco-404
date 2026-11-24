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
  // Lote 10: texturas pintadas substituem os tiles procedurais quando há DOM.
  // Sem document (testes em Node) o fallback procedural continua valendo.
  function painted(file, fallback, repeat, folder = "setor-limiar-lote10") {
    if (typeof document === "undefined" || typeof Image === "undefined")
      return fallback;
    const tex = new T.Texture();
    const img = new Image();
    img.onload = () => {
      tex.image = img;
      tex.needsUpdate = true;
    };
    img.src = new URL(
      `../../assets/textures/${folder}/${file}.png`,
      import.meta.url,
    ).href;
    tex.colorSpace = T.SRGBColorSpace;
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.magFilter = tex.minFilter = T.NearestFilter;
    tex.generateMipmaps = false;
    tex.name = "limiar-" + file;
    textures.push(tex);
    return tex;
  }
  const wallPainting = painted("parede-ruina", wall, 3);
  const floorPainting = painted("piso-ruina", floor, 4);
  const gratePainting = painted("grade-limiar", null, 3);
  const mossPainting = painted("musgo-limiar", null, 2);
  // Lote 11: trilha, ponte, água e a runa que acende os pilares.
  const lot11 = "setor-limiar-lote11";
  const trailPainting = painted("piso-trilha", null, 1, lot11);
  const plankPainting = painted("ponte-madeira", null, 2, lot11);
  const waterPainting = painted("agua-limiar", null, 26, lot11);
  const sigilPainting = painted("runa-brilho", null, 1, lot11);
  const lambert = (color, map = null) =>
    new T.MeshLambertMaterial({ color, map, flatShading: true });
  const wind = { value: 0 },
    windStrength = { value: 1 };
  const foliage = new T.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  foliage.onBeforeCompile = (shader) => {
    shader.uniforms.limiarTime = wind;
    shader.uniforms.limiarWind = windStrength;
    shader.vertexShader =
      "uniform float limiarTime; uniform float limiarWind; varying vec3 limiarLeaf;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      limiarLeaf=(modelMatrix*vec4(position,1.)).xyz;
      transformed.x+=sin(limiarTime*1.3+limiarLeaf.z*.65+limiarLeaf.x*.3)*.065*limiarWind;
      transformed.z+=sin(limiarTime*.8+limiarLeaf.x*.6)*.035*limiarWind;`,
    );
    shader.fragmentShader =
      "varying vec3 limiarLeaf;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec3 cell=floor(limiarLeaf*12.);
      float grain=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
      float leafPatch=step(.57,grain);
      diffuseColor.rgb*=.89+leafPatch*.19;`,
    );
  };
  foliage.customProgramCacheKey = () => "limiar-leaf-pixels-wind-v1";
  return {
    update(t, reduced = false) {
      wind.value = t;
      windStrength.value = reduced ? 0 : 1;
    },
    textures,
    // Texturas do lote 11 que outros módulos usam direto (sprites aditivos).
    sigilTexture: sigilPainting,
    masonry: lambert(0xcbd2da, wallPainting),
    floor: lambert(0xb7c5ce, floorPainting),
    moss: mossPainting ? lambert(0xa9c6b5, mossPainting) : lambert(0x6f9c83),
    wood: lambert(0xc8b9a4, wood),
    // Prancha pintada da ponte: só assume o mapa quando a imagem carregou.
    plank: lambert(0xc2ab90, plankPainting),
    trail: trailPainting
      ? new T.MeshLambertMaterial({
          color: 0xffffff,
          map: trailPainting,
          emissive: 0x33413c,
          flatShading: true,
        })
      : lambert(0xd6dee0),
    seabed: lambert(0x8fb0b4, waterPainting),
    trim: lambert(0x3c4b60),
    copper: lambert(0xba8e68),
    iron: lambert(gratePainting ? 0x8fa4ac : 0x263748, gratePainting),
    foliage,
    rock: new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    teal: new T.MeshBasicMaterial({ color: 0x8df4d7 }),
    violet: new T.MeshBasicMaterial({ color: 0xc3a0eb }),
    amber: new T.MeshBasicMaterial({ color: 0xffdaa1 }),
  };
}
