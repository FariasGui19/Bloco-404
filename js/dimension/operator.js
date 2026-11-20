import * as T from "../vendor/three.module.js";
import { createOperatorMotion } from "./operator-motion.js";
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
  const id = progress?.archetype,
    style = OPERATOR_STYLES[id] ?? OPERATOR_STYLES.nucleo_dez_forma;
  const bio = id === "motor_bio_forja",
    mare = id === "mare_astral",
    ancient = id === "lamina_dominio_anciao",
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
    bracelet: x10,
    hair: "2b",
    glasses: true,
    moustache: true,
    tattoos: true,
  };
  const proportions = {
    headWidth: 0.32,
    headHeight: 0.37,
    shoulder: brute ? 0.47 : bio ? 0.405 : mare ? 0.325 : 0.36,
    hip: 0.155,
    hipY: 0.89,
    headY: 1.71,
  };
  root.userData.sculpt = { revision: "3B.1", ...proportions };
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
    if (y >= 24 && y <= 26 && ((x >= 12 && x <= 26) || (x >= 37 && x <= 51)))
      c = [46, 33, 29];
    if (y >= 29 && y <= 33 && ((x >= 16 && x <= 25) || (x >= 38 && x <= 47)))
      c = [208, 192, 157];
    if (y >= 29 && y <= 33 && ((x >= 16 && x <= 19) || (x >= 44 && x <= 47)))
      c = [31, 32, 29];
    if (y === 50 && x >= 26 && x <= 38) c = [119, 65, 49];
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
    color: 0x241e20,
    flatShading: true,
  });
  const hairHighlight = new T.MeshLambertMaterial({
    color: 0x30262a,
    flatShading: true,
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
  body.add(head);
  // Narrow chin, cheekbones, brow and curved temples; the portrait is UV-mapped
  // onto this volume, not pasted on a flat rectangular face card.
  const skullGeometry = loftGeometry(
    [
      [-0.18, 0.064, 0.073, 0.026],
      [-0.143, 0.112, 0.099, 0.012],
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
    [new T.MeshLambertMaterial({ map: faceMap, flatShading: true }), skin],
    head,
  );
  skull.name = "sculpted-face";
  const nose = ellipsoid(head, skin, 0.023, 0.041, 0.037, 0, -0.017, 0.142);
  nose.rotation.x = -0.1;
  ellipsoid(head, skin, 0.027, 0.018, 0.026, 0, -0.044, 0.165);
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
    const frame = ring(head, dark, 0.043, 0.006, side * 0.071, 0.01, 0.137);
    frame.scale.set(1.18, 0.72, 1);
    frame.rotation.y = side * 0.11;
    tube(
      head,
      dark,
      [
        [side * 0.12, 0.012, 0.133],
        [side * 0.153, 0.016, 0.07],
        [side * 0.158, 0.005, 0.005],
      ],
      0.005,
    );
    const moustache = ellipsoid(
      head,
      hair,
      0.029,
      0.009,
      0.01,
      side * 0.025,
      -0.077,
      0.13,
    );
    moustache.rotation.z = -side * 0.13;
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
  // Three offset layers of wavy locks, including the back and temples.
  ellipsoid(head, hair, 0.154, 0.091, 0.137, 0, 0.15, -0.02);
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + row * 0.41,
        r = row === 2 ? 0.064 : 0.115;
      const lock = ellipsoid(
        head,
        (i + row) % 4 === 0 ? hairHighlight : hair,
        0.053,
        0.041 + row * 0.004,
        0.058,
        Math.sin(a) * r,
        0.133 + row * 0.037,
        Math.cos(a) * r - 0.025,
      );
      lock.rotation.set(0.1 * Math.sin(a), a, 0.22 * Math.cos(a));
    }
  for (let i = 0; i < 5; i++) {
    const curl = ellipsoid(
      head,
      i % 3 === 0 ? hairHighlight : hair,
      0.041,
      0.031,
      0.032,
      (i - 2) * 0.055,
      0.115 + Math.sin(i * 1.6) * 0.014,
      0.109,
    );
    curl.rotation.z = Math.sin(i * 1.9) * 0.3;
  }

  const limbs = [],
    jets = [],
    effects = new T.Group();
  effects.name = "operator-action";
  body.add(effects);
  const staticPivots = [body, head];
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
      bio ? ink : suit,
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
      const bracelet = new T.Group();
      bracelet.name = "x10-bracelet";
      elbow.add(bracelet);
      staticPivots.push(bracelet);
      loft(
        bracelet,
        dark,
        [
          [-0.22, 0.084, 0.078],
          [-0.1, 0.087, 0.081],
        ],
        0,
        0,
        0,
        12,
      );
      for (const y of [-0.218, -0.102])
        loft(
          bracelet,
          trim,
          [
            [y - 0.008, 0.085, 0.079],
            [y + 0.008, 0.085, 0.079],
          ],
          0,
          0,
          0,
          12,
        );
      const bezel = mesh(
        new T.CylinderGeometry(0.101, 0.107, 0.033, 12),
        dark,
        bracelet,
        0,
        -0.157,
        0.095,
      );
      bezel.rotation.x = Math.PI / 2;
      ring(bracelet, trim, 0.093, 0.007, 0, -0.157, 0.115);
      ring(bracelet, glow, 0.073, 0.009, 0, -0.157, 0.12);
      const dial = mesh(
        new T.CircleGeometry(0.064, 12),
        dark,
        bracelet,
        0,
        -0.157,
        0.12,
      );
      const sigil = new T.Shape();
      sigil.moveTo(-0.031, 0.036);
      for (const p of [
        [0.031, 0.036],
        [0.009, 0],
        [0.031, -0.036],
        [-0.031, -0.036],
        [-0.009, 0],
      ])
        sigil.lineTo(...p);
      sigil.closePath();
      mesh(new T.ShapeGeometry(sigil), glow, bracelet, 0, -0.157, 0.123);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        ellipsoid(
          bracelet,
          trim,
          0.006,
          0.006,
          0.003,
          Math.sin(a) * 0.09,
          -0.157 + Math.cos(a) * 0.09,
          0.119,
        );
      }
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
      ellipsoid(knee, suit, 0.025, 0.13, 0.086, side * 0.071, -0.23, -0.049);
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
          [side * 0.071, -0.1, 0.136],
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
    const lens = ring(head, trim, 0.051, 0.007, -0.071, 0.01, 0.151);
    lens.scale.y = 0.88;
    lens.name = "ancestral-lens";
    tube(
      head,
      trim,
      [
        [-0.122, 0.02, 0.145],
        [-0.155, 0.065, 0.08],
        [-0.12, 0.1, 0.04],
      ],
      0.006,
    );
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
  // Existing action presentation and joint contract are preserved verbatim.
  const blade = mesh(
    new T.ConeGeometry(0.11, 0.85, 3),
    glow,
    limbs[1].elbow,
    0,
    -0.48,
    0.04,
  );
  blade.name = "energy-blade";
  blade.visible = false;
  const halo = mesh(
    new T.TorusGeometry(0.6, 0.025, 4, 24),
    glow,
    effects,
    0,
    0.8,
    0,
  );
  halo.rotation.x = Math.PI / 2;
  halo.visible = false;
  const pulse = mesh(
    new T.TorusGeometry(0.14, 0.015, 4, 12),
    glow,
    effects,
    0,
    1.25,
    0.5,
  );
  pulse.visible = false;
  const excluded = new Set([blade, halo, pulse, ...jets]);
  for (const pivot of staticPivots) batchStatic(pivot, excluded);
  const motion = createOperatorMotion();
  return {
    root,
    motion,
    get pose() {
      return motion.pose;
    },
    animate(c, t, options = {}) {
      const pose = motion.update(c, t, options),
        action = options.action,
        active = action?.remaining > 0,
        u = active ? 1 - action.remaining / action.duration : 0;
      root.position.set(c.x, c.y, c.z);
      root.rotation.y = c.yaw;
      body.rotation.set(pose.pitch, 0, pose.bank);
      body.position.y = pose.bob;
      head.rotation.y = pose.head;
      limbs.forEach(({ leg, knee, arm, elbow, side }, i) => {
        leg.rotation.x = pose.legs[i];
        knee.rotation.x = pose.knees[i];
        arm.rotation.x = pose.arms[i];
        elbow.rotation.x = pose.elbows[i];
        arm.rotation.z = -side * pose.spread;
      });
      if (active) {
        limbs[1].arm.rotation.x = -1.3 - Math.sin(u * Math.PI) * 0.9;
        limbs[1].arm.rotation.y = Math.sin(u * Math.PI) * 0.6;
        limbs[0].arm.rotation.x = -0.7;
      } else limbs[1].arm.rotation.y = 0;
      blade.visible =
        active && (action.id === "golpe_ruptura" || action.id === "bio_dash");
      halo.visible = active;
      halo.scale.setScalar(0.5 + u * 2.5);
      halo.rotation.z = t * 0.6;
      pulse.visible = active && !ancient && !bio;
      pulse.scale.setScalar(1 + Math.sin(u * Math.PI) * 1.3);
      for (const jet of jets) {
        const thrust =
          pose.exhaust || (bio && (c.dash > 0 || c.actionBoost > 0) ? 1.5 : 0);
        jet.visible = thrust > 0;
        jet.scale.y = thrust;
      }
    },
  };
}
