import * as T from "../vendor/three.module.js";
import { createSculptTools } from "./operator-sculpt.js";
import { batchStatic } from "./sector-meshes.js";
import { createOperatorMotion } from "./operator-motion.js";
import { samplePerformance } from "./operator-performance.js";
import { createOperatorVFX } from "./operator-vfx.js";

// Two actual silhouettes from the existing X10 form catalogue, not a human
// recolour. Access/duration/recharge remain exclusively in native form rules.
export function createNucleoForm(form) {
  const brute = form === "forma_bruta",
    kind = brute ? "brute" : "veloz";
  const root = new T.Group(),
    body = new T.Group(),
    head = new T.Group();
  root.name = "operator";
  body.name = "operator-rig";
  head.name = "form-head";
  root.add(body);
  body.add(head);
  root.userData.identity = {
    archetype: "nucleo_dez_forma",
    form,
    bracelet: true,
    model: kind,
  };
  root.userData.sculpt = { revision: "3B.2", form };
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const v = (x * 13 + y * 7) % 19 === 0 ? 190 : 235;
      pixels.set([v, v, v, 255], (y * 32 + x) * 4);
    }
  const map = new T.DataTexture(pixels, 32, 32);
  map.magFilter = map.minFilter = T.NearestFilter;
  map.colorSpace = T.SRGBColorSpace;
  map.generateMipmaps = false;
  map.needsUpdate = true;
  const shell = new T.MeshLambertMaterial({
      color: brute ? 0x394950 : 0x172d29,
      map,
      flatShading: true,
    }),
    dark = new T.MeshLambertMaterial({ color: 0x111b21, flatShading: true }),
    trim = new T.MeshLambertMaterial({
      color: brute ? 0xa88755 : 0x3f6654,
      flatShading: true,
    });
  const green = new T.MeshBasicMaterial({ color: 0x74ff9a }),
    core = new T.MeshBasicMaterial({ color: brute ? 0xffc554 : 0x74ff9a });
  const { loft, ellipsoid, tube, ring, mesh } = createSculptTools(),
    limbs = [],
    pivots = [body, head],
    jets = [];
  const plate = (pa, ma, w, h, d, x, y, z) =>
    loft(
      pa,
      ma,
      [
        [-h / 2, w * 0.4, d * 0.4],
        [-h * 0.3, w / 2, d / 2],
        [h * 0.3, w / 2, d / 2],
        [h / 2, w * 0.4, d * 0.4],
      ],
      x,
      y,
      z,
      8,
    );
  if (brute) {
    plate(body, shell, 0.84, 0.7, 0.48, 0, 1.19, 0);
    plate(body, dark, 0.48, 0.15, 0.3, 0, 0.84, 0);
    plate(body, trim, 0.6, 0.045, 0.36, 0, 0.91, 0);
    // No human head: the amber furnace is embedded in an industrial upper block.
    head.position.set(0, 1.56, 0);
    plate(head, shell, 0.47, 0.57, 0.36, 0, 0, -0.015);
    plate(head, dark, 0.3, 0.42, 0.05, 0, 0, 0.186);
    plate(head, trim, 0.24, 0.35, 0.03, 0, 0, 0.218);
    plate(head, core, 0.18, 0.29, 0.025, 0, 0, 0.24);
    for (const side of [-1, 1]) {
      tube(
        body,
        trim,
        [
          [side * 0.18, 1.04, 0.26],
          [side * 0.29, 1.12, 0.27],
          [side * 0.3, 1.43, 0.25],
        ],
        0.017,
      );
      const exhaust = plate(
        body,
        dark,
        0.12,
        0.39,
        0.13,
        side * 0.29,
        1.53,
        -0.24,
      );
      exhaust.rotation.z = -side * 0.28;
      for (let i = 0; i < 3; i++)
        plate(
          body,
          dark,
          0.12,
          0.018,
          0.025,
          side * 0.23,
          1.21 - i * 0.07,
          -0.25,
        );
    }
  } else {
    // Predatory, forward-biased anatomy; pointed skull and swept dorsal blades.
    ellipsoid(body, shell, 0.28, 0.31, 0.38, 0, 0.96, -0.06);
    ellipsoid(body, shell, 0.235, 0.19, 0.34, 0, 1.07, 0.17);
    ellipsoid(body, dark, 0.19, 0.16, 0.22, 0, 0.75, -0.05);
    head.position.set(0, 1.23, 0.43);
    const skull = ellipsoid(head, shell, 0.17, 0.15, 0.31, 0, 0, 0);
    skull.rotation.x = 0.25;
    const snout = ellipsoid(head, dark, 0.12, 0.075, 0.19, 0, -0.075, 0.19);
    snout.rotation.x = 0.14;
    for (const side of [-1, 1]) {
      const horn = mesh(
        head,
        shell,
        new T.ConeGeometry(0.065, 0.43, 5),
        side * 0.125,
        0.18,
        -0.15,
      );
      horn.rotation.x = -1.1;
      horn.rotation.z = -side * 0.25;
      tube(
        head,
        green,
        [
          [side * 0.1, 0.09, 0.18],
          [side * 0.065, 0.02, 0.273],
          [side * 0.035, -0.03, 0.3],
        ],
        0.012,
      );
      tube(
        body,
        green,
        [
          [side * 0.18, 1.2, 0.16],
          [side * 0.26, 1.06, 0.04],
          [side * 0.19, 0.85, -0.12],
        ],
        0.013,
      );
      for (let i = 0; i < 3; i++) {
        const spine = mesh(
          body,
          shell,
          new T.ConeGeometry(0.078, 0.48 - i * 0.05, 5),
          side * (0.17 + i * 0.02),
          1.1 - i * 0.12,
          -0.31,
        );
        spine.rotation.x = -1.0;
        spine.rotation.z = -side * 0.45;
      }
    }
    for (let i = 0; i < 3; i++) {
      const fin = mesh(
        body,
        shell,
        new T.ConeGeometry(0.085, 0.46, 5),
        0,
        1.26 - i * 0.17,
        -0.27 - i * 0.06,
      );
      fin.rotation.x = -1.02;
      tube(
        body,
        green,
        [
          [0, 1.28 - i * 0.16, -0.27 - i * 0.05],
          [0, 1.38 - i * 0.16, -0.43 - i * 0.05],
        ],
        0.011,
      );
    }
  }
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(
      side * (brute ? 0.23 : 0.2),
      brute ? 0.81 : 0.68,
      brute ? 0 : -0.06,
    );
    body.add(leg);
    loft(
      leg,
      shell,
      brute
        ? [
            [-0.31, 0.13, 0.14],
            [-0.12, 0.17, 0.17],
            [0.03, 0.14, 0.14],
          ]
        : [
            [-0.28, 0.1, 0.115],
            [-0.12, 0.145, 0.17],
            [0.03, 0.11, 0.13],
          ],
      0,
      0,
      0,
      10,
    );
    const knee = new T.Group();
    knee.position.set(0, brute ? -0.3 : -0.26, brute ? 0 : 0.09);
    leg.add(knee);
    plate(knee, trim, brute ? 0.22 : 0.12, 0.13, 0.07, 0, 0, 0.13);
    loft(
      knee,
      shell,
      brute
        ? [
            [-0.38, 0.115, 0.13],
            [-0.2, 0.13, 0.14],
            [0.01, 0.12, 0.13],
          ]
        : [
            [-0.31, 0.065, 0.09],
            [-0.12, 0.1, 0.12],
            [0.01, 0.09, 0.105],
          ],
      0,
      0,
      0,
      8,
    );
    const footY = brute ? -0.45 : -0.35;
    ellipsoid(
      knee,
      dark,
      brute ? 0.17 : 0.115,
      0.06,
      brute ? 0.24 : 0.21,
      0,
      footY,
      0.09,
    );
    for (let j = 0; j < 3; j++) {
      const claw = mesh(
        knee,
        brute ? trim : green,
        new T.ConeGeometry(0.024, 0.12, 4),
        (j - 1) * 0.066,
        footY - 0.005,
        0.28,
      );
      claw.rotation.x = Math.PI / 2;
    }
    tube(
      knee,
      green,
      [
        [side * 0.06, -0.06, 0.12],
        [side * 0.06, footY + 0.08, 0.13],
      ],
      0.01,
    );
    const arm = new T.Group();
    arm.position.set(
      side * (brute ? 0.52 : 0.31),
      brute ? 1.4 : 0.99,
      brute ? 0 : 0.09,
    );
    body.add(arm);
    if (brute) {
      plate(arm, shell, 0.32, 0.28, 0.36, side * 0.018, -0.015, 0);
      plate(arm, trim, 0.23, 0.16, 0.035, side * 0.018, -0.014, 0.2);
      for (let j = 0; j < 3; j++) {
        const stripe = plate(
          arm,
          dark,
          0.022,
          0.16,
          0.012,
          side * 0.018 + (j - 1) * 0.064,
          -0.014,
          0.222,
        );
        stripe.rotation.z = -0.45;
      }
    } else ellipsoid(arm, shell, 0.15, 0.19, 0.16, 0, -0.05, 0);
    loft(
      arm,
      dark,
      [
        [-0.31, brute ? 0.09 : 0.065, 0.075],
        [-0.05, brute ? 0.12 : 0.08, 0.09],
      ],
      0,
      0,
      0,
      8,
    );
    tube(
      arm,
      green,
      [
        [side * 0.055, -0.08, 0.075],
        [side * 0.05, -0.26, 0.07],
      ],
      0.01,
    );
    const elbow = new T.Group();
    elbow.position.y = -0.31;
    arm.add(elbow);
    loft(
      elbow,
      shell,
      [
        [-0.26, brute ? 0.13 : 0.07, 0.1],
        [-0.12, brute ? 0.18 : 0.12, 0.14],
        [0.01, brute ? 0.14 : 0.08, 0.09],
      ],
      0,
      0,
      0,
      10,
    );
    ellipsoid(elbow, dark, brute ? 0.12 : 0.075, 0.09, 0.09, 0, -0.3, 0.012);
    for (let j = 0; j < 3; j++) {
      const claw = mesh(
        elbow,
        brute ? trim : green,
        new T.ConeGeometry(0.018, brute ? 0.09 : 0.19, 4),
        (j - 1) * 0.045,
        -0.37,
        0.07,
      );
      claw.rotation.z = Math.PI;
    }
    const dial = ring(elbow, green, 0.045, 0.009, 0, -0.1, 0.142);
    dial.name = "form-bracelet-emblem";
    if (!brute) {
      const blade = mesh(
        elbow,
        shell,
        new T.ConeGeometry(0.07, 0.42, 5),
        side * 0.06,
        -0.1,
        -0.06,
      );
      blade.rotation.x = -0.7;
      tube(
        elbow,
        green,
        [
          [side * 0.06, -0.06, 0.08],
          [side * 0.08, -0.2, 0.13],
          [0, -0.29, 0.08],
        ],
        0.012,
      );
    }
    const jet = mesh(
      knee,
      core,
      new T.ConeGeometry(0.07, 0.34, 6),
      0,
      footY,
      -0.08,
    );
    jet.rotation.z = Math.PI;
    jet.visible = false;
    jets.push(jet);
    limbs.push({ leg, knee, arm, elbow, side });
    pivots.push(leg, knee, arm, elbow);
  }
  let hammer = null;
  if (brute) {
    hammer = new T.Group();
    hammer.name = "industrial-hammer";
    limbs[1].elbow.add(hammer);
    loft(
      hammer,
      trim,
      [
        [-0.8, 0.025, 0.025],
        [-0.24, 0.025, 0.025],
      ],
      0,
      0,
      0.08,
      8,
    );
    const mallet = mesh(
      hammer,
      shell,
      new T.CylinderGeometry(0.17, 0.17, 0.48, 10),
      0,
      -0.78,
      0.08,
    );
    mallet.rotation.z = Math.PI / 2;
    ring(hammer, trim, 0.172, 0.015, -0.21, -0.78, 0.08).rotation.y =
      Math.PI / 2;
  }
  const vfx = createOperatorVFX(
    body,
    limbs[1].elbow,
    brute ? 0xffc554 : 0x74ff9a,
    kind,
  );
  const excluded = new Set([...jets, ...vfx.excluded]);
  for (const p of pivots) batchStatic(p, excluded);
  if (hammer) batchStatic(hammer);
  const motion = createOperatorMotion();
  return {
    root,
    motion,
    get pose() {
      return motion.pose;
    },
    animate(c, t, options = {}) {
      const pose = motion.update(c, t, options),
        p = samplePerformance(options.action, kind, t, options.reducedMotion);
      root.position.set(c.x, c.y, c.z);
      root.rotation.y = c.yaw;
      body.rotation.set(
        (brute ? pose.pitch * 0.45 : pose.pitch * 0.6) + p.lean,
        p.twist + (pose.torsoYaw ?? 0),
        pose.bank * 0.6,
      );
      body.position.y = (brute ? 0 : 0.018) + pose.bob - p.crouch;
      const scale = p.transform ? p.assembly : 1;
      body.scale.setScalar(scale);
      head.rotation.set(p.headPitch, -p.twist * 0.4, 0);
      limbs.forEach(({ leg, knee, arm, elbow, side }, i) => {
        leg.rotation.x = pose.legs[i] * (brute ? 0.55 : 0.8) + p.legs[i];
        knee.rotation.x = pose.knees[i] + p.knees[i] + (brute ? 0 : 0.25);
        arm.rotation.set(
          pose.arms[i] * (brute ? 0.5 : 0.7) + p.arms[i],
          p.armYaw[i],
          -side * (brute ? 0.12 : 0.26),
        );
        elbow.rotation.x = pose.elbows[i] + p.elbows[i];
      });
      core.color
        .setHex(brute ? 0xffc554 : 0x74ff9a)
        .multiplyScalar(
          options.reducedMotion ? 1 : 0.94 + Math.sin(t * 3) * 0.06,
        );
      for (const j of jets) {
        j.visible = c.flying;
        j.scale.y = pose.exhaust;
      }
      vfx.update(p, t, options.reducedMotion);
      root.userData.performance = { action: p.id, phase: p.u, model: kind };
    },
  };
}
