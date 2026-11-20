// Presentation only: never writes controller, energy, collision or save data.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
export function createOperatorMotion() {
  let lastTime = null,
    lastYaw = null,
    phase = 0,
    wasGrounded = true,
    impact = 0;
  const pose = {
    state: "idle",
    torsoYaw: 0,
    hipRoll: 0,
    headPitch: 0,
    pitch: 0,
    bank: 0,
    bob: 0,
    head: 0,
    exhaust: 0,
    legs: [0, 0],
    knees: [0, 0],
    arms: [0, 0],
    elbows: [0, 0],
    spread: 0.12,
  };
  return {
    pose,
    update(
      c,
      time,
      { reducedMotion = false, archetype = null, gait = 1 } = {},
    ) {
      const dt = lastTime === null ? 0 : clamp(time - lastTime, 0, 0.05);
      lastTime = time;
      const turn =
        lastYaw === null
          ? 0
          : Math.atan2(Math.sin(c.yaw - lastYaw), Math.cos(c.yaw - lastYaw)) /
            Math.max(dt, 0.001);
      lastYaw = c.yaw;
      const swim = c.mode === "NADO" || c.mode === "SUBMERSO",
        climb = c.mode === "ESCALADA",
        speed = Math.max(0, c.speed || 0);
      const state = c.boating
        ? "boat"
        : c.flying
          ? "flight"
          : swim
            ? "swim"
            : climb
              ? "climb"
              : !c.grounded
                ? c.vy > 0
                  ? "rise"
                  : "fall"
                : speed > 0.25
                  ? "walk"
                  : "idle";
      if (c.grounded && !wasGrounded) impact = 0.13;
      wasGrounded = c.grounded;
      impact *= Math.exp(-dt * 13);
      phase += dt * gait * (swim ? 5 : climb ? 6 : Math.min(18, speed * 1.9));
      const a = 1 - Math.exp(-dt * 12),
        moving = Math.min(1, speed / 5),
        flight = state === "flight";
      pose.state = state;
      pose.pitch = mix(
        pose.pitch,
        flight
          ? clamp(speed * 0.027 - (c.vy || 0) * 0.018, -0.18, 0.72)
          : swim
            ? 0.85
            : climb
              ? -0.12
              : state === "boat"
                ? -0.1
                : 0,
        a,
      );
      pose.bank = mix(
        pose.bank,
        flight && !reducedMotion ? clamp(-turn * 0.08, -0.42, 0.42) : 0,
        a,
      );
      pose.bob = reducedMotion
        ? 0
        : (state === "walk"
            ? Math.abs(Math.sin(phase)) * 0.045 * moving
            : state === "idle"
              ? Math.sin(time * 1.7) * 0.007 + Math.sin(time * 0.83) * 0.003
              : 0) - impact;
      const weight =
        archetype === "motor_bio_forja"
          ? 0.7
          : archetype === "mare_astral"
            ? 1.15
            : 1;
      pose.torsoYaw = reducedMotion
        ? 0
        : state === "walk"
          ? Math.sin(phase) * 0.055 * moving * weight
          : state === "swim"
            ? Math.sin(phase * 0.5) * 0.075
            : Math.sin(time * 0.77) * 0.008;
      pose.hipRoll = reducedMotion
        ? 0
        : state === "walk"
          ? Math.cos(phase) * 0.022 * moving
          : 0;
      pose.headPitch = reducedMotion ? 0 : Math.sin(time * 1.3) * 0.012;
      pose.head = reducedMotion
        ? 0
        : Math.sin(time * 0.71) * 0.026 + Math.sin(time * 1.57) * 0.009;
      pose.spread = mix(pose.spread, flight ? 0.55 : swim ? 0.4 : 0.12, a);
      pose.exhaust = flight
        ? (0.65 + Math.min(1, speed / 25) * 0.65) *
          (reducedMotion ? 1 : 1 + Math.sin(time * 28) * 0.08)
        : 0;
      for (let i = 0; i < 2; i++) {
        const step = Math.sin(phase + i * Math.PI),
          swing = step * 0.68 * moving;
        const leg = flight
          ? 0.2
          : swim
            ? step * 0.4
            : climb
              ? step * 0.65
              : state === "boat"
                ? -1.2
                : state === "rise"
                  ? -0.4
                  : state === "fall"
                    ? 0.22
                    : state === "walk"
                      ? swing
                      : 0;
        const arm = flight
          ? -0.72
          : swim
            ? -1.4 + step * 0.6
            : climb
              ? -2.2 + step * 0.55
              : state === "boat"
                ? -0.9
                : state === "rise"
                  ? -0.65
                  : state === "walk"
                    ? -swing * 0.75
                    : 0;
        pose.legs[i] = mix(pose.legs[i], leg, a);
        pose.arms[i] = mix(pose.arms[i], arm, a);
        pose.knees[i] = mix(
          pose.knees[i],
          state === "boat"
            ? 1.35
            : flight
              ? 0.4
              : state === "rise"
                ? 0.85
                : Math.max(0, -step) * moving * 0.85,
          a,
        );
        pose.elbows[i] = mix(
          pose.elbows[i],
          flight
            ? -0.5
            : swim
              ? -0.45
              : climb
                ? -0.8
                : state === "boat"
                  ? -0.65
                  : state === "walk"
                    ? -0.22 - Math.max(0, step) * moving * 0.32
                    : -0.18,
          a,
        );
      }
      return pose;
    },
  };
}
