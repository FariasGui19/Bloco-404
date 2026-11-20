import assert from "node:assert/strict";
import * as T from "../js/vendor/three.module.js";
import { createOperator, OPERATOR_STYLES } from "../js/dimension/operator.js";
import { loftGeometry } from "../js/dimension/operator-sculpt.js";
const base = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  speed: 0,
  grounded: true,
  mode: "TERRA",
};
const reports = {};
for (const id of Object.keys(OPERATOR_STYLES)) {
  const progress = { archetype: id },
    player = { equippedSuit: ({ motor_bio_forja: "bio_forja", mare_astral: "mare", lamina_dominio_anciao: "dominio" })[id] },
    before = JSON.stringify({ progress, player });
  const op = createOperator(progress, player);
  op.animate(base, 0);
  op.root.updateMatrixWorld(true);
  assert.equal(
    JSON.stringify({ progress, player }),
    before,
    "sculpture cannot mutate simulation/save",
  );
  const spec = op.root.userData.sculpt;
  assert.equal(spec.revision, "3B.2");
  assert(spec.headWidth < 0.35 && spec.headHeight < 0.4);
  const head = op.root.getObjectByName("operator-head"),
    face = op.root.getObjectByName("sculpted-face");
  assert(head && face);
  face.geometry.computeBoundingBox();
  const faceSize = face.geometry.boundingBox.getSize(new T.Vector3());
  assert(faceSize.z > 0.2, "face is a sculpted volume, not a portrait card");
  assert(faceSize.x < 0.34 && faceSize.y > 0.35);
  assert.equal(
    face.geometry.groups.length,
    2,
    "front portrait UVs do not repeat on the back",
  );
  // Box3 also includes hidden action geometry: measure the visible rest pose separately.
  const visibleBounds = new T.Box3();
  let triangles = 0,
    calls = 0;
  const maps = new Set();
  op.root.traverse((o) => {
    if (!o.isMesh) return;
    for (const attr of Object.values(o.geometry.attributes))
      for (const v of attr.array) assert(Number.isFinite(v));
    assert.notEqual(
      o.geometry.type,
      "BoxGeometry",
      "no box-based face, torso or boots",
    );
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (m?.map) {
        assert.equal(m.map.magFilter, T.NearestFilter);
        assert.equal(m.map.minFilter, T.NearestFilter);
        assert.equal(m.map.generateMipmaps, false);
        maps.add(m.map);
      }
    for (let parent = o; parent; parent = parent.parent)
      if (!parent.visible) return;
    o.geometry.computeBoundingBox();
    visibleBounds.union(
      o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld),
    );
    triangles +=
      (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    calls += Array.isArray(o.material) ? o.geometry.groups.length : 1;
  });
  assert.equal(maps.size, 3, "bounded three shared pixel maps per rig");
  assert(
    visibleBounds.min.y >= -0.015 && visibleBounds.min.y <= 0.02,
    "boots meet the controller ground plane",
  );
  assert(
    visibleBounds.max.y < 2.1 && visibleBounds.max.y > 1.85,
    "sculpt remains in the existing camera/controller envelope",
  );
  assert(
    triangles < (id === "motor_bio_forja" ? 7000 : 6600) && calls < 55,
    "explicit per-rig geometry/draw budget",
  );
  if (id === "nucleo_dez_forma")
    assert(
      op.root.getObjectByName("x10-bracelet"),
      "circular bracelet remains an inspectable rigid group",
    );
  reports[id] = {
    width: +visibleBounds.getSize(new T.Vector3()).x.toFixed(3),
    height: +visibleBounds.max.y.toFixed(3),
    triangles,
    calls,
  };
  for (const mode of [
    { grounded: false, flying: true, speed: 20 },
    { grounded: false, mode: "SUBMERSO", speed: 6 },
    { grounded: false, vy: 8 },
    { boating: true },
  ])
    for (let f = 1; f < 45; f++) op.animate({ ...base, ...mode }, f / 60);
}
assert(
  reports.motor_bio_forja.width > reports.mare_astral.width * 1.15,
  "Bio and Maré must differ in silhouette, not only colour",
);
// Check winding independently: frontmost face normals must point outwards.
const g = loftGeometry(
  [
    [0, 0.2, 0.15],
    [1, 0.2, 0.15],
  ],
  12,
);
const p = g.attributes.position,
  n = g.attributes.normal;
for (let i = 0; i < p.count; i++)
  if (p.getZ(i) > 0.149 && p.getY(i) === 0) assert(n.getZ(i) > 0);
console.log(
  "Sculpt 3B.2: volumetric face, proportional envelope, planted boots, distinct silhouettes, nearest UVs, bounded rigs and unchanged animation contract OK.",
  reports,
);
