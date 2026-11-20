import * as T from "../vendor/three.module.js";
import {
  PLATFORMS,
  SOLIDS,
  terrainHeight,
  PIER_RAMP,
  pierRampHeight,
} from "./sector-data.js";
import {
  addMesh,
  box,
  cylinder,
  chamferSlab,
  batchStatic,
  metricUV,
} from "./sector-meshes.js";

export function buildLandmarks(scene, layout, m) {
  const roots = new Map(),
    cameraSurfaces = [];
  function root(id) {
    const g = new T.Group();
    g.name = id;
    g.userData.poi = layout.pois.find((p) => p.id === id);
    scene.add(g);
    roots.set(id, g);
    return g;
  }
  const pier = root("limiar.harbor");
  const rampGeometry = new T.PlaneGeometry(PIER_RAMP.w, 6, 5, 12);
  rampGeometry.rotateX(-Math.PI / 2);
  const rp = rampGeometry.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i) - 16,
      z = rp.getZ(i) + 37;
    rp.setXYZ(i, x, pierRampHeight(x, z), z);
  }
  rampGeometry.computeVertexNormals();
  addMesh(pier, metricUV(rampGeometry), m.wood);
  const rampProxy = new T.Mesh(rampGeometry.clone(), m.iron);
  rampProxy.visible = false;
  rampProxy.userData.cameraOnly = true;
  pier.add(rampProxy);
  cameraSurfaces.push(rampProxy); // walkable authored bridge ramp, not a terrain deformation

  chamferSlab(pier, m.wood, 7, 0.5, 24, -16, 5.05, 52, 0.15);
  for (let z = 40.5; z < 64; z += 0.7) {
    const plank = box(pier, m.wood, 6.96, 0.07, 0.65, -16, 5.285, z),
      p = plank.geometry.attributes.position,
      n = plank.geometry.attributes.normal,
      uv = plank.geometry.attributes.uv;
    for (let i = 0; i < p.count; i++)
      if (Math.abs(n.getY(i)) > 0.5)
        uv.setXY(i, 0.0655 + (p.getZ(i) / 0.65) * 0.085, p.getX(i) / 2);
  }
  for (const x of [-19, -13])
    for (const z of [43, 49, 55, 61]) {
      cylinder(pier, m.wood, 0.17, 0.24, 10.2, x, 2.25, z, 6);
      for (const y of [4.95, 5.35, 6.5])
        cylinder(pier, m.iron, 0.23, 0.23, 0.12, x, y, z, 6);
      box(pier, m.iron, 0.52, 0.1, 0.52, x, 6.6, z);
      box(pier, m.amber, 0.3, 0.46, 0.3, x, 6.89, z);
      for (const dx of [-0.21, 0.21])
        for (const dz of [-0.21, 0.21])
          box(pier, m.iron, 0.045, 0.6, 0.045, x + dx, 6.93, z + dz);
      addMesh(
        pier,
        new T.ConeGeometry(0.43, 0.26, 4),
        m.copper,
        x,
        7.3,
        z,
      ).rotation.y = Math.PI / 4;
    }
  for (const x of [-19.15, -12.85])
    for (const y of [5.65, 6.35]) box(pier, m.wood, 0.13, 0.12, 17, x, y, 50.5);
  for (const x of [-18.4, -13.6]) {
    box(pier, m.iron, 0.45, 0.3, 0.45, x, 5.48, 62);
    cylinder(pier, m.copper, 0.14, 0.2, 0.65, x, 5.8, 62, 6);
    // Coiled mooring line, not a spherical placeholder lamp.
    addMesh(
      pier,
      new T.TorusGeometry(0.38, 0.065, 4, 12),
      m.wood,
      x,
      5.38,
      60.8,
    ).rotation.x = -Math.PI / 2;
  }
  // Landmark nameboard uses a recognisable notched crest, not new quest UI.
  box(pier, m.wood, 2.1, 0.75, 0.12, -20, 6.25, 42);
  box(pier, m.teal, 0.65, 0.09, 0.15, -20, 6.27, 42.08);

  const lighthouse = root("limiar.lighthouse"),
    lx = 40,
    lz = -21,
    ly = terrainHeight(lx, lz);
  cylinder(lighthouse, m.floor, 3.0, 3.0, 0.65, lx, ly + 0.1, lz, 10);
  cylinder(lighthouse, m.masonry, 2.25, 2.95, 23.5, lx, ly + 11.9, lz, 12);
  for (const [h, r] of [
    [1, 3.0],
    [7.8, 2.8],
    [15, 2.57],
    [23.3, 2.4],
  ])
    cylinder(lighthouse, m.trim, r, r, 0.28, lx, ly + h, lz, 12);
  for (const h of [5, 11, 18])
    for (const a of [0, Math.PI * 0.75, Math.PI * 1.5]) {
      const r = 2.95 - h * 0.03,
        x = lx + Math.sin(a) * r,
        z = lz + Math.cos(a) * r;
      const frame = box(lighthouse, m.trim, 0.76, 1.5, 0.18, x, ly + h, z);
      frame.rotation.y = a;
      const slit = box(
        lighthouse,
        m.amber,
        0.32,
        0.95,
        0.2,
        x + Math.sin(a) * 0.05,
        ly + h,
        z + Math.cos(a) * 0.05,
      );
      slit.rotation.y = a;
    }
  const door = box(
    lighthouse,
    m.iron,
    1.35,
    2.5,
    0.17,
    lx,
    ly + 1.5,
    lz + 2.96,
  );
  box(lighthouse, m.copper, 1.7, 0.17, 0.24, lx, ly + 2.8, lz + 3.04);
  cylinder(lighthouse, m.floor, 3.8, 3.65, 0.7, lx, ly + 24, lz, 12);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    cylinder(
      lighthouse,
      m.iron,
      0.055,
      0.055,
      1.15,
      lx + Math.sin(a) * 3.5,
      ly + 24.9,
      lz + Math.cos(a) * 3.5,
      4,
    );
  }
  addMesh(
    lighthouse,
    new T.TorusGeometry(3.5, 0.065, 4, 24),
    m.iron,
    lx,
    ly + 25.45,
    lz,
  ).rotation.x = -Math.PI / 2;
  cylinder(lighthouse, m.copper, 1.95, 2.2, 0.25, lx, ly + 24.65, lz, 10);
  cylinder(lighthouse, m.amber, 1.6, 1.6, 2.5, lx, ly + 26, lz, 10);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    cylinder(
      lighthouse,
      m.iron,
      0.08,
      0.08,
      2.8,
      lx + Math.sin(a) * 1.75,
      ly + 26,
      lz + Math.cos(a) * 1.75,
      4,
    );
  }
  addMesh(
    lighthouse,
    new T.ConeGeometry(2.8, 2.1, 10),
    m.copper,
    lx,
    ly + 28.4,
    lz,
  );
  cylinder(lighthouse, m.iron, 0.055, 0.1, 2, lx, ly + 30, lz, 5);
  const beamPivot = new T.Group();
  beamPivot.position.set(lx, ly + 26, lz);
  lighthouse.add(beamPivot);
  const beam = addMesh(
    beamPivot,
    new T.ConeGeometry(7, 85, 12, 1, true),
    new T.MeshBasicMaterial({
      color: 0xffe5ac,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
    }),
    0,
    0,
    42.5,
  );
  beam.rotation.x = -Math.PI / 2;
  const lamp = new T.PointLight(0xffd89a, 45, 32, 2);
  lamp.position.set(lx, ly + 26, lz);
  lighthouse.add(lamp);

  const summit = root("limiar.anchor"),
    ax = 22,
    az = -28,
    ay = terrainHeight(ax, az);
  chamferSlab(summit, m.floor, 6, 0.85, 6, ax, ay + 0.125, az, 0.65);
  chamferSlab(summit, m.trim, 6.15, 0.14, 6.15, ax, ay + 0.42, az, 0.65);
  for (const r of [1.8, 2.45])
    addMesh(
      summit,
      new T.TorusGeometry(r, 0.045, 4, 24),
      m.teal,
      ax,
      ay + 0.57,
      az,
    ).rotation.x = -Math.PI / 2;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    box(
      summit,
      i % 3 ? m.trim : m.violet,
      0.12,
      0.035,
      0.32,
      ax + Math.sin(a) * 2.65,
      ay + 0.58,
      az + Math.cos(a) * 2.65,
    ).rotation.y = a;
  }
  for (const x of [18.75, 25.25])
    for (const z of [-30, -26]) {
      cylinder(summit, m.trim, 0.25, 0.4, 4.8, x, ay + 2.1, z, 5);
      addMesh(summit, new T.OctahedronGeometry(0.34), m.teal, x, ay + 4.7, z);
    }
  const anchor = addMesh(
    summit,
    new T.OctahedronGeometry(1.25),
    m.teal,
    ax,
    ay + 3.1,
    az,
  );
  const ring = addMesh(
    summit,
    new T.TorusGeometry(2.25, 0.09, 5, 32),
    m.violet,
    ax,
    ay + 3,
    az,
  );
  ring.rotation.x = 0.35;
  const coreLight = new T.PointLight(0x66ffe0, 25, 16, 2);
  coreLight.position.set(ax, ay + 3, az);
  summit.add(coreLight);

  const ruins = root("limiar.ruins");
  for (const p of PLATFORMS.filter((p) => p.id.startsWith("ruin-"))) {
    chamferSlab(
      ruins,
      m.floor,
      p.w,
      p.top - p.bottom,
      p.d,
      p.x,
      (p.top + p.bottom) / 2,
      p.z,
      0.5,
    );
    chamferSlab(
      ruins,
      m.trim,
      p.w + 0.08,
      0.12,
      p.d + 0.08,
      p.x,
      p.top - 0.13,
      p.z,
      0.5,
    );
    const shard = addMesh(
      ruins,
      new T.DodecahedronGeometry(1.5, 0),
      m.trim,
      p.x,
      p.bottom - 1,
      p.z,
    );
    shard.scale.set(1.2, 1.15, 1.2);
    for (const dx of [-1.65, 1.65])
      box(ruins, m.violet, 0.12, 0.06, 0.55, p.x + dx, p.top + 0.025, p.z);
    cylinder(ruins, m.trim, 0.33, 0.48, 0.2, p.x, p.top + 0.08, p.z, 6);
    addMesh(
      ruins,
      new T.OctahedronGeometry(0.24),
      m.violet,
      p.x,
      p.top + 0.55,
      p.z,
    );
  }
  for (const s of SOLIDS.filter((s) => s.id.startsWith("pillar-"))) {
    cylinder(ruins, m.floor, 0.76, 0.78, 0.3, s.x, s.bottom + 0.1, s.z, 6);
    cylinder(
      ruins,
      m.masonry,
      0.59,
      0.69,
      s.top - s.bottom - 0.5,
      s.x,
      (s.top + s.bottom) / 2 - 0.1,
      s.z,
      7,
    );
    chamferSlab(ruins, m.floor, 1.5, 0.4, 1.5, s.x, s.top - 0.1, s.z, 0.2);
    box(ruins, m.violet, 0.09, 0.55, 0.03, s.x, s.top - 1.3, s.z + 0.63);
  }
  const rift = root("limiar.rift");
  const hoop = new T.Group();
  hoop.position.set(-58, 23, -45);
  hoop.rotation.set(0, 0.35, 0.35);
  rift.add(hoop);
  for (const a of [0, Math.PI * 0.6, Math.PI * 1.2]) {
    const segment = addMesh(
      hoop,
      new T.TorusGeometry(11, 0.65, 5, 12, Math.PI * 0.49),
      m.floor,
    );
    segment.rotation.z = a;
    const inset = addMesh(
      hoop,
      new T.TorusGeometry(10.6, 0.07, 4, 12, Math.PI * 0.47),
      m.violet,
    );
    inset.rotation.z = a;
  }
  batchStatic(hoop);
  // Keep POI roots/metadata; merge only their opaque static children.
  for (const group of roots.values())
    batchStatic(group, new Set([anchor, ring]));
  return {
    roots,
    cameraSurfaces,
    anchor,
    ring,
    beamPivot,
    coreLight,
    lamp,
    update(t) {
      anchor.rotation.y = t * 0.65;
      anchor.position.y = ay + 3.1 + Math.sin(t * 2) * 0.2;
      ring.rotation.z = t * 0.25;
      coreLight.intensity = 22 + Math.sin(t * 2) * 5;
      beamPivot.rotation.y = t * 0.23;
    },
  };
}
