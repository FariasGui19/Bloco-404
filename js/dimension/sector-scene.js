import * as T from "../vendor/three.module.js";
import {
  SECTOR,
  PLATFORMS,
  SOLIDS,
  rawHeight,
  terrainHeight,
  groundAt,
  clamp,
} from "./sector-data.js";

function pixelTexture(colors, size = 32) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const color = new T.Color(
      colors[(((i * 17) ^ ((i >> 3) * 31)) % 97) % colors.length],
    );
    data[i * 4] = Math.round(color.r * 255);
    data[i * 4 + 1] = Math.round(color.g * 255);
    data[i * 4 + 2] = Math.round(color.b * 255);
    data[i * 4 + 3] = 255;
  }
  const tex = new T.DataTexture(data, size, size);
  tex.magFilter = T.NearestFilter;
  tex.minFilter = T.NearestFilter;
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.needsUpdate = true;
  return tex;
}
export function createSector() {
  const scene = new T.Scene();
  scene.background = new T.Color("#454477");
  scene.fog = new T.FogExp2("#66638d", 0.0065);
  scene.add(new T.HemisphereLight(0xb8ccff, 0x524063, 2.0));
  const sun = new T.DirectionalLight(0xffd1aa, 2.4);
  sun.position.set(-50, 70, 25);
  scene.add(sun);
  const grassTex = pixelTexture(["#89947b", "#77846f", "#9d9c7e", "#7f8e78"]);
  const stoneTex = pixelTexture(["#72768e", "#7f8097", "#626880", "#8a869e"]);
  const woodTex = pixelTexture(["#897061", "#a18a70", "#645263"]);
  const terrainMat = new T.MeshLambertMaterial({
    map: grassTex,
    vertexColors: true,
    flatShading: true,
  });
  const stone = new T.MeshLambertMaterial({
    map: stoneTex,
    color: 0xc7bdcc,
    flatShading: true,
  });
  const darkStone = new T.MeshLambertMaterial({
    color: 0x5c587b,
    flatShading: true,
  });
  const wood = new T.MeshLambertMaterial({
    map: woodTex,
    color: 0xd7bac4,
    flatShading: true,
  });
  const teal = new T.MeshBasicMaterial({ color: 0x84ffe0 });
  const pink = new T.MeshBasicMaterial({ color: 0xf1a3ed });
  const chunks = [],
    cameraSolids = [];
  const canopyMaterials = [0x4a7777, 0x628b83, 0x7d9c8b].map(
    (color) => new T.MeshLambertMaterial({ color, flatShading: true }),
  );
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
      const geo = new T.PlaneGeometry(32, 32, 16, 16);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position,
        colors = [];
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + cx + 16,
          z = pos.getZ(i) + cz + 16,
          y = rawHeight(x, z);
        pos.setXYZ(i, x, y, z);
        const color = new T.Color(
          y < 1.5
            ? "#d2b69b"
            : y > 19
              ? "#8fa4a2"
              : y > 9
                ? "#b4b5a1"
                : "#92ad96",
        );
        color.multiplyScalar(0.91 + 0.09 * Math.sin(x * 0.31 + z * 0.27));
        colors.push(color.r, color.g, color.b);
      }
      geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const terrain = mesh(geo, terrainMat, group, 0, 0, 0);
      cameraSolids.push(terrain);
      chunks.push({ group, x: cx + 16, z: cz + 16 });
      // Deterministic per-sector rocks / crooked organic trees, no voxel scenery.
      for (let i = 0; i < 4; i++) {
        const x = cx + 3 + ((i * 13 + Math.abs(cz)) % 26),
          z = cz + 4 + ((i * 7 + Math.abs(cx)) % 24),
          h = terrainHeight(x, z);
        if (
          h < 2 ||
          Math.hypot(x, z - 24) < 9 ||
          Math.hypot(x - 22, z + 28) < 7 ||
          Math.hypot(x - 40, z + 21) < 6
        )
          continue;
        const rock = mesh(
          new T.DodecahedronGeometry(1 + (i % 3) * 0.4, 0),
          stone,
          group,
          x,
          h - 0.15,
          z,
        );
        rock.scale.set(1.3, 0.6, 1);
        rock.rotation.set(i * 0.3, i, 0);
        if (i % 2 === 0 && h < 20) {
          const trunk = mesh(
            new T.CylinderGeometry(0.16, 0.38, 4, 5),
            wood,
            group,
            x + 2,
            h + 1.7,
            z + 1,
          );
          trunk.rotation.z = 0.17;
          for (let j = 0; j < 3; j++) {
            const crown = mesh(
              new T.IcosahedronGeometry(1.9 - j * 0.3, 0),
              canopyMaterials[j],
              group,
              x + 2 + j * 0.3,
              h + 3.5 + j * 0.7,
              z + 1,
            );
            crown.scale.y = 0.65;
          }
        }
      }
    }
  // Sea with crisp moving pixel bands and shallow polygonal waves.
  const seaTex = pixelTexture(
    ["#426b91", "#4d7b9c", "#548aa8", "#426d92", "#77a6b5"],
    64,
  );
  seaTex.repeat.set(36, 36);
  const waterGeo = new T.PlaneGeometry(850, 850, 40, 40);
  waterGeo.rotateX(-Math.PI / 2);
  const water = mesh(
    waterGeo,
    new T.MeshPhongMaterial({
      map: seaTex,
      color: 0xa3bddb,
      shininess: 45,
      specular: 0xb7c4dc,
      transparent: true,
      opacity: 0.83,
      depthWrite: false,
      side: T.DoubleSide,
    }),
    scene,
    0,
    0,
    0,
  );
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
  // Pier and floating ruin stepping route.
  for (const p of PLATFORMS.filter((p) => p.id !== "anchor-dais")) {
    const slab = mesh(
      new T.BoxGeometry(p.w, p.top - p.bottom, p.d),
      p.id === "pier" ? wood : stone,
      scene,
      p.x,
      (p.top + p.bottom) / 2,
      p.z,
    );
    cameraSolids.push(slab);
    if (p.id === "pier") {
      for (const x of [-19, -13])
        for (let z = 43; z <= 63; z += 5) {
          mesh(
            new T.CylinderGeometry(0.18, 0.24, 8, 5),
            wood,
            scene,
            x,
            1.3,
            z,
          );
          mesh(new T.SphereGeometry(0.22, 5, 4), teal, scene, x, 5.6, z);
        }
      for (let z = 41; z < 64; z += 1.2)
        mesh(
          new T.BoxGeometry(7.05, 0.08, 0.08),
          darkStone,
          scene,
          -16,
          5.35,
          z,
        );
    } else {
      const base = mesh(
        new T.ConeGeometry(3.1, 3.8, 5),
        darkStone,
        scene,
        p.x,
        p.bottom - 1.8,
        p.z,
      );
      base.rotation.z = Math.PI;
      mesh(new T.OctahedronGeometry(0.32), teal, scene, p.x, p.top + 0.6, p.z);
    }
  }
  // Ruined colonnade (physical columns correspond exactly to SOLIDS).
  for (const s of SOLIDS.filter((s) => s.id.startsWith("pillar"))) {
    const column = mesh(
      new T.CylinderGeometry(0.65, 0.78, s.top - s.bottom, 6),
      stone,
      scene,
      s.x,
      (s.top + s.bottom) / 2,
      s.z,
    );
    cameraSolids.push(column);
    mesh(new T.BoxGeometry(2.2, 0.5, 2.2), stone, scene, s.x, s.top, s.z);
  }
  // Tall tapered lighthouse, galleries, lantern and rotating volumetric beam.
  const lx = 40,
    lz = -21,
    ly = terrainHeight(lx, lz);
  const tower = mesh(
    new T.CylinderGeometry(2.4, 3, 24, 10),
    stone,
    scene,
    lx,
    ly + 12,
    lz,
  );
  cameraSolids.push(tower);
  for (const h of [2, 8, 15, 23])
    mesh(
      new T.CylinderGeometry(
        2.5 + (23 - h) * 0.026,
        2.5 + (23 - h) * 0.026,
        0.35,
        10,
      ),
      darkStone,
      scene,
      lx,
      ly + h,
      lz,
    );
  mesh(
    new T.CylinderGeometry(3.8, 3.8, 0.65, 10),
    wood,
    scene,
    lx,
    ly + 24,
    lz,
  );
  mesh(
    new T.CylinderGeometry(1.7, 1.7, 3, 8),
    new T.MeshBasicMaterial({
      color: 0xffe7ae,
      transparent: true,
      opacity: 0.8,
    }),
    scene,
    lx,
    ly + 26,
    lz,
  );
  mesh(new T.ConeGeometry(3.2, 2.4, 8), darkStone, scene, lx, ly + 28.5, lz);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    mesh(
      new T.CylinderGeometry(0.08, 0.08, 1.4, 4),
      wood,
      scene,
      lx + Math.sin(a) * 3.5,
      ly + 25,
      lz + Math.cos(a) * 3.5,
    );
  }
  const beamPivot = new T.Group();
  beamPivot.position.set(lx, ly + 26, lz);
  scene.add(beamPivot);
  const beam = mesh(
    new T.ConeGeometry(9, 95, 16, 1, true),
    new T.MeshBasicMaterial({
      color: 0xffe5ac,
      transparent: true,
      opacity: 0.065,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
    }),
    beamPivot,
    0,
    0,
    47.5,
  );
  beam.rotation.x = -Math.PI / 2;
  const lamp = new T.PointLight(0xffd89a, 45, 32, 2);
  lamp.position.set(lx, ly + 26, lz);
  scene.add(lamp);
  // Anchor sanctuary at the summit, rings and three split stone ribs.
  const ax = 22,
    az = -28,
    ay = terrainHeight(ax, az);
  mesh(
    new T.CylinderGeometry(4.4, 5.3, 0.8, 10),
    stone,
    scene,
    ax,
    ay + 0.15,
    az,
  );
  const anchor = mesh(
    new T.OctahedronGeometry(1.25),
    teal,
    scene,
    ax,
    ay + 3.1,
    az,
  );
  const ring = mesh(
    new T.TorusGeometry(2.25, 0.08, 5, 32),
    pink,
    scene,
    ax,
    ay + 3,
    az,
  );
  ring.rotation.x = 0.35;
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094;
    const rib = mesh(
      new T.CylinderGeometry(0.35, 0.65, 5, 5),
      stone,
      scene,
      ax + Math.cos(a) * 3.3,
      ay + 2,
      az + Math.sin(a) * 3.3,
    );
    rib.rotation.z = Math.cos(a) * 0.22;
  }
  const coreLight = new T.PointLight(0x66ffe0, 25, 16, 2);
  coreLight.position.set(ax, ay + 3, az);
  scene.add(coreLight);
  // A distant broken dimensional ring provides a strong horizon landmark.
  const gate = mesh(
    new T.TorusGeometry(11, 0.65, 5, 18, Math.PI * 1.65),
    stone,
    scene,
    -58,
    23,
    -45,
  );
  gate.rotation.z = 0.35;
  gate.rotation.y = 0.35;
  // Moon + stars, unlit and inexpensive.
  mesh(
    new T.IcosahedronGeometry(8, 2),
    new T.MeshBasicMaterial({ color: 0xffd9b2, fog: false }),
    scene,
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
  scene.add(
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
  // Batch static geometry by material, retaining cheap invisible camera proxies.
  // Sector batches preserve distance activation; dynamic landmarks stay separate.
  function batch(parent, exclude = new Set()) {
    const byMaterial = new Map();
    for (const child of [...parent.children])
      if (child.isMesh && !exclude.has(child)) {
        const list = byMaterial.get(child.material) ?? [];
        list.push(child);
        byMaterial.set(child.material, list);
      }
    for (const [material, meshes] of byMaterial) {
      if (meshes.length < 2) continue;
      const parts = meshes.map((m) => {
        m.updateMatrix();
        const g = m.geometry.index
          ? m.geometry.toNonIndexed()
          : m.geometry.clone();
        return g.applyMatrix4(m.matrix);
      });
      const geo = new T.BufferGeometry();
      for (const name of Object.keys(parts[0].attributes).filter((n) =>
        parts.every((g) => g.attributes[n]),
      )) {
        const attributes = parts.map((g) => g.attributes[name]),
          size = attributes[0].itemSize;
        const values = new Float32Array(
          attributes.reduce((n, a) => n + a.array.length, 0),
        );
        let offset = 0;
        for (const a of attributes) {
          values.set(a.array, offset);
          offset += a.array.length;
        }
        geo.setAttribute(name, new T.Float32BufferAttribute(values, size));
      }
      geo.computeBoundingSphere();
      parent.add(new T.Mesh(geo, material));
      for (const g of parts) g.dispose();
      for (const m of meshes) {
        if (cameraSolids.includes(m)) {
          m.visible = false;
          m.userData.cameraOnly = true;
        } else {
          parent.remove(m);
          m.geometry.dispose();
        }
      }
    }
  }
  for (const chunk of chunks) batch(chunk.group);
  batch(scene, new Set([anchor, ring, shadow, water]));
  function update(c, t) {
    for (const chunk of chunks)
      chunk.group.visible = Math.hypot(c.x - chunk.x, c.z - chunk.z) < 112;
    anchor.rotation.y = t * 0.65;
    anchor.position.y = ay + 3.1 + Math.sin(t * 2) * 0.2;
    ring.rotation.z = t * 0.25;
    coreLight.intensity = 22 + Math.sin(t * 2) * 5;
    beamPivot.rotation.y = t * 0.23;
    seaTex.offset.set(t * 0.004, t * 0.002);
    water.position.y = Math.sin(t * 0.7) * 0.04;
    const wave = waterGeo.attributes.position;
    for (let i = 0; i < wave.count; i++)
      wave.setY(
        i,
        Math.sin(wave.getX(i) * 0.12 + t * 0.8) *
          Math.cos(wave.getZ(i) * 0.1 + t * 0.5) *
          0.12,
      );
    wave.needsUpdate = true;
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
    update,
    textures: [grassTex, stoneTex, woodTex, seaTex],
  };
}
