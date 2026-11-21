import { createLatticeBracelet } from "./operator-bracelet.js";
import * as T from "../vendor/three.module.js";
import { createOperatorMotion } from "./operator-motion.js";
import { createNucleoForm } from "./operator-forms.js";
import { samplePerformance, facialSample } from "./operator-performance.js";
import { createOperatorVFX } from "./operator-vfx.js";
import { batchStatic } from "./sector-meshes.js";

import { createSculptTools, loftGeometry } from "./operator-sculpt.js";

export const OPERATOR_STYLES = Object.freeze({
  nucleo_dez_forma: { suit: 0x536b6d, accent: 0x64ffa3, trim: 0x9aaead },
  motor_bio_forja: { suit: 0x202a36, accent: 0x43e5ff, trim: 0xd5a746 },
  mare_astral: { suit: 0x20343d, accent: 0x57ecf5, trim: 0x4d7c88 },
  lamina_dominio_anciao: { suit: 0x292d39, accent: 0xffd564, trim: 0xc59647 },
});
function texture(size, pixel) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      data.set([...pixel(x, y), 255], (y * size + x) * 4);
  const t = new T.DataTexture(data, size, size);
  t.colorSpace = T.SRGBColorSpace;
  t.magFilter = t.minFilter = T.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}
export function createOperator(progress, player = {}) {
  if (
    progress?.archetype === "nucleo_dez_forma" &&
    ["forma_veloz", "forma_bruta"].includes(player.nucleoForm)
  )
    return createNucleoForm(player.nucleoForm);
  const id = progress?.archetype,
    style = OPERATOR_STYLES[id] ?? OPERATOR_STYLES.nucleo_dez_forma;
  const suitKey = {
    motor_bio_forja: "bio_forja",
    mare_astral: "mare",
    lamina_dominio_anciao: "dominio",
  }[id];
  const equipped = !!suitKey && player.equippedSuit === suitKey;
  const bio = equipped && id === "motor_bio_forja",
    mare = equipped && id === "mare_astral",
    ancient = equipped && id === "lamina_dominio_anciao",
    x10 = id === "nucleo_dez_forma";
  const form = x10 ? player.nucleoForm : null,
    brute = form === "forma_bruta";
  const root = new T.Group(),
    body = new T.Group();
  root.name = "operator";
  body.name = "operator-rig";
  root.add(body);
  root.userData.identity = {
    archetype: id,
    level: 1,
    form,
    model: "human",
    bracelet: x10,
    clothing: equipped ? suitKey : "civilian",
    hair: "2b",
    glasses: true,
    moustache: true,
    tattoos: true,
  };
  const proportions = {
    headWidth: 0.32,
    headHeight: 0.37,
    shoulder: !equipped ? 0.315 : bio ? 0.405 : mare ? 0.325 : 0.36,
    hip: 0.155,
    hipY: 0.89,
    headY: 1.71,
  };
  root.userData.sculpt = { revision: "3B.2", ...proportions };
  // Quiet pixel grain and panel breaks, not a high-contrast checker/grid.
  const cloth = texture(32, (x, y) => {
    const v = (x * 13 + y * 7) % 23 === 0 ? 224 : 245;
    return [v, v, v];
  });
  const faceMap = texture(64, (x, y) => {
    y = 63 - y;
    let c = [185, 128, 91];
    if (x < 10 || x > 53) c = [176, 117, 82];
    if (y > 47 && (x < 21 || x > 42)) c = [173, 115, 80];
    if (y > 33 && y < 40 && ((x > 12 && x < 23) || (x > 40 && x < 51)))
      c = [194, 133, 93];
    return c;
  });
  const tattooMap = texture(32, (x, y) => {
    const ink =
      ((x * 3 + Math.floor(y / 3)) % 13 < 3 && y > 3 && y < 29) ||
      ((x - 16) ** 2 + (y - 16) ** 2 < 55 && (x + y) % 5 < 2);
    return ink ? [43, 61, 62] : [181, 125, 87];
  });
  const suit = new T.MeshLambertMaterial({
    color: brute ? 0x3f4849 : form === "forma_veloz" ? 0x315947 : style.suit,
    map: cloth,
    flatShading: true,
  });
  const dark = new T.MeshLambertMaterial({
    color: 0x18232d,
    flatShading: true,
  });
  const skin = new T.MeshLambertMaterial({
    color: 0xb9805b,
    flatShading: true,
  });
  const hair = new T.MeshLambertMaterial({
    color: 0x211e20,
    map: cloth,
    flatShading: false,
  });
  const hairHighlight = new T.MeshLambertMaterial({
    color: 0x2d2529,
    flatShading: false,
  });
  const ink = new T.MeshLambertMaterial({ map: tattooMap, flatShading: true });
  const trim = new T.MeshLambertMaterial({
    color: style.trim,
    flatShading: true,
  });
  const glow = new T.MeshBasicMaterial({ color: style.accent });
  const lensGlass = new T.MeshLambertMaterial({
    color: 0x9eada9,
    flatShading: true,
  });
  const { mesh: sculptMesh, loft, ellipsoid, tube, ring } = createSculptTools();
  const mesh = (geometry, material, parent, x = 0, y = 0, z = 0) =>
    sculptMesh(parent, material, geometry, x, y, z);
  const torsoWidth = brute ? 1.27 : bio ? 1.13 : mare ? 0.93 : 1;
  const torso = loft(
    body,
    suit,
    [
      [0.87, 0.18, 0.125],
      [0.98, 0.205, 0.13],
      [1.09, 0.215, 0.135],
      [1.25, 0.27, 0.165],
      [1.38, 0.285, 0.145],
      [1.47, 0.185, 0.1],
    ],
    0,
    0,
    0,
    12,
  );
  torso.scale.x = torsoWidth;
  loft(
    body,
    dark,
    [
      [0.83, 0.16, 0.115],
      [0.9, 0.215, 0.135],
      [0.97, 0.19, 0.12],
    ],
    0,
    0,
    0,
    10,
  );
  // Sternum and separate tapered pectoral plates follow an anatomical chest.
  for (const side of [-1, 1]) {
    const plate = ellipsoid(
      body,
      suit,
      0.137 * torsoWidth,
      0.105,
      0.055,
      side * 0.128 * torsoWidth,
      1.325,
      0.14,
    );
    plate.rotation.z = -side * 0.13;
    tube(
      body,
      trim,
      [
        [side * 0.04, 1.43, 0.105],
        [side * 0.17, 1.42, 0.14],
        [side * 0.265 * torsoWidth, 1.35, 0.13],
      ],
      ancient ? 0.013 : 0.008,
    );
    for (let j = 0; j < 3; j++) {
      const rib = ellipsoid(
        body,
        suit,
        0.1,
        0.045,
        0.035,
        side * 0.11,
        1.19 - j * 0.085,
        0.132,
      );
      rib.rotation.z = side * 0.14;
    }
    tube(
      body,
      glow,
      [
        [side * 0.23 * torsoWidth, 1.32, 0.171],
        [side * 0.2 * torsoWidth, 1.2, 0.15],
        [side * 0.16, 1.03, 0.132],
      ],
      0.008,
    );
    ellipsoid(body, trim, 0.039, 0.035, 0.018, side * 0.17, 0.95, 0.126);
  }
  loft(
    body,
    dark,
    [
      [0.94, 0.202, 0.135],
      [0.978, 0.202, 0.135],
    ],
    0,
    0,
    0,
    12,
  );
  ellipsoid(body, trim, 0.053, 0.035, 0.018, 0, 0.96, 0.14);
  const core = ellipsoid(body, glow, 0.027, 0.045, 0.014, 0, 1.365, 0.18);
  core.name = "suit-core";
  if (player.equippedSuit)
    tube(
      body,
      trim,
      [
        [-0.22, 1.35, 0.18],
        [0, 1.26, 0.18],
        [0.22, 1.35, 0.18],
      ],
      0.012,
    );
  const neck = loft(
    body,
    ink,
    [
      [1.47, 0.09, 0.075],
      [1.545, 0.078, 0.077],
    ],
    0,
    0,
    0,
    10,
  );
  neck.name = "neck-tattoos";

  const head = new T.Group();
  head.name = "operator-head";
  head.position.y = proportions.headY;
  head.scale.set(0.96, 0.96, 0.98);
  body.add(head);
  // Narrow chin, cheekbones, brow and curved temples; the portrait is UV-mapped
  // onto this volume, not pasted on a flat rectangular face card.
  const skullGeometry = loftGeometry(
    [
      [-0.17, 0.068, 0.073, 0.02],
      [-0.133, 0.106, 0.105, 0.012],
      [-0.065, 0.151, 0.128, 0],
      [0.025, 0.159, 0.139, 0],
      [0.112, 0.15, 0.13, -0.008],
      [0.18, 0.115, 0.102, -0.012],
      [0.197, 0.055, 0.055, -0.014],
    ],
    12,
    { faceUV: true },
  );
  const skull = mesh(
    skullGeometry,
    [new T.MeshLambertMaterial({ map: faceMap, flatShading: false }), skin],
    head,
  );
  skull.name = "sculpted-face";
  const nose = ellipsoid(head, skin, 0.017, 0.028, 0.022, 0, -0.011, 0.138);
  nose.rotation.x = -0.1;
  ellipsoid(head, skin, 0.02, 0.011, 0.015, 0, -0.031, 0.15);
  const eyeWhite = new T.MeshLambertMaterial({
    color: 0xd1c9b7,
    flatShading: true,
  });
  const facePivots = [],
    eyelids = [],
    eyebrows = [],
    gaze = new T.Group();
  head.add(gaze);
  for (const side of [-1, 1]) {
    ellipsoid(head, eyeWhite, 0.021, 0.0085, 0.006, side * 0.068, 0.007, 0.136);
    const iris = ellipsoid(
      gaze,
      dark,
      0.0098,
      0.007,
      0.004,
      side * 0.068,
      0.005,
      0.14,
    );
    const lid = ellipsoid(
      head,
      skin,
      0.028,
      0.014,
      0.004,
      side * 0.068,
      0.005,
      0.146,
    );
    lid.name = "eyelid";
    eyelids.push(lid);
    facePivots.push(lid);
    const brow = ellipsoid(
      head,
      hair,
      0.034,
      0.008,
      0.008,
      side * 0.068,
      0.041,
      0.133,
    );
    brow.name = "eyebrow";
    eyebrows.push(brow);
    facePivots.push(brow);
  }
  const mouth = ellipsoid(head, dark, 0.022, 0.0025, 0.003, 0, -0.093, 0.122);
  mouth.name = "expression-mouth";
  facePivots.push(mouth);
  const hairRig = new T.Group();
  hairRig.name = "layered-hair";
  head.add(hairRig);
  for (const side of [-1, 1]) {
    const ear = ellipsoid(
      head,
      skin,
      0.026,
      0.046,
      0.023,
      side * 0.157,
      -0.018,
      -0.004,
    );
    ear.rotation.z = -side * 0.1;
    // Thin black polygonal glasses with a small highlight, not opaque goggles.
    const frame = tube(
      head,
      dark,
      [
        [side * 0.023, 0.031, 0.143],
        [side * 0.107, 0.031, 0.14],
        [side * 0.11, 0.012, 0.14],
        [side * 0.102, -0.008, 0.145],
        [side * 0.032, -0.009, 0.15],
        [side * 0.023, 0.007, 0.148],
        [side * 0.023, 0.031, 0.143],
      ],
      0.0035,
    );
    frame.name = "angular-prescription-frame";
    tube(
      head,
      dark,
      [
        [side * 0.12, 0.012, 0.133],
        [side * 0.153, 0.016, 0.07],
        [side * 0.158, 0.005, 0.005],
      ],
      0.0035,
    );
    const moustache = ellipsoid(
      head,
      hair,
      0.027,
      0.007,
      0.007,
      side * 0.022,
      -0.062,
      0.131,
    );
    moustache.rotation.z = -side * 0.07;
    ellipsoid(head, lensGlass, 0.019, 0.003, 0.003, side * 0.074, 0.025, 0.144);
    ellipsoid(head, hair, 0.01, 0.055, 0.018, side * 0.15, 0.083, 0.008);
  }
  tube(
    head,
    dark,
    [
      [-0.021, 0.014, 0.144],
      [0, 0.021, 0.153],
      [0.021, 0.014, 0.144],
    ],
    0.0045,
  );
  // A fitted continuous shell follows the skull; the open front preserves the forehead.
  const scalp = loftGeometry(
    [
      [-0.073, 0.15, 0.13, -0.008],
      [0.025, 0.165, 0.145, -0.004],
      [0.112, 0.157, 0.138, -0.008],
      [0.18, 0.122, 0.11, -0.012],
      [0.202, 0.055, 0.06, -0.014],
    ],
    16,
  );
  const scalpPositions = scalp.attributes.position,
    scalpIndices = [];
  for (let i = 0; i < scalp.index.count; i += 3) {
    const triangle = [0, 1, 2].map((j) => scalp.index.getX(i + j));
    const y = triangle.reduce((n, j) => n + scalpPositions.getY(j), 0) / 3;
    const z = triangle.reduce((n, j) => n + scalpPositions.getZ(j), 0) / 3;
    if (y > 0.105 || z < 0.035) scalpIndices.push(...triangle);
  }
  scalp.setIndex(scalpIndices);
  for (let i = 0; i < scalpPositions.count; i++) {
    const y = scalpPositions.getY(i),
      x = scalpPositions.getX(i);
    scalpPositions.setZ(
      i,
      scalpPositions.getZ(i) + Math.sin(y * 98 + x * 83) * 0.0025,
    );
  }
  scalp.computeVertexNormals();
  mesh(scalp, hair, hairRig).name = "continuous-hair-scalp";
  // Overlapping S-shaped locks follow the crown in two staggered rows.
  // The continuous scalp underneath closes every viewing angle.
  for (let i = 0; i < 7; i++) {
    const row = i < 4 ? 0 : 1,
      col = i < 4 ? i : i - 4;
    const x = -0.13 + col * 0.072 + (row ? 0.025 : 0),
      z = row ? -0.035 : 0.085;
    const y = 0.14 + row * 0.018 - Math.abs(x) * 0.08;
    const lock = tube(
      hairRig,
      i % 3 === 0 ? hairHighlight : hair,
      [
        [x, y, z],
        [x + 0.012, y + 0.028, z + 0.015],
        [x + 0.052, y + 0.034, z - 0.012],
        [x + 0.075, y + 0.008, z - 0.042],
      ],
      0.026,
    );
    lock.name = "swept-wave";
  }

  const bracelets = [];
  const limbs = [],
    jets = [],
    effects = new T.Group();
  effects.name = "operator-action";
  body.add(effects);
  const staticPivots = [body, head, hairRig, gaze];
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * proportions.hip, proportions.hipY, 0);
    body.add(leg);
    loft(
      leg,
      suit,
      [
        [-0.36, 0.085, 0.087],
        [-0.23, 0.106, 0.107],
        [-0.07, 0.122, 0.121],
        [0.015, 0.1, 0.103],
      ],
      0,
      0,
      0,
      10,
    );
    const thigh = ellipsoid(leg, suit, 0.092, 0.16, 0.039, 0, -0.16, 0.089);
    thigh.rotation.x = -0.07;
    const knee = new T.Group();
    knee.position.y = -0.36;
    leg.add(knee);
    ellipsoid(knee, dark, 0.09, 0.075, 0.088, 0, -0.006, 0);
    const kneepad = ellipsoid(
      knee,
      ancient ? trim : suit,
      0.076,
      0.076,
      0.035,
      0,
      -0.018,
      0.077,
    );
    kneepad.rotation.x = 0.16;
    loft(
      knee,
      suit,
      [
        [-0.34, 0.069, 0.075],
        [-0.24, 0.082, 0.091],
        [-0.1, 0.097, 0.094],
        [-0.025, 0.083, 0.083],
      ],
      0,
      0,
      0,
      10,
    );
    tube(
      knee,
      glow,
      [
        [side * 0.045, -0.1, 0.083],
        [side * 0.039, -0.23, 0.087],
        [side * 0.025, -0.32, 0.073],
      ],
      mare ? 0.012 : 0.006,
    );
    const boot = loft(
      knee,
      dark,
      [
        [-0.53, 0.077, 0.123, 0.038],
        [-0.48, 0.091, 0.16, 0.047],
        [-0.405, 0.084, 0.15, 0.042],
        [-0.345, 0.068, 0.07, 0],
      ],
      0,
      0,
      0,
      10,
    );
    boot.name = "sculpted-boot";
    ellipsoid(knee, suit, 0.08, 0.045, 0.112, 0, -0.415, 0.065);
    tube(
      knee,
      trim,
      [
        [-0.067, -0.47, 0.13],
        [0, -0.475, 0.187],
        [0.067, -0.47, 0.13],
      ],
      0.007,
    );
    const arm = new T.Group();
    arm.position.set(side * proportions.shoulder, 1.435, 0);
    body.add(arm);
    const shoulderWidth = bio || brute ? 0.17 : mare ? 0.113 : 0.132;
    const shoulder = loft(
      arm,
      suit,
      [
        [-0.19, shoulderWidth * 0.48, 0.067],
        [-0.11, shoulderWidth * 0.9, 0.113],
        [0, shoulderWidth, 0.128],
        [0.072, shoulderWidth * 0.68, 0.093],
        [0.105, 0.038, 0.043],
      ],
      side * 0.008,
      0,
      0,
      10,
    );
    shoulder.rotation.z = side * 0.22;
    loft(
      arm,
      bio || ancient ? ink : suit,
      [
        [-0.285, 0.065, 0.07],
        [-0.18, bio ? 0.097 : 0.081, 0.085],
        [-0.08, 0.096, 0.089],
        [0.015, 0.083, 0.08],
      ],
      0,
      0,
      0,
      10,
    );
    const elbow = new T.Group();
    elbow.position.y = -0.29;
    arm.add(elbow);
    ellipsoid(elbow, dark, 0.069, 0.066, 0.074, 0, -0.005, 0);
    loft(
      elbow,
      suit,
      [
        [-0.25, 0.064, 0.065],
        [-0.17, bio ? 0.101 : 0.078, 0.087],
        [-0.045, bio ? 0.105 : 0.085, 0.081],
        [0.005, 0.069, 0.066],
      ],
      0,
      0,
      0,
      10,
    );
    const forearmPlate = ellipsoid(
      elbow,
      bio ? trim : suit,
      0.052,
      0.106,
      0.027,
      0,
      -0.135,
      0.074,
    );
    forearmPlate.rotation.x = -0.12;
    const glove = ellipsoid(elbow, dark, 0.067, 0.084, 0.067, 0, -0.3, 0.012);
    glove.rotation.x = -0.06;
    ellipsoid(elbow, skin, 0.043, 0.031, 0.015, 0, -0.322, 0.068);
    ellipsoid(elbow, dark, 0.028, 0.047, 0.027, -side * 0.052, -0.279, 0.04);
    if (x10 && side === -1) {
      bracelets.push(createLatticeBracelet(elbow));
    }
    if (bio) {
      // Reinforced deltoids, exposed tattooed biceps and curved organic ribs.
      for (let i = 0; i < 3; i++) {
        const rib = ellipsoid(
          arm,
          i === 1 ? trim : dark,
          0.15 - i * 0.013,
          0.031,
          0.135,
          side * 0.015,
          -0.05 - i * 0.052,
          -0.022,
        );
        rib.rotation.z = side * 0.2;
      }
      tube(
        elbow,
        glow,
        [
          [side * 0.055, -0.035, 0.062],
          [side * 0.065, -0.11, 0.093],
          [side * 0.04, -0.22, 0.066],
        ],
        0.011,
      );
      tube(
        body,
        glow,
        [
          [side * 0.24, 1.36, -0.12],
          [side * 0.2, 1.23, -0.201],
          [side * 0.14, 1.08, -0.17],
        ],
        0.013,
      );
    }
    if (mare) {
      tube(
        arm,
        glow,
        [
          [side * 0.05, 0.02, -0.065],
          [side * 0.09, -0.1, -0.01],
          [side * 0.055, -0.245, 0.044],
        ],
        0.013,
      );
      tube(
        elbow,
        glow,
        [
          [side * 0.04, -0.035, 0.071],
          [side * 0.045, -0.13, 0.093],
          [0, -0.225, 0.069],
        ],
        0.011,
      );
      const fin = ellipsoid(
        elbow,
        suit,
        0.026,
        0.139,
        0.101,
        side * 0.069,
        -0.13,
        -0.032,
      );
      fin.rotation.x = -0.24;
      ellipsoid(knee, suit, 0.025, 0.13, 0.086, side * 0.068, -0.23, -0.049);
    }
    if (ancient) {
      const mantle = ellipsoid(
        arm,
        trim,
        side === -1 ? 0.166 : 0.148,
        0.09,
        0.142,
        side * 0.012,
        0.03,
        0,
      );
      mantle.rotation.z = side * 0.2;
      const cap = ellipsoid(
        arm,
        suit,
        side === -1 ? 0.155 : 0.137,
        0.082,
        0.132,
        side * 0.012,
        0.041,
        0,
      );
      cap.rotation.z = side * 0.2;
      for (let j = 0; j < 3; j++) {
        const plate = ellipsoid(
          elbow,
          trim,
          0.052 - j * 0.005,
          0.043,
          0.024,
          0,
          -0.06 - j * 0.061,
          0.081,
        );
        plate.rotation.z = side * 0.12;
      }
      const hipPlate = loft(
        leg,
        suit,
        [
          [-0.18, 0.092, 0.028],
          [-0.075, 0.108, 0.031],
          [0.01, 0.09, 0.021],
        ],
        0,
        0,
        0.105,
        8,
      );
      hipPlate.rotation.z = -side * 0.15;
      tube(
        leg,
        trim,
        [
          [side * 0.078, -0.025, 0.122],
          [side * 0.068, -0.1, 0.136],
          [0, -0.17, 0.137],
        ],
        0.009,
      );
    }
    if (bio || x10) {
      const engine = loft(
        body,
        dark,
        [
          [1.03, 0.069, 0.069],
          [1.09, 0.095, 0.08],
          [1.32, 0.083, 0.083],
          [1.38, 0.05, 0.05],
        ],
        side * 0.16,
        0,
        -0.185,
        10,
      );
      ring(body, trim, 0.064, 0.009, side * 0.16, 1.062, -0.202).rotation.x =
        Math.PI / 2;
      const jet = mesh(
        new T.ConeGeometry(0.075, 0.34, 6),
        glow,
        knee,
        0,
        -0.46,
        -0.068,
      );
      jet.rotation.z = Math.PI;
      jet.visible = false;
      jets.push(jet);
    }
    limbs.push({ leg, knee, arm, elbow, side });
    staticPivots.push(arm, elbow, leg, knee);
  }
  if (mare) {
    for (const side of [-1, 1]) {
      tube(
        body,
        glow,
        [
          [side * 0.08, 1.5, -0.085],
          [side * 0.195, 1.48, -0.12],
          [side * 0.25, 1.38, -0.045],
          [side * 0.23, 1.29, 0.12],
        ],
        0.019,
      );
      tube(
        body,
        glow,
        [
          [side * 0.105, 0.99, -0.1],
          [side * 0.19, 1.06, -0.16],
          [side * 0.16, 1.26, -0.19],
        ],
        0.014,
      );
    }
    loft(
      body,
      suit,
      [
        [1.02, 0.11, 0.075],
        [1.1, 0.125, 0.1],
        [1.34, 0.1, 0.09],
        [1.4, 0.06, 0.05],
      ],
      0,
      0,
      -0.195,
      10,
    );
    tube(
      body,
      glow,
      [
        [0, 1.1, -0.296],
        [0, 1.3, -0.296],
        [0, 1.35, -0.26],
      ],
      0.019,
    );
  }
  if (ancient) {
    // Reference keeps ordinary dark prescription glasses, not a monocle.
    const coat = new T.Group();
    coat.name = "ancestral-split-coat";
    body.add(coat);
    for (const side of [-1, 1]) {
      const tail = loft(
        coat,
        suit,
        [
          [0.44, 0.085, 0.012],
          [0.64, 0.105, 0.018],
          [0.91, 0.07, 0.022],
        ],
        side * 0.15,
        0,
        -0.16,
        6,
      );
      tail.rotation.z = side * -0.13;
      tube(
        coat,
        trim,
        [
          [side * 0.12, 0.92, -0.19],
          [side * 0.18, 0.68, -0.18],
          [side * 0.2, 0.45, -0.17],
        ],
        0.006,
      );
    }
    for (const side of [-1, 1]) {
      tube(
        body,
        trim,
        [
          [side * 0.17, 1.44, -0.04],
          [side * 0.14, 1.47, 0.08],
          [side * 0.075, 1.39, 0.168],
          [0, 1.34, 0.18],
        ],
        0.02,
      );
      for (let j = 0; j < 3; j++)
        ellipsoid(
          body,
          glow,
          0.006,
          0.012,
          0.005,
          side * (0.05 + j * 0.025),
          1.38 + j * 0.022,
          0.166 - j * 0.015,
        );
    }
  }
  if (form === "forma_veloz")
    for (const side of [-1, 1])
      tube(
        body,
        glow,
        [
          [side * 0.2, 1.37, -0.13],
          [side * 0.18, 1.22, -0.19],
          [side * 0.14, 1.03, -0.15],
        ],
        0.012,
      );
  const presence = new T.Group();
  presence.name = "archetype-presence";
  body.add(presence);
  if (ancient) {
    for (const side of [-1, 1])
      tube(
        body,
        trim,
        [
          [side * 0.15, 1.05, -0.12],
          [side * 0.25, 1.26, -0.2],
          [side * 0.23, 1.43, -0.16],
        ],
        0.015,
      );
  }
  if (bio)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const plate = ellipsoid(
          body,
          suit,
          0.07,
          0.11,
          0.052,
          side * (0.28 + i * 0.024),
          1.38 - i * 0.075,
          -0.1 - i * 0.025,
        );
        plate.rotation.z = -side * 0.33;
      }
    }
  if (!equipped) {
    // Civilian silhouette comes from the canonical player-sheet, not a tinted suit.
    const cotton = new T.MeshLambertMaterial({
      color: 0x17191f,
      map: cloth,
      flatShading: true,
    });
    const cargo = new T.MeshLambertMaterial({
      color: 0xd3d0c7,
      map: cloth,
      flatShading: true,
    });
    const removed = [];
    for (const o of body.children) {
      if (o.isMesh && o !== torso && o.material !== skin && o.material !== ink)
        removed.push(o);
    }
    torso.material = cotton;
    for (const { leg, knee, arm, elbow, side } of limbs) {
      // Keep only the main fabric volumes and shoes; strip plates and illuminated seams.
      for (const pivot of [leg, knee]) {
        let fabric = false;
        for (const o of pivot.children)
          if (o.isMesh) {
            if (o.name === "sculpted-boot") continue;
            if (
              o.material === suit &&
              !fabric &&
              o.geometry.type === "BufferGeometry"
            ) {
              o.material = cargo;
              fabric = true;
            } else removed.push(o);
          }
      }
      for (const pivot of [arm, elbow]) {
        for (const o of pivot.children) if (o.isMesh) removed.push(o);
      }
      loft(
        arm,
        ink,
        [
          [-0.285, 0.062, 0.067],
          [-0.16, 0.083, 0.08],
          [0, 0.095, 0.09],
          [0.06, 0.062, 0.067],
        ],
        0,
        0,
        0,
        10,
      );
      loft(
        elbow,
        ink,
        [
          [-0.26, 0.052, 0.055],
          [-0.15, 0.069, 0.069],
          [0, 0.067, 0.069],
        ],
        0,
        0,
        0,
        10,
      );
      ellipsoid(elbow, skin, 0.056, 0.085, 0.049, 0, -0.3, 0.012);
      ellipsoid(
        leg,
        cargo,
        0.04,
        0.105,
        0.085,
        side * 0.095,
        -0.19,
        0.015,
      ).name = "cargo-pocket";
      tube(
        knee,
        cargo,
        [
          [-0.068, -0.49, 0.14],
          [0, -0.5, 0.185],
          [0.068, -0.49, 0.14],
        ],
        0.009,
      );
    }
    const liveMaterials = new Set();
    removed.forEach((o) => {
      o.removeFromParent();
      o.geometry.dispose();
    });
    root.traverse((o) => {
      if (o.material) liveMaterials.add(o.material);
    });
    for (const m of [suit, trim, glow]) if (!liveMaterials.has(m)) m.dispose();
  }
  if (ancient) {
    tube(
      body,
      dark,
      [
        [-0.23, 0.96, -0.06],
        [-0.33, 0.65, -0.1],
        [-0.41, 0.4, -0.12],
      ],
      0.028,
    );
    tube(
      body,
      trim,
      [
        [-0.245, 0.91, -0.035],
        [-0.23, 0.96, -0.035],
        [-0.21, 0.99, -0.035],
      ],
      0.008,
    );
    for (const side of [-1, 1]) {
      tube(
        body,
        trim,
        [
          [side * 0.29, 1.43, 0.02],
          [side * 0.35, 1.47, 0.1],
          [side * 0.43, 1.43, 0.08],
        ],
        0.012,
      );
      for (let i = 0; i < 3; i++)
        tube(
          body,
          glow,
          [
            [side * (0.12 + i * 0.027), 1.28 - i * 0.045, 0.18],
            [side * (0.16 + i * 0.027), 1.25 - i * 0.045, 0.17],
          ],
          0.004,
        );
    }
  }
  if (bio) {
    for (const side of [-1, 1])
      tube(
        body,
        ink,
        [
          [side * 0.2, 1.4, -0.16],
          [side * 0.3, 1.2, -0.21],
          [side * 0.22, 1.02, -0.16],
        ],
        0.024,
      );
  }
  batchStatic(presence);
  const kind =
    id === "motor_bio_forja"
      ? "bio"
      : id === "mare_astral"
        ? "mare"
        : id === "lamina_dominio_anciao"
          ? "ancient"
          : "human";
  const currents = mare
    ? [-1, 1].map((side) => {
        const drop = ellipsoid(
          body,
          glow,
          0.012,
          0.032,
          0.012,
          side * 0.2,
          1.2,
          0.16,
        );
        drop.name = "living-duct-current";
        return drop;
      })
    : [];
  const vfx = createOperatorVFX(body, limbs[1].elbow, style.accent, kind, {
    equipped,
    source: bracelets[0]?.root,
  });
  const excluded = new Set([
    ...facePivots,
    ...jets,
    ...vfx.excluded,
    ...currents,
  ]);
  for (const pivot of staticPivots) batchStatic(pivot, excluded);
  const motion = createOperatorMotion();
  return {
    root,
    motion,
    get pose() {
      return motion.pose;
    },
    animate(c, t, options = {}) {
      const pose = motion.update(c, t, { ...options, archetype: id }),
        p = samplePerformance(
          options.action,
          kind,
          t,
          options.reducedMotion,
          !equipped,
        );
      const blend = 1 - p.weight * 0.88;
      const f = facialSample(t, p.expression, options.reducedMotion);
      root.position.set(c.x, c.y, c.z);
      root.rotation.y = c.yaw;
      body.rotation.set(
        pose.pitch + p.lean,
        (pose.torsoYaw ?? 0) * blend + p.twist,
        pose.bank + (pose.hipRoll ?? 0) * blend + p.bank,
      );
      body.position.set(p.shiftX, pose.bob * blend - p.crouch, p.shiftZ);
      body.scale.setScalar(1);
      head.rotation.set(
        (pose.headPitch ?? 0) + p.headPitch,
        pose.head + p.headYaw,
        -(pose.hipRoll ?? 0) * 0.6,
      );
      gaze.position.x = f.look;
      eyelids.forEach((l) => {
        l.visible = f.blink > 0.02;
        l.scale.y = 0.014 * f.blink;
      });
      eyebrows.forEach((b, i) => {
        b.rotation.z = (i ? 1 : -1) * f.brow + (i ? -0.035 : 0.035);
        b.position.y = 0.041 + p.expression * 0.005;
      });
      mouth.scale.y = 0.0025 * f.mouth;
      hairRig.rotation.set(
        options.reducedMotion
          ? 0
          : Math.sin(t * 2.4) * 0.008 + (pose.pitch + p.lean) * 0.06,
        0,
        options.reducedMotion ? 0 : -pose.bank * 0.05,
      );
      limbs.forEach(({ leg, knee, arm, elbow, side }, i) => {
        leg.rotation.x = pose.legs[i] * blend + p.legs[i];
        knee.rotation.x = pose.knees[i] * blend + p.knees[i];
        arm.rotation.set(
          pose.arms[i] * blend + p.arms[i],
          p.armYaw[i],
          -side * pose.spread + p.armRoll[i],
        );
        elbow.rotation.x = pose.elbows[i] * blend + p.elbows[i];
      });
      for (const jet of jets) {
        const thrust =
          pose.exhaust ||
          (bio && (c.dash > 0 || c.actionBoost > 0 || p.attack)
            ? 1.2 + p.flare * 0.6
            : 0);
        jet.visible = thrust > 0;
        jet.scale.y = thrust;
      }
      const brightness = options.reducedMotion
        ? 1
        : mare
          ? 0.94 + Math.sin(t * 2.7 - p.u * 4) * 0.11
          : ancient
            ? 0.96 + Math.sin(t * 1.5) * 0.04
            : 1;
      glow.color.setHex(style.accent).multiplyScalar(brightness);
      presence.rotation.y = options.reducedMotion
        ? 0
        : Math.sin(t * 0.8) * 0.07;
      presence.position.y = options.reducedMotion
        ? 0
        : Math.sin(t * 1.4) * 0.012;
      currents.forEach((drop, i) => {
        const u = options.reducedMotion ? 0.5 : (t * 0.7 + i * 0.5) % 1;
        drop.position.set(
          (i ? 1 : -1) * (0.16 + u * 0.07),
          1.03 + u * 0.29,
          0.166,
        );
      });
      bracelets.forEach((bracelet) =>
        bracelet.update(p, options.reducedMotion),
      );
      vfx.update(p, t, options.reducedMotion, c);
      root.userData.performance = {
        action: p.id,
        phase: p.u,
        blink: f.blink,
        expression: p.expression,
        twist: p.twist,
        scan: p.scan,
        stage: p.stage,
        variant: p.variant,
        beat: p.beat,
        blend,
        identity: kind,
        civilian: !equipped,
      };
    },
  };
}
