// Collision resolution remains in runtime, after this bounded framing proposal.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function createCameraMotion() {
  const value = { lookX: 0, lookY: 1.35, lookZ: 0, distance: 0, fov: 58 };
  return {
    value,
    update(c, dt, { reducedMotion = false, stature = 1 } = {}) {
      dt = clamp(dt, 0, 0.05);
      const a = 1 - Math.exp(-dt * 4);
      const fast = c.flying || c.boating,
        amount = reducedMotion ? 0 : fast ? 0.12 : 0.06;
      value.lookX += (clamp((c.vx || 0) * amount, -2, 2) - value.lookX) * a;
      value.lookZ += (clamp((c.vz || 0) * amount, -2, 2) - value.lookZ) * a;
      value.lookY +=
        (1.35 +
          (stature - 1) * 0.7 +
          (reducedMotion ? 0 : clamp((c.vy || 0) * 0.04, -0.35, 0.5)) -
          value.lookY) *
        a;
      value.distance +=
        ((!reducedMotion && c.flying
          ? Math.min(1.6, (c.speed || 0) * 0.055)
          : (stature - 1) * 2) -
          value.distance) *
        a;
      value.fov +=
        ((!reducedMotion && c.flying
          ? 58 + Math.min(5, (c.speed || 0) * 0.2)
          : 58) -
          value.fov) *
        a;
      return value;
    },
  };
}
