import * as T from "../vendor/three.module.js";
import {
  addMesh,
  box,
  cylinder,
  vertexTint,
  batchStatic,
} from "./sector-meshes.js";

export function buildScenery(layout, chunkAt, m) {
  const greens = [0x577d78, 0x456e70, 0x78998a, 0x648478];
  for (const p of layout.props) {
    const parent = chunkAt(p.x, p.z),
      s = p.scale;
    if (p.type === "boulder") {
      const rock = addMesh(
        parent,
        vertexTint(
          new T.DodecahedronGeometry(1, 0),
          [0x74828c, 0x667b85, 0x8a8d96][p.seed % 3],
        ),
        m.rock,
        p.x,
        p.y + 0.3 * s,
        p.z,
      );
      rock.scale.set(0.9 * s, 0.65 * s, 0.725 * s);
      rock.rotation.y = p.seed * 0.73;
      // Smaller companion stones read as an intentional outcrop.
      const chip = addMesh(
        parent,
        vertexTint(new T.DodecahedronGeometry(0.36, 0), 0x6b807d),
        m.rock,
        p.x + 0.65 * s,
        p.y + 0.12 * s,
        p.z + 0.42 * s,
      );
      chip.scale.y = 0.45;
    } else if (p.type.startsWith("tree")) {
      const needle = p.type === "tree-needle",
        broad = p.type === "tree-broad",
        h = (needle ? 5.4 : broad ? 4.4 : 4.8) * s;
      const trunk = cylinder(
        parent,
        m.wood,
        0.12 * s,
        0.26 * s,
        h * 0.73,
        p.x,
        p.y + h * 0.34,
        p.z,
        5,
      );
      if (!needle) trunk.rotation.z = (p.seed % 2 ? 1 : -1) * 0.08;
      const branch = cylinder(
        parent,
        m.wood,
        0.055 * s,
        0.12 * s,
        h * 0.36,
        p.x + 0.25 * s,
        p.y + h * 0.54,
        p.z,
        4,
      );
      branch.rotation.z = -0.65;
      if (needle) {
        for (let i = 0; i < 3; i++) {
          const crown = addMesh(
            parent,
            vertexTint(
              new T.ConeGeometry((1.75 - i * 0.36) * s, (2.4 - i * 0.3) * s, 7),
              greens[(p.seed + i) % 4],
            ),
            m.foliage,
            p.x,
            p.y + h * 0.55 + i * s,
            p.z,
          );
          crown.rotation.y = p.seed;
        }
      } else {
        for (let i = 0; i < 3; i++) {
          const angle = p.seed + i * 2.1,
            r = broad ? 0.75 : 0.6;
          const crown = addMesh(
            parent,
            vertexTint(
              new T.IcosahedronGeometry((broad ? 1.6 : 1.8) * s, 0),
              greens[(p.seed + i) % 4],
            ),
            m.foliage,
            p.x + Math.cos(angle) * r * s,
            p.y + h * 0.76 + i * 0.23 * s,
            p.z + Math.sin(angle) * r * s,
          );
          crown.scale.set(broad ? 1.1 : 1.4, broad ? 0.85 : 0.5, 1);
          crown.rotation.y = angle;
        }
      }
    } else if (p.type === "fern") {
      for (let i = 0; i < 5; i++) {
        const leaf = addMesh(
          parent,
          vertexTint(
            new T.ConeGeometry(0.2 * s, 0.85 * s, 3),
            greens[(p.seed + i) % 4],
          ),
          m.foliage,
          p.x + Math.sin(i * 1.256) * 0.18,
          p.y + 0.3 * s,
          p.z + Math.cos(i * 1.256) * 0.18,
        );
        leaf.rotation.set(
          Math.sin(i * 1.256) * 0.7,
          i * 1.256,
          Math.cos(i * 1.256) * 0.7,
        );
      }
    } else if (p.type === "wall") {
      box(
        parent,
        m.floor,
        2.8 * s,
        0.35 * s,
        0.8 * s,
        p.x,
        p.y + 0.08 * s,
        p.z,
      );
      for (let i = 0; i < 3; i++)
        box(
          parent,
          m.masonry,
          0.88 * s,
          (i === 1 ? 0.75 : 1.1) * s,
          0.65 * s,
          p.x + (i - 1) * 0.9 * s,
          p.y + (i === 1 ? 0.275 : 0.45) * s,
          p.z,
        );
    } else if (p.type === "waystone") {
      const stone = addMesh(
        parent,
        vertexTint(new T.DodecahedronGeometry(0.65 * s, 0), 0x7e9793),
        m.rock,
        p.x,
        p.y + 0.35 * s,
        p.z,
      );
      stone.scale.set(0.65, 1, 0.7);
      box(
        parent,
        m.teal,
        0.12 * s,
        0.3 * s,
        0.025,
        p.x,
        p.y + 0.4 * s,
        p.z + 0.34 * s,
      );
    }
  }
}
export function batchScenery(chunks) {
  for (const { group } of chunks) batchStatic(group);
}
