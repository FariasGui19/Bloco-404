import * as T from "../vendor/three.module.js";

// Elliptical cross-sections, not stacked boxes. Rings are [y, radiusX,
// radiusZ, centreZ]. The same topology serves jaw/chest/boots/armour.
export function loftGeometry(rings, sides = 10, { faceUV = false } = {}) {
  const positions = [],
    uv = [],
    front = [],
    back = [];
  // Um vértice por lado, fechando o anel em módulo: a costura deixa de duplicar
  // normais e some a linha vertical que cortava rosto, pescoço e peito.
  for (let j = 0; j < rings.length; j++) {
    const [y, rx, rz, cz = 0] = rings[j];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2,
        x = Math.sin(a) * rx,
        z = Math.cos(a) * rz + cz;
      positions.push(x, y, z);
      uv.push(
        faceUV ? x / 0.32 + 0.5 : i / sides,
        faceUV ? (y + 0.18) / 0.37 : j / (rings.length - 1),
      );
    }
  }
  for (let j = 0; j < rings.length - 1; j++)
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides,
        a = j * sides + i,
        b = (j + 1) * sides + i,
        c = j * sides + next,
        d = (j + 1) * sides + next,
        target =
          faceUV && Math.cos(((i + 0.5) / sides) * Math.PI * 2) > 0.35
            ? front
            : back;
      target.push(a, c, b, c, d, b);
    }
  // Close both ends without a blocky flat silhouette at the chin/crown.
  for (const [j, reverse] of [
    [0, true],
    [rings.length - 1, false],
  ]) {
    const index = positions.length / 3,
      [y, , , cz = 0] = rings[j];
    positions.push(0, y, cz);
    uv.push(0.5, j ? 1 : 0);
    for (let i = 0; i < sides; i++) {
      const a = j * sides + i,
        next = j * sides + ((i + 1) % sides);
      back.push(...(reverse ? [index, next, a] : [index, a, next]));
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex([...front, ...back]);
  if (faceUV) {
    g.addGroup(0, front.length, 0);
    g.addGroup(front.length, back.length, 1);
  }
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}
export function createSculptTools() {
  const mesh = (parent, material, geometry, x = 0, y = 0, z = 0) => {
    const o = new T.Mesh(geometry, material);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  return {
    mesh,
    loft(parent, material, rings, x = 0, y = 0, z = 0, sides = 10) {
      return mesh(parent, material, loftGeometry(rings, sides), x, y, z);
    },
    ellipsoid(parent, material, rx, ry, rz, x = 0, y = 0, z = 0) {
      const o = mesh(
        parent,
        material,
        new T.IcosahedronGeometry(1, Math.max(rx, ry, rz) < 0.08 ? 0 : 1),
        x,
        y,
        z,
      );
      o.scale.set(rx, ry, rz);
      return o;
    },
    tube(parent, material, points, radius = 0.015) {
      const curve = new T.CatmullRomCurve3(
        points.map((p) => new T.Vector3(...p)),
      );
      return mesh(
        parent,
        material,
        new T.TubeGeometry(
          curve,
          Math.max(6, points.length * 2),
          radius,
          5,
          false,
        ),
      );
    },
    ring(parent, material, radius, tube, x, y, z, arc = Math.PI * 2) {
      return mesh(
        parent,
        material,
        new T.TorusGeometry(radius, tube, 4, 12, arc),
        x,
        y,
        z,
      );
    },
  };
}
