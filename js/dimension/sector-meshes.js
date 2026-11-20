import * as T from "../vendor/three.module.js";
// Geometry helpers keep texel density in metres BEFORE static batching.
export function metricUV(geometry, metres = 2) {
  const p = geometry.attributes.position,
    n = geometry.attributes.normal,
    uv = geometry.attributes.uv;
  if (!uv || !n) return geometry;
  for (let i = 0; i < p.count; i++) {
    const x = Math.abs(n.getX(i)),
      y = Math.abs(n.getY(i)),
      z = Math.abs(n.getZ(i));
    uv.setXY(
      i,
      (y > x && y > z ? p.getX(i) : x > z ? p.getZ(i) : p.getX(i)) / metres,
      (y > x && y > z ? p.getZ(i) : p.getY(i)) / metres,
    );
  }
  return geometry;
}
export function addMesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const m = new T.Mesh(geometry, material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
export function box(parent, material, w, h, d, x, y, z) {
  return addMesh(
    parent,
    metricUV(new T.BoxGeometry(w, h, d)),
    material,
    x,
    y,
    z,
  );
}
export function cylinder(
  parent,
  material,
  top,
  bottom,
  height,
  x,
  y,
  z,
  sides = 8,
) {
  const geo = new T.CylinderGeometry(top, bottom, height, sides),
    uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      (uv.getX(i) * Math.PI * (top + bottom)) / 2,
      (uv.getY(i) * height) / 2,
    );
  return addMesh(parent, geo, material, x, y, z);
}
export function vertexTint(geometry, color) {
  const c = new T.Color(color),
    values = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < values.length; i += 3) {
    values[i] = c.r;
    values[i + 1] = c.g;
    values[i + 2] = c.b;
  }
  geometry.setAttribute("color", new T.Float32BufferAttribute(values, 3));
  return geometry;
}
export function chamferSlab(parent, material, w, h, d, x, y, z, corner = 0.45) {
  const shape = new T.Shape(),
    a = w / 2,
    b = d / 2;
  shape.moveTo(-a + corner, -b);
  for (const point of [
    [a - corner, -b],
    [a, -b + corner],
    [a, b - corner],
    [a - corner, b],
    [-a + corner, b],
    [-a, b - corner],
    [-a, -b + corner],
  ])
    shape.lineTo(...point);
  shape.closePath();
  const geo = new T.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: false,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -h / 2, 0);
  return addMesh(parent, metricUV(geo), material, x, y, z);
}
export function batchStatic(parent, exclude = new Set()) {
  const groups = new Map();
  for (const m of [...parent.children])
    if (m.isMesh && m.visible && !m.userData.cameraOnly && !exclude.has(m)) {
      const list = groups.get(m.material) ?? [];
      list.push(m);
      groups.set(m.material, list);
    }
  for (const [material, meshes] of groups) {
    if (meshes.length < 2) continue;
    const parts = meshes.map((m) => {
      m.updateMatrix();
      return (
        m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
      ).applyMatrix4(m.matrix);
    });
    const geo = new T.BufferGeometry();
    for (const name of Object.keys(parts[0].attributes).filter((n) =>
      parts.every((g) => g.attributes[n]),
    )) {
      const attrs = parts.map((g) => g.attributes[name]),
        values = new Float32Array(
          attrs.reduce((n, a) => n + a.array.length, 0),
        );
      let offset = 0;
      for (const a of attrs) {
        values.set(a.array, offset);
        offset += a.array.length;
      }
      geo.setAttribute(
        name,
        new T.Float32BufferAttribute(values, attrs[0].itemSize),
      );
    }
    geo.computeBoundingSphere();
    const merged = new T.Mesh(geo, material);
    merged.name = "static-batch";
    parent.add(merged);
    for (const g of parts) g.dispose();
    for (const m of meshes) {
      parent.remove(m);
      m.geometry.dispose();
    }
  }
}
export function addCollisionProxies(bodies, parentFor, cameraSolids) {
  const geo = new T.BoxGeometry(1, 1, 1),
    mat = new T.MeshBasicMaterial();
  for (const b of bodies) {
    const proxy = addMesh(
      parentFor(b),
      geo,
      mat,
      b.x,
      (b.top + b.bottom) / 2,
      b.z,
    );
    proxy.scale.set(b.w, b.top - b.bottom, b.d);
    proxy.visible = false;
    proxy.userData.cameraOnly = true;
    proxy.userData.bodyId = b.id;
    cameraSolids.push(proxy);
  }
}
