import * as T from "../vendor/three.module.js";
import { loadFrames } from "./sprite-frames.js";

// Lote 12: poeira do passo. O som já existia; o mundo não respondia ao pé.
// Um pool fixo de sprites (nada é criado durante o jogo) solta uma nuvem curta
// a cada passo, avançando os seis quadros da tira conforme a vida do puff.
const LIFE = 0.5;

export function createFootfall(scene, { pool = 10, scale = 1 } = {}) {
  const frames = loadFrames("poeira-passo", 6);
  if (!scene || !frames.length) {
    return {
      spawn() {},
      update() {},
      dispose() {},
      get ready() {
        return false;
      },
    };
  }
  const group = new T.Group();
  group.name = "footfall-dust";
  scene.add(group);
  const puffs = Array.from({ length: pool }, () => {
    const sprite = new T.Sprite(
      new T.SpriteMaterial({
        map: frames[0],
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: true,
      }),
    );
    sprite.center.set(0.5, 0.12);
    sprite.visible = false;
    group.add(sprite);
    return { sprite, age: LIFE, frame: 0 };
  });
  let cursor = 0;
  return {
    ready: true,
    spawn(x, y, z, size = 1) {
      const puff = puffs[cursor++ % puffs.length];
      puff.age = 0;
      puff.frame = 0;
      puff.size = size * scale;
      puff.sprite.position.set(x, y + 0.02, z);
      puff.sprite.visible = true;
      puff.sprite.material.opacity = 0.8;
      puff.sprite.material.map = frames[0];
      puff.sprite.material.rotation = (cursor * 1.7) % 6.2832;
    },
    update(dt) {
      for (const puff of puffs) {
        if (!puff.sprite.visible) continue;
        puff.age += dt;
        const t = Math.min(1, puff.age / LIFE);
        const index = Math.min(frames.length - 1, Math.floor(t * frames.length));
        if (index !== puff.frame) {
          puff.frame = index;
          puff.sprite.material.map = frames[index];
        }
        puff.sprite.scale.setScalar(puff.size * (0.34 + t * 0.5));
        puff.sprite.material.opacity = 0.8 * (1 - t) * (1 - t);
        if (t >= 1) puff.sprite.visible = false;
      }
    },
    dispose() {
      group.removeFromParent();
      for (const puff of puffs) puff.sprite.material.dispose();
    },
  };
}
