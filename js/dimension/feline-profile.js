// Visual phenotype only: never changes controller size, speed, damage or form ID.
export function sampleFelineProfile(p, speed = 0, reduced = false) {
  const aggression = p.attack ? Math.max(p.trail, p.impact ?? 0) : 0;
  const travel = Math.min(1, Math.max(0, speed) / 8) * (1 - aggression);
  const amplitude = reduced ? 0.45 : 1;
  return {
    aggression,
    width: 1 - 0.055 * travel + 0.14 * aggression * amplitude,
    height: 1 + 0.045 * aggression * amplitude,
    length: 1 + 0.045 * travel + 0.09 * aggression * amplitude,
    mane: 1 + 0.2 * aggression * amplitude,
    jaw: 0.16 * aggression * amplitude,
    crouch: 0.025 * aggression * amplitude,
  };
}
