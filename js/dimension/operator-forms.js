import { sampleFelineProfile } from "./feline-profile.js";
import { sampleCreatureGait } from "./operator-gait.js";
import { createLatticeBracelet } from "./operator-bracelet.js";
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
  const steamMaterial = brute
    ? new T.MeshBasicMaterial({
        color: 0xb0c5c5,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
      })
    : null;
  const { loft, ellipsoid, tube, ring, mesh } = createSculptTools(),
    limbs = [],
    pivots = [body, head],
    jets = [],
    bracelets = [],
    pistons = [],
    steam = new T.Group();
  steam.name = "industrial-exhaust";
  body.add(steam);
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
  const mane = new T.Group(),
    jaw = new T.Group();
  mane.name = "alien-lion-mane";
  jaw.name = "feline-jaw";
  if (!brute) {
    head.add(mane);
    head.add(jaw);
  }
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
      // Service fasteners, forward ribs and sliding knee/hip actuators.
      for (let i = 0; i < 3; i++) {
        ellipsoid(
          body,
          trim,
          0.018,
          0.018,
          0.012,
          side * 0.32,
          1.05 + i * 0.15,
          0.248,
        );
        plate(
          body,
          dark,
          0.12,
          0.022,
          0.025,
          side * 0.22,
          1.1 + i * 0.075,
          0.26,
        );
      }
      const piston = new T.Group();
      piston.position.set(side * 0.33, 0.86, 0.08);
      body.add(piston);
      loft(
        piston,
        trim,
        [
          [-0.23, 0.022, 0.022],
          [0.14, 0.022, 0.022],
        ],
        0,
        0,
        0,
        6,
      );
      loft(
        piston,
        dark,
        [
          [-0.22, 0.037, 0.036],
          [-0.05, 0.037, 0.036],
        ],
        0,
        0,
        0,
        8,
      );
      batchStatic(piston);
      pistons.push(piston);
      for (let j = 0; j < 2; j++) {
        const puff = ellipsoid(
          steam,
          dark,
          0.045 + j * 0.018,
          0.07 + j * 0.025,
          0.045,
          side * 0.34,
          1.8 + j * 0.12,
          -0.28,
        );
        puff.material = steamMaterial;
      }
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
    const skull = ellipsoid(head, shell, 0.19, 0.15, 0.235, 0, 0, 0);
    skull.rotation.x = 0.25;
    const snout = ellipsoid(head, shell, 0.135, 0.068, 0.115, 0, -0.055, 0.21);
    snout.rotation.x = 0.06;
    jaw.position.set(0, -0.08, 0.17);
    ellipsoid(jaw, dark, 0.125, 0.045, 0.13, 0, -0.022, 0.025);
    ellipsoid(head, dark, 0.05, 0.028, 0.035, 0, -0.035, 0.315);
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI * 1.4 - Math.PI * 0.2;
      const tuft = ellipsoid(
        mane,
        i % 2 ? trim : shell,
        0.09,
        0.16,
        0.12,
        Math.cos(a) * 0.19,
        Math.sin(a) * 0.15 - 0.015,
        -0.12,
      );
      tuft.rotation.z = a - Math.PI / 2;
    }
    for (const side of [-1, 1]) {
      ellipsoid(head, green, 0.047, 0.013, 0.012, side * 0.105, 0.025, 0.217);
      const ear = mesh(
        head,
        shell,
        new T.ConeGeometry(0.065, 0.14, 4),
        side * 0.16,
        0.16,
        -0.055,
      );
      ear.rotation.z = -side * 0.3;
      const fang = mesh(
        jaw,
        trim,
        new T.ConeGeometry(0.018, 0.07, 5),
        side * 0.075,
        -0.015,
        0.11,
      );
      fang.rotation.z = Math.PI;
    }
    for (const side of [-1, 1]) {
      const horn = mesh(
        head,
        shell,
        new T.ConeGeometry(0.05, 0.23, 5),
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
    if (side === -1)
      bracelets.push(createLatticeBracelet(elbow, { industrial: brute }));
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
      new T.CylinderGeometry(0.21, 0.21, 0.62, 10),
      0,
      -0.78,
      0.08,
    );
    mallet.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      ring(hammer, trim, 0.214, 0.018, side * 0.27, -0.78, 0.08).rotation.y =
        Math.PI / 2;
      const face = mesh(
        hammer,
        dark,
        new T.CylinderGeometry(0.18, 0.18, 0.025, 8),
        side * 0.32,
        -0.78,
        0.08,
      );
      face.rotation.z = Math.PI / 2;
      tube(
        hammer,
        core,
        [
          [side * 0.1, -0.98, 0.12],
          [side * 0.1, -0.85, 0.28],
          [side * 0.1, -0.65, 0.2],
        ],
        0.012,
      );
    }
    hammer.scale.set(1.1, 1.06, 1.1);
  }
  const vfx = createOperatorVFX(
    body,
    limbs[1].elbow,
    brute ? 0xffc554 : 0x74ff9a,
    kind,
    { source: bracelets[0]?.root },
  );
  batchStatic(steam);
  steam.visible = false;
  const excluded = new Set([...jets, ...vfx.excluded]);
  if (!brute) {
    batchStatic(mane);
    batchStatic(jaw);
  }
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
      const pose = motion.update(c, t, {
          ...options,
          gait: brute ? 0.6 : 0.65,
        }),
        p = samplePerformance(options.action, kind, t, options.reducedMotion);
      const terrestrial =
        c.grounded &&
        !c.flying &&
        !c.boating &&
        !["NADO", "SUBMERSO", "ESCALADA"].includes(c.mode);
      const gait =
        !brute && terrestrial
          ? sampleCreatureGait(pose.phase, c.speed ?? 0, options.reducedMotion)
          : null;
      const feline = !brute
        ? sampleFelineProfile(p, c.speed, options.reducedMotion)
        : null;
      const blend = 1 - p.weight * 0.92;
      root.position.set(c.x, c.y, c.z);
      root.rotation.y = c.yaw;
      const running =
        !c.flying && c.grounded && !c.boating
          ? Math.min(1, (c.speed ?? 0) / 8)
          : 0;
      body.rotation.set(
        (brute ? pose.pitch * 0.45 : pose.pitch * 0.6 + (gait?.lean ?? 0)) +
          p.lean,
        p.twist + (pose.torsoYaw ?? 0) * blend,
        pose.bank * 0.6 + (gait?.roll ?? 0) * blend + p.bank,
      );
      body.position.set(
        p.shiftX,
        (brute ? 0 : 0.018) +
          (gait ? gait.bob : pose.bob * (brute ? 0.45 : 1)) * blend -
          p.crouch -
          (feline?.crouch ?? 0),
        p.shiftZ,
      );
      body.scale.set(
        brute ? 1.2 : feline.width,
        brute ? 1.28 : feline.height,
        brute ? 1.13 : feline.length,
      );
      if (feline) {
        mane.scale.setScalar(feline.mane);
        jaw.rotation.x = feline.jaw;
      }
      pistons.forEach((piston, i) => {
        piston.position.y =
          0.86 +
          (options.reducedMotion
            ? 0
            : Math.sin(pose.phase + i * Math.PI) * running * 0.025 +
              p.impact * 0.025);
      });
      steam.visible =
        brute &&
        !options.reducedMotion &&
        (p.impact > 0.08 ||
          p.scan ||
          p.transform ||
          (!running && Math.sin(t * 2) > 0.45));
      steam.position.y = options.reducedMotion ? 0 : (t * 0.35) % 0.12;
      steam.scale.setScalar(1 + p.impact * 0.8);
      if (hammer) {
        hammer.rotation.set(
          p.wristPitch,
          p.wristYaw,
          p.wristRoll +
            (options.reducedMotion
              ? 0
              : Math.sin(pose.phase) * running * 0.035 * blend),
        );
      }
      head.rotation.set(p.headPitch, -p.twist * 0.4, 0);
      limbs.forEach(({ leg, knee, arm, elbow, side }, i) => {
        leg.rotation.x =
          (gait ? gait.legs[i] : pose.legs[i] * (brute ? 0.55 : 0.8)) * blend +
          p.legs[i];
        knee.rotation.x =
          (gait ? gait.knees[i] : pose.knees[i]) * blend + p.knees[i];
        arm.scale.y = gait ? gait.reach : 1;
        arm.rotation.set(
          (gait ? gait.arms[i] : pose.arms[i] * (brute ? 0.5 : 0.7)) * blend +
            p.arms[i],
          p.armYaw[i],
          -side * (brute ? 0.12 : gait ? 0.1 : 0.26) + p.armRoll[i],
        );
        elbow.rotation.x =
          (gait ? gait.elbows[i] : pose.elbows[i]) * blend + p.elbows[i];
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
      bracelets.forEach((bracelet) =>
        bracelet.update(p, options.reducedMotion),
      );
      vfx.update(p, t, options.reducedMotion, c);
      root.userData.performance = {
        action: p.id,
        phase: p.u,
        model: kind,
        stage: p.stage,
        variant: p.variant,
        beat: p.beat,
        gait: gait ? "four-beat" : pose.state,
        blend,
        feline,
      };
    },
  };
}
