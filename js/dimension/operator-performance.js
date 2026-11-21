// Presentation only. Named pose beats use smooth interpolation, not one sine
// wave reused for wind-up, strike and recovery. Native costs/timers are untouched.
const clamp = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => {
  v = clamp(v);
  return v * v * (3 - 2 * v);
};
export function poseCurve(u, keys) {
  for (let i = 1; i < keys.length; i++)
    if (u <= keys[i][0]) {
      const [a, x] = keys[i - 1],
        [b, y] = keys[i];
      return x + (y - x) * smooth((u - a) / (b - a));
    }
  return keys.at(-1)[1];
}
const beat = (u, start, peak, end) =>
  poseCurve(u, [
    [0, 0],
    [start, 0],
    [peak, 1],
    [end, 0],
    [1, 0],
  ]);
export function samplePerformance(
  action,
  kind = "human",
  time = 0,
  reduced = false,
  civilian = false,
) {
  const active = (action?.remaining ?? 0) > 0;
  const u = active
    ? clamp(1 - action.remaining / Math.max(0.001, action.duration || 1))
    : 0;
  const id = active ? action.id : null;
  const scan = [
    "eco_scan",
    "bio_diagnostic",
    "senso_corrente",
    "postura_dominio",
  ].includes(id);
  const select = id === "select",
    transform = id === "transform",
    attack = active && !scan && !select && !transform;
  const heavy = kind === "brute",
    variant = action?.variant ?? 0;
  const weight = active
    ? poseCurve(u, [
        [0, 0],
        [0.13, 1],
        [0.8, 1],
        [1, 0],
      ])
    : 0;
  const load = active
    ? poseCurve(u, [
        [0, 0],
        [heavy ? 0.4 : 0.23, 1],
        [heavy ? 0.57 : 0.36, 0.15],
        [0.75, 0],
        [1, 0],
      ])
    : 0;
  const hit = active
    ? beat(u, heavy ? 0.44 : 0.23, heavy ? 0.6 : 0.43, heavy ? 0.83 : 0.76)
    : 0;
  const follow = active
    ? beat(u, heavy ? 0.55 : 0.34, heavy ? 0.74 : 0.64, 1)
    : 0;
  const read = active
    ? poseCurve(u, [
        [0, 0],
        [0.18, 0.2],
        [0.42, 1],
        [0.7, 1],
        [1, 0],
      ])
    : 0;
  const r = {
    id,
    variant,
    selected: action?.selected ?? null,
    u,
    active,
    scan,
    select,
    transform,
    attack,
    stage: transform
      ? u < 0.24
        ? "converge"
        : u < 0.62
          ? "assemble"
          : u < 0.84
            ? "release"
            : "settle"
      : "idle",
    beat: !active
      ? "idle"
      : u < (heavy ? 0.44 : 0.23)
        ? "anticipation"
        : u < (heavy ? 0.66 : 0.52)
          ? "execution"
          : "recovery",
    weight,
    converge: transform ? beat(u, 0, 0.25, 0.72) : 0,
    twist: 0,
    lean: 0,
    crouch: 0,
    headPitch: 0,
    headYaw: 0,
    bank: 0,
    shiftX: 0,
    shiftZ: 0,
    arms: [0, 0],
    armYaw: [0, 0],
    armRoll: [0, 0],
    knees: [0, 0],
    legs: [0, 0],
    elbows: [0, 0],
    wristPitch: 0,
    wristYaw: 0,
    wristRoll: 0,
    flare: 0,
    trail: 0,
    read: 0,
    impact: 0,
    assembly: 1,
    expression: 0,
  };
  if (!active) return r;
  if (transform) {
    const gather = poseCurve(u, [
      [0, 0],
      [0.2, 1],
      [0.44, 1],
      [0.7, 0.35],
      [1, 0],
    ]);
    const release = beat(u, 0.45, 0.7, 1);
    r.arms = [-1.05 * gather - 0.3 * release, -1.1 * gather - 0.65 * release];
    r.elbows = [-1.2 * gather, -1.5 * gather];
    r.armYaw = [0.45 * gather, -0.65 * gather];
    r.armRoll = [-0.15 * release, 0.15 * release];
    r.twist = -0.22 * gather + 0.16 * release;
    r.legs = [-0.24 * gather, 0.12 * gather];
    r.knees = [0.38 * gather, 0.2 * gather];
    r.crouch = 0.045 * gather;
    r.shiftZ = -0.025 * gather;
    r.headPitch = 0.22 * gather - 0.08 * release;
    r.headYaw = -0.25 * gather;
    r.flare = release;
    r.assembly = 0.9 + 0.1 * smooth((u - 0.24) / 0.58);
    if (kind === "ancient") {
      r.arms[1] -= 0.55 * release;
      r.wristRoll = -0.3 * release;
    }
    if (kind === "mare") {
      r.armYaw = [0.6 * release, -0.6 * release];
      r.bank = 0.035 * release;
    }
    if (heavy) {
      r.arms = [-0.5 * gather, -0.7 * gather];
      r.crouch = 0.11 * release;
      r.lean = -0.08 * gather + 0.12 * release;
    }
    if (action.returning) {
      // Release pressure, fold the kit inward and exhale into a relaxed stance.
      r.arms = [-0.65 * gather - 0.15 * release, -0.8 * gather - 0.2 * release];
      r.elbows = [-0.7 * gather, -1.1 * gather];
      r.twist *= -0.55;
      r.headPitch = 0.12 * gather;
      r.crouch *= 0.55;
      r.flare *= 0.45;
      r.assembly = 1 - 0.1 * smooth((u - 0.24) / 0.58);
    }
    r.expression = 0.4 * gather + 0.45 * release;
  } else if (select) {
    r.arms = [-0.85 * read, -0.95 * read];
    r.elbows = [-1.35 * read, -1.1 * read];
    r.armYaw = [0.45 * read, -0.55 * read];
    r.twist = -0.14 * read;
    r.headYaw = -0.22 * read;
    r.headPitch = 0.19 * read;
    r.legs = [-0.09 * read, 0.06 * read];
    r.knees = [0.13 * read, 0.08 * read];
    r.shiftX = -0.015 * read;
    r.read = read;
    r.expression = 0.18 * read;
  } else if (scan) {
    r.read = read;
    r.twist = -0.14 * load + 0.12 * follow;
    r.lean = -0.035 * load;
    r.legs = [-0.14 * read, 0.12 * read];
    r.knees = [0.22 * read, 0.13 * read];
    r.crouch = 0.025 * read;
    r.headPitch = 0.1 * load - 0.05 * read;
    r.headYaw = -0.18 * load + 0.22 * follow;
    if (kind === "ancient") {
      r.arms = [-0.8 * read, -1.2 * read];
      r.armYaw = [0.2 * read, -0.6 * read];
      r.elbows = [-0.6 * read, -0.25 * read];
      r.wristRoll = -0.25 * read;
    } else if (kind === "bio" || heavy) {
      r.arms = [-1.1 * read, -1.1 * read];
      r.elbows = [-0.85 * read, -0.85 * read];
      r.lean = 0.06 * follow;
      r.armRoll = [-0.13 * read, 0.13 * read];
    } else if (kind === "mare") {
      r.arms = [-1.05 * read, -1.15 * read];
      r.armYaw = [0.75 * read, -0.75 * read];
      r.elbows = [-0.4 * load, -0.45 * follow];
      r.twist = 0.2 * load - 0.2 * follow;
      r.bank = 0.045 * follow;
    } else {
      r.arms = [-1.05 * read, -0.45 * read];
      r.elbows = [-0.7 * read, -0.25 * read];
    }
    r.expression = 0.3 * read;
  } else {
    r.twist = -0.35 * load + 0.6 * hit + 0.13 * follow;
    r.lean = -0.1 * load + 0.2 * hit;
    r.crouch = 0.04 * load + 0.055 * hit;
    r.shiftZ = -0.025 * load + 0.055 * hit;
    r.arms = [-0.45 * weight, -1.05 * load - 1.65 * hit - 0.45 * follow];
    r.armYaw = [-0.18 * weight, -0.55 * load + 0.7 * hit];
    r.armRoll = [-0.04 * weight, 0.18 * hit];
    r.elbows = [-0.5 * weight, -0.8 * load - 0.15 * hit];
    r.legs = [-0.15 * load - 0.25 * hit, 0.12 * load + 0.15 * hit];
    r.knees = [0.3 * hit + 0.12 * load, 0.16 * load];
    r.headPitch = -0.08 * hit;
    r.headYaw = -r.twist * 0.4;
    r.trail = hit;
    r.flare = hit;
    r.impact = beat(
      u,
      heavy ? 0.57 : 0.4,
      heavy ? 0.64 : 0.49,
      heavy ? 0.87 : 0.72,
    );
    r.wristPitch = 0.22 * load - 0.35 * hit;
    r.wristYaw = -0.2 * load + 0.35 * hit;
    r.wristRoll = -0.25 * load + 0.45 * follow;
    if (kind === "ancient") {
      const sign = variant === 1 ? -1 : 1;
      r.arms[1] = -1.9 * load - 1.2 * hit - 0.7 * follow;
      r.armYaw[1] = sign * (-0.8 * load + 0.85 * hit + 0.2 * follow);
      r.twist *= sign;
      r.wristRoll = sign * (-0.45 * load + 0.6 * hit + 0.18 * follow);
      if (variant === 2) {
        r.arms[1] = -1.5 * weight;
        r.armYaw[1] = -0.1 * weight;
        r.elbows[1] = -0.9 * load + 0.1 * hit;
        r.twist *= 0.25;
        r.shiftZ = 0.09 * hit;
      }
    } else if (kind === "bio") {
      r.twist = -0.25 * load + 0.4 * hit;
      r.crouch *= 1.3;
      r.lean = -0.16 * load + 0.3 * hit;
      if (variant === 2) {
        r.arms = [-1.65 * load - 0.55 * hit, -1.7 * load - 0.6 * hit];
        r.elbows = [-0.5 * load, -0.55 * load];
        r.crouch = 0.12 * hit;
      }
    } else if (kind === "mare") {
      r.arms = [-1.1 * load - 0.85 * hit, -0.65 * load - 1.25 * hit];
      r.armYaw = [0.5 * load - 0.4 * hit, -0.5 * load + 0.5 * follow];
      r.twist = 0.3 * load - 0.3 * follow;
      r.bank = 0.04 * load - 0.04 * follow;
      r.lean = 0.09 * hit;
      if (variant === 2) {
        r.arms = [-0.9 * weight, -0.9 * weight];
        r.armYaw = [weight, -weight];
      }
    } else if (heavy) {
      r.arms = [
        -1.45 * load - 0.4 * hit,
        -2.45 * load - 0.2 * hit - 0.45 * follow,
      ];
      r.elbows = [-0.75 * load, -0.5 * load + 0.18 * hit];
      r.twist = -0.22 * load + 0.3 * hit;
      r.lean = -0.18 * load + 0.4 * hit + 0.1 * follow;
      r.crouch = 0.1 * hit + 0.03 * follow;
      r.legs = [-0.25 * hit, 0.1 * load];
      r.knees = [0.45 * hit, 0.25 * load];
      r.wristPitch = -0.18 * load + 0.55 * hit + 0.12 * follow;
      r.wristRoll = 0.08 * load;
      if (variant === 1) {
        r.armYaw[1] = 0.7 * weight;
        r.twist *= 1.4;
      }
      if (variant === 2) {
        r.arms[0] = r.arms[1] * 0.86;
        r.elbows[0] = r.elbows[1];
      }
    } else if (kind === "veloz") {
      r.arms = [-0.5 * load - 1.5 * hit, -1.3 * load - 0.3 * hit];
      r.lean = -0.1 * load + 0.26 * hit;
      r.crouch = 0.07 * load;
      if (variant === 2) {
        r.arms = [-0.3 * weight, -1.7 * hit];
        r.shiftZ = 0.08 * hit;
      }
    }
    if (civilian) {
      // Civil identity keeps its rhythm, but an empty hand never grips an invisible sword.
      r.arms[1] = -0.65 * load - 1.45 * hit - 0.25 * follow;
      r.elbows[1] = -0.95 * load + 0.12 * hit;
      r.wristRoll *= 0.35;
      r.wristYaw *= 0.5;
      r.shiftZ *= 0.7;
    }
    r.expression = 0.55 * load + 0.8 * hit;
  }
  if (reduced) {
    for (const key of [
      "twist",
      "lean",
      "crouch",
      "bank",
      "headPitch",
      "headYaw",
      "shiftX",
      "shiftZ",
      "wristPitch",
      "wristYaw",
      "wristRoll",
    ])
      r[key] *= 0.5;
    r.assembly = 1;
  }
  return r;
}
export function facialSample(time, effort = 0, reduced = false) {
  const cycle = time % 4.7;
  return {
    blink: reduced ? 0 : Math.max(0, 1 - Math.abs(cycle - 3.65) / 0.095),
    brow: -effort * 0.1,
    look: reduced ? 0 : Math.sin(time * 0.63) * 0.002,
    mouth: 1 + effort * 0.35,
  };
}
export function deferAppearance(action, reduced = false) {
  return (
    !reduced &&
    action?.id === "transform" &&
    action.remaining > Math.max(0.001, action.duration) * 0.76
  );
}
