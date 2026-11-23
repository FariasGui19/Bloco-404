import { createSectorMaterials } from "./sector-materials.js";
import { buildLandmarks } from "./sector-landmarks.js";
import { buildScenery, batchScenery } from "./sector-scenery.js";
import { batchStatic, addCollisionProxies } from "./sector-meshes.js";
import { createEnvironment } from "./environment-view.js";
import * as T from "../vendor/three.module.js";
import {
  SECTOR,
  SECTOR_LAYOUT,
  PLATFORMS,
  SOLIDS,
  rawHeight,
  terrainHeight,
  groundAt,
  clamp,
} from "./sector-data.js";

export function createSector({ environmentProfile } = {}) {
  const scene = new T.Scene();
  const environment = createEnvironment(scene, {
    heightAt: terrainHeight,
    profile: environmentProfile,
  });
  const materials = createSectorMaterials();
  const terrainMat = environment.terrainMaterial;
  const stone = materials.masonry,
    wood = materials.wood,
    teal = materials.teal;
  const chunks = [],
    cameraSolids = [],
    chunkMap = new Map();
  const chunkAt = (x, z) =>
    chunkMap.get(`${Math.floor(x / 32) * 32},${Math.floor(z / 32) * 32}`) ??
    scene;
  function mesh(geo, mat, parent, x, y, z) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  // All terrain is bounded resident geometry. Distance activation reduces draws;
  // frustum culling remains enabled. No network streaming is claimed here.
  for (let cz = -128; cz < 128; cz += 32)
    for (let cx = -128; cx < 128; cx += 32) {
      const group = new T.Group();
      scene.add(group);
      chunkMap.set(`${cx},${cz}`, group);
      const geo = new T.PlaneGeometry(32, 32, 16, 16);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + cx + 16,
          z = pos.getZ(i) + cz + 16,
          y = rawHeight(x, z);
        pos.setXYZ(i, x, y, z);
      }
      environment.applyTerrainUV(geo);
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const terrain = mesh(geo, terrainMat, group, 0, 0, 0);
      cameraSolids.push(terrain);
      chunks.push({ group, x: cx + 16, z: cz + 16 });
    }
  buildScenery(SECTOR_LAYOUT, chunkAt, materials);
  buildFlora();
  // Lote 10: vegetação e totens pintados como billboards (browser apenas).
  function billboard(file) {
    if (typeof document === "undefined" || typeof Image === "undefined")
      return null;
    const tex = new T.Texture();
    const img = new Image();
    img.onload = () => {
      tex.image = img;
      tex.needsUpdate = true;
    };
    img.src = new URL(
      `../../assets/sprites/setor-limiar-lote10/${file}.png`,
      import.meta.url,
    ).href;
    tex.colorSpace = T.SRGBColorSpace;
    tex.magFilter = tex.minFilter = T.NearestFilter;
    tex.generateMipmaps = false;
    tex.userData = { image: img };
    materials.textures.push(tex);
    return tex;
  }
  function buildFlora() {
    const grass = billboard("vegetacao-limiar"),
      totem = billboard("totem-limiar");
    const place = (tex, x, z, h, tint) => {
      if (!tex) return;
      const sprite = new T.Sprite(
        new T.SpriteMaterial({
          map: tex,
          transparent: true,
          alphaTest: 0.12,
          depthWrite: true,
          fog: true,
          color: tint,
        }),
      );
      const y = terrainHeight(x, z);
      sprite.position.set(x, y + 0.02, z);
      sprite.center.set(0.5, 0);
      // A imagem chega depois: ajusta a proporção quando ela carrega.
      const fit = () => {
        const iw = tex.image?.width || 1,
          ih = tex.image?.height || 1;
        sprite.scale.set(h * (iw / ih), h, 1);
      };
      fit();
      const img = tex.userData?.image;
      if (img && !img.complete) img.addEventListener("load", fit, { once: true });
      else if (img) img.onload = () => {
        fit();
      };
      scene.add(sprite);
    };
    let seed = 11;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399963 + rnd() * 0.6,
        r = 9 + rnd() * 22;
      place(grass, Math.cos(a) * r, Math.sin(a) * r, 0.7 + rnd() * 0.6, 0xd8e6d4);
    }
    for (const [x, z] of [
      [7.5, -6.5],
      [-9.5, 5.5],
      [3.5, 12.5],
    ])
      place(totem, x, z, 2.4, 0xf2fff8);
  }
  // Depth-aware pixel water: GPU waves, foam and sky glints, no CPU vertex uploads.
  const waterGeo = new T.PlaneGeometry(850, 850, 40, 40);
  waterGeo.rotateX(-Math.PI / 2);
  const water = mesh(waterGeo, environment.waterMaterial, scene, 0, 0, 0);
  water.renderOrder = 2;
  // Visible seabed, kelp and motes make depth readable below the surface.
  const sand = mesh(
    new T.PlaneGeometry(820, 820),
    new T.MeshLambertMaterial({ color: 0x517581 }),
    scene,
    0,
    -13.5,
    0,
  );
  sand.rotation.x = -Math.PI / 2;
  const bubblesGeo = new T.BufferGeometry(),
    bubblePositions = [];
  for (let i = 0; i < 140; i++)
    bubblePositions.push(
      Math.sin(i * 43) * 95,
      -1 - (i % 12),
      Math.cos(i * 17) * 95,
    );
  bubblesGeo.setAttribute(
    "position",
    new T.Float32BufferAttribute(bubblePositions, 3),
  );
  const motes = new T.Points(
    bubblesGeo,
    new T.PointsMaterial({
      color: 0xafffe7,
      size: 0.13,
      transparent: true,
      opacity: 0.65,
    }),
  );
  scene.add(motes);
  const landmarks = buildLandmarks(scene, SECTOR_LAYOUT, materials);
  const { anchor } = landmarks;
  cameraSolids.push(...landmarks.cameraSurfaces);
  addCollisionProxies(
    [...SOLIDS, ...PLATFORMS],
    (b) => chunkAt(b.x, b.z),
    cameraSolids,
  );
  // Moon + stars, unlit and inexpensive.
  mesh(
    new T.IcosahedronGeometry(8, 2),
    new T.MeshBasicMaterial({ color: 0xffd9b2, fog: false }),
    environment.celestial,
    -125,
    105,
    -180,
  );
  const stars = [];
  for (let i = 0; i < 220; i++) {
    const a = i * 2.39996;
    stars.push(Math.cos(a) * 260, 55 + (i % 53) * 2.5, Math.sin(a) * 260);
  }
  const starsGeo = new T.BufferGeometry();
  starsGeo.setAttribute("position", new T.Float32BufferAttribute(stars, 3));
  environment.celestial.add(
    new T.Points(
      starsGeo,
      new T.PointsMaterial({ color: 0xf5d9ee, size: 0.5, fog: false }),
    ),
  );
  // Navigable launch. Hull is a low-poly tapered boat, not a box.
  const boat = new T.Group();
  scene.add(boat);
  const hullShape = new T.Shape();
  hullShape.moveTo(0, 3);
  hullShape.lineTo(1.3, 1.3);
  hullShape.lineTo(1.15, -2.3);
  hullShape.lineTo(-1.15, -2.3);
  hullShape.lineTo(-1.3, 1.3);
  hullShape.closePath();
  const hull = new T.Mesh(
    new T.ExtrudeGeometry(hullShape, {
      depth: 0.85,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.25,
      bevelThickness: 0.18,
    }),
    wood,
  );
  hull.rotation.x = -Math.PI / 2;
  boat.add(hull);
  mesh(new T.BoxGeometry(1.3, 1.2, 1.6), stone, boat, 0, 1.1, -0.7);
  mesh(new T.BoxGeometry(1.0, 0.45, 0.08), teal, boat, 0, 1.35, 0.13);
  const mast = mesh(
    new T.CylinderGeometry(0.065, 0.09, 4, 5),
    wood,
    boat,
    0,
    2,
    0.7,
  );
  const sailShape = new T.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0, 3);
  sailShape.lineTo(1.5, 0.1);
  sailShape.closePath();
  const sail = mesh(
    new T.ShapeGeometry(sailShape),
    new T.MeshLambertMaterial({ color: 0xe5c1a3, side: T.DoubleSide }),
    boat,
    0,
    1,
    0.7,
  );
  boat.position.set(SECTOR.boat.x, 0.25, SECTOR.boat.z);
  const shadow = mesh(
    new T.CircleGeometry(0.62, 20),
    new T.MeshBasicMaterial({
      color: 0x172333,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
    scene,
    0,
    0,
    0,
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = 3;
  batchScenery(chunks);
  batchStatic(scene, new Set([shadow, water]));
  scene.updateMatrixWorld(true);
  function update(c, t, reducedMotion = false) {
    for (const chunk of chunks)
      chunk.group.visible = Math.hypot(c.x - chunk.x, c.z - chunk.z) < 112;
    landmarks.update(t, reducedMotion);
    materials.update(t, reducedMotion);
    environment.update(t);
    const ground =
      c.y < -0.3
        ? terrainHeight(c.x, c.z)
        : Math.max(groundAt(c.x, c.z, c.y + 0.1), 0);
    shadow.position.set(c.x, ground + 0.06, c.z);
    shadow.scale.setScalar(1 + Math.min(25, Math.max(0, c.y - ground)) * 0.035);
    shadow.material.opacity = clamp(0.38 - (c.y - ground) * 0.003, 0.12, 0.38);
    shadow.visible = !c.boating;
    if (c.boating) {
      boat.position.set(c.x, 0.2, c.z);
      boat.rotation.y = c.yaw;
    }
    boat.rotation.z = Math.sin(t * 1.4) * 0.035;
    boat.position.y = 0.2 + Math.sin(t * 1.2) * 0.07;
    motes.position.y = (t * 0.16) % 1;
  }
  return {
    scene,
    chunks,
    cameraSolids,
    boat,
    anchor,
    landmarks,
    layout: SECTOR_LAYOUT,
    update,
    environment,
    textures: [...materials.textures, ...environment.textures],
  };
}
