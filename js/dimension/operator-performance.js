// Deterministic presentation envelopes. Never changes energy, timers or movement.
const clamp = (v) => Math.max(0, Math.min(1, v));
export function samplePerformance(
  action,
  kind = "human",
  time = 0,
  reduced = false,
) {
  const active = (action?.remaining ?? 0) > 0,
    u = active
      ? clamp(1 - action.remaining / Math.max(0.001, action.duration || 1))
      : 0;
  const id = active ? action.id : null,
    scan = [
      "eco_scan",
      "bio_diagnostic",
      "senso_corrente",
      "postura_dominio",
    ].includes(id),
    select = id === "select",
    transform = id === "transform";
  const wind = active ? Math.sin(Math.PI * clamp(u / 0.32)) : 0;
  const strike = active ? Math.sin(Math.PI * clamp((u - 0.27) / 0.46)) : 0;
  const recovery = active ? Math.sin(Math.PI * u) : 0;
  const weight =
    kind === "brute" || kind === "bio" ? 1.25 : kind === "mare" ? 0.72 : 1;
  const result = {
    id,
    variant: action?.variant ?? 0,
    stage: transform
      ? u < 0.24
        ? "converge"
        : u < 0.62
          ? "assemble"
          : u < 0.84
            ? "release"
            : "settle"
      : "idle",
    converge: transform ? Math.sin(Math.PI * clamp(u / 0.72)) : 0,
    selected: action?.selected ?? null,
    u,
    active,
    scan,
    select,
    transform,
    attack: active && !scan && !select && !transform,
    twist: 0,
    lean: 0,
    crouch: 0,
    headPitch: 0,
    headYaw: 0,
    arms: [0, 0],
    armYaw: [0, 0],
    knees: [0, 0],
    legs: [0, 0],
    elbows: [0, 0],
    flare: 0,
    trail: 0,
    read: 0,
    assembly: 1,
    expression: 0,
  };
  if (!active) return result;
  if (transform) {
    result.arms = [-1.25 * recovery, -1.5 * recovery];
    result.armYaw = [0.65 * recovery, -0.75 * recovery];
    result.elbows = [-0.8 * recovery, -1.1 * recovery];
    result.headPitch = 0.16 * recovery;
    result.crouch = 0.03 * recovery;
    result.legs = [-0.4 * recovery, -0.4 * recovery];
    result.knees = [0.8 * recovery, 0.8 * recovery];
    result.twist = -0.12 * recovery;
    result.flare = Math.sin(Math.PI * u);
    result.assembly = 0.9 + 0.1 * clamp((u - 0.24) / 0.58);
    if (kind === "brute") {
      result.arms = [-0.4 * recovery, -0.6 * recovery];
      result.crouch = 0.16 * recovery;
      result.lean = -0.1 * recovery;
    } else if (kind === "mare") {
      result.arms = [-0.8 * recovery, -0.85 * recovery];
      result.twist = 0.18 * recovery;
    } else if (kind === "ancient") {
      result.arms = [-0.65 * recovery, -1.7 * recovery];
      result.twist = -0.25 * recovery;
    }
    result.expression = 0.45 * recovery;
  } else if (select) {
    result.arms = [-0.9 * recovery, -0.3 * recovery];
    result.elbows = [-1.1 * recovery, 0];
    result.headPitch = 0.2 * recovery;
    result.headYaw = -0.12 * recovery;
    result.read = recovery;
  } else if (scan) {
    result.arms = [-1.1 * recovery, -0.35 * recovery];
    result.elbows = [-0.7 * recovery, -0.25 * recovery];
    result.twist = -0.12 * recovery;
    result.headYaw = -0.12 * recovery;
    result.headPitch = 0.09 * recovery;
    result.read = recovery;
    result.knees = [0.12 * recovery, 0.06 * recovery];
    result.expression = 0.25 * recovery;
  } else {
    result.twist = (-0.35 * wind + 0.65 * strike) * weight;
    result.lean = (-0.12 * wind + 0.22 * strike) * weight;
    result.crouch = (0.055 * wind + 0.07 * strike) * weight;
    result.arms = [-0.42 * recovery, -0.65 * wind - 1.7 * strike];
    result.armYaw = [-0.15 * recovery, -0.65 * wind + 0.65 * strike];
    result.elbows = [-0.2 * recovery, -0.6 * wind + 0.25 * strike];
    result.legs = [-0.18 * strike, 0.16 * strike];
    result.knees = [0.28 * strike, 0.15 * wind];
    result.headPitch = -0.07 * strike;
    result.headYaw = -result.twist * 0.45;
    result.trail = strike;
    result.flare = strike;
    result.expression = 0.75 * recovery;
    if (kind === "brute") {
      result.arms = [-1.8 * wind - 0.4 * strike, -2.1 * wind - 0.45 * strike];
      result.lean = -0.23 * wind + 0.4 * strike;
      result.crouch = 0.06 * strike;
      result.legs = [-0.3 * strike, -0.2 * strike];
      result.knees = [0.6 * strike, 0.4 * strike];
    }
    if (kind === "mare") {
      result.arms = [-1.2 * recovery, -0.8 * recovery];
      result.twist = 0.3 * Math.sin(u * Math.PI * 2);
      result.headYaw = -result.twist * 0.5;
    }
  }
  if (result.attack && kind === "ancient") {
    if (result.variant === 1) {
      result.armYaw[1] *= -1;
      result.twist *= -1;
    } else if (result.variant === 2) {
      result.arms[1] = -1.55 * recovery;
      result.armYaw[1] = -0.14 * recovery;
      result.lean = 0.3 * strike;
      result.twist *= 0.35;
    }
  }
  if (result.attack && kind === "bio" && result.variant === 2) {
    result.arms = [-1.6 * wind - 0.5 * strike, -1.6 * wind - 0.5 * strike];
    result.crouch = 0.13 * strike;
    result.lean = -0.2 * wind + 0.35 * strike;
  }
  if (result.attack && kind === "brute") {
    // Long anticipation, short downward acceleration and visible recovery.
    const load = Math.sin(Math.PI * clamp(u / 0.62));
    const hit = Math.sin(Math.PI * clamp((u - 0.48) / 0.25));
    result.arms = [-1.35 * load - 0.25 * hit, -2.3 * load - 0.1 * hit];
    result.elbows = [-0.8 * load, -0.4 * load];
    result.twist = -0.16 * load + 0.25 * hit;
    result.lean = -0.2 * load + 0.45 * hit;
    result.crouch = 0.1 * hit;
    result.trail = hit;
    result.flare = hit;
    if (result.variant === 1) {
      result.armYaw[1] = 0.65 * recovery;
      result.twist *= 1.5;
    }
  }
  if (result.attack && result.variant === 2) {
    if (kind === "brute") {
      result.arms[0] = result.arms[1] * 0.85;
      result.elbows = [-0.55 * recovery, -0.55 * recovery];
    } else if (kind === "mare") {
      result.arms = [-0.9 * recovery, -0.9 * recovery];
      result.armYaw = [recovery, -recovery];
      result.crouch = 0.05 * recovery;
    } else if (kind === "veloz") {
      result.arms = [-0.3 * recovery, -1.65 * strike];
      result.crouch = 0.12 * wind;
      result.lean = 0.3 * strike;
    }
  }
  if (result.scan && kind === "ancient") {
    result.arms = [-0.7 * recovery, -1.2 * recovery];
    result.armYaw[1] = -0.55 * recovery;
  } else if (result.scan && kind === "bio") {
    result.arms = [-1.25 * recovery, -1.25 * recovery];
    result.elbows = [-0.85 * recovery, -0.85 * recovery];
  } else if (result.scan && kind === "mare") {
    result.arms = [-1.1 * recovery, -1.1 * recovery];
    result.armYaw = [0.75 * recovery, -0.75 * recovery];
    result.twist = reduced ? 0 : 0.2 * Math.sin(u * Math.PI * 2);
  }
  if (reduced) {
    result.twist *= 0.55;
    result.lean *= 0.55;
    result.crouch *= 0.55;
    result.assembly = 1;
  }
  return result;
}
export function facialSample(time, effort = 0, reduced = false) {
  const cycle = time % 4.7,
    blink = reduced ? 0 : Math.max(0, 1 - Math.abs(cycle - 3.65) / 0.095);
  return {
    blink,
    brow: -effort * 0.12,
    look: reduced ? 0 : Math.sin(time * 0.63) * 0.0025,
    mouth: 1 + effort * 0.45,
  };
}

// Visual anticipation only: native state/timers change immediately. Never defer controls.
export function deferAppearance(action, reduced = false) {
  return (
    !reduced &&
    action?.id === "transform" &&
    action.remaining > Math.max(0.001, action.duration) * 0.76
  );
}
