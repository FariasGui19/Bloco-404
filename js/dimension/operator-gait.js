// Four-beat creature gait, independent of attack choreography and human arms.
// Forelimb reach is phase-offset from hindlimbs; only grounded travel uses it.
export function sampleCreatureGait(phase, speed, reduced = false) {
  const m = Math.min(1, Math.max(0, speed) / 6);
  const legs = [],
    knees = [],
    arms = [],
    elbows = [];
  for (let i = 0; i < 2; i++) {
    const hind = Math.sin(phase + i * Math.PI),
      fore = Math.sin(phase + i * Math.PI + 0.9);
    legs.push(-0.12 * m + hind * 0.5 * m);
    knees.push(0.12 * m + Math.max(0, -hind) * 0.75 * m);
    arms.push(-0.08 * m + fore * 0.52 * m);
    elbows.push(-0.08 + Math.max(0, fore) * 0.6 * m);
  }
  return {
    legs,
    knees,
    arms,
    elbows,
    bob: reduced ? 0 : Math.sin(phase * 2) * 0.011 * m,
    lean: 0.055 * m,
    roll: reduced ? 0 : Math.sin(phase) * 0.035 * m,
    reach: 1.4,
    contact: Math.max(0, Math.cos(phase * 2)),
  };
}
