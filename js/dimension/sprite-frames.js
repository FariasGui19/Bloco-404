import * as T from "../vendor/three.module.js";

// Lote 12: as tiras de animação saem do preparador como quadros soltos. Trocar
// `material.map` de um sprite é mais barato que mexer em UV, e cada quadro já
// vem no mesmo canvas com a mesma âncora — então nada treme ao animar.
//
// Sem DOM (testes em Node) as funções devolvem vazio e quem chama mantém o
// sprite estático: nada aqui pode quebrar a simulação.
export function loadFrames(
  base,
  count,
  { folder = "setor-limiar-lote12", root = "../../assets/sprites" } = {},
) {
  if (typeof document === "undefined" || typeof Image === "undefined") return [];
  const frames = [];
  for (let index = 0; index < count; index++) {
    const tex = new T.Texture();
    const img = new Image();
    img.onload = () => {
      tex.image = img;
      tex.needsUpdate = true;
    };
    img.src = new URL(`${root}/${folder}/${base}-${index}.png`, import.meta.url)
      .href;
    tex.colorSpace = T.SRGBColorSpace;
    tex.magFilter = tex.minFilter = T.NearestFilter;
    tex.generateMipmaps = false;
    tex.userData = { image: img, frame: index };
    frames.push(tex);
  }
  return frames;
}

export function frameIndex(frames, time, fps, offset = 0) {
  if (!frames.length) return -1;
  const total = frames.length * fps;
  return Math.floor(((time * fps + offset) % total + total) % total) % frames.length;
}

export function frameAt(frames, time, fps, offset = 0) {
  const index = frameIndex(frames, time, fps, offset);
  return index < 0 ? null : frames[index];
}

// Um flipbook simples para sprites de vida curta (poeira, folhas): ele mesmo
// decidiria o quadro, mas o material fica com quem o usa.
export function createFlipbook(frames, { fps = 12, loop = true } = {}) {
  return {
    frames,
    fps,
    loop,
    frame(time) {
      return frames.length ? frameAt(frames, time, fps) : null;
    },
  };
}
