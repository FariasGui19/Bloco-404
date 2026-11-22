// Combat/containment layer for the bay mission. Data stays dependency-free so
// the model can use collision radii without import cycles.
export const combatProps = Object.freeze([
  { id: 'casulo-a', x: 26.2, y: 15.2, art: 'casulo-mare', scale: .7, r: .55, kind: 'pod', label: 'Casulo de resina' },
  { id: 'casulo-b', x: 4.4, y: 18.1, art: 'casulo-mare', scale: .7, r: .55, kind: 'pod', label: 'Casulo de resina' },
  { id: 'eco', x: 13.0, y: 15.2, art: 'eco-operador', scale: .72, r: .4, kind: 'mirror', label: 'Eco do operador' },
  { id: 'painel', x: 19.0, y: 19.0, art: 'painel-contencao', scale: .55, r: .5, kind: 'panel', label: 'Painel de contenção' },
  { id: 'cabo', x: 15.2, y: 12.6, art: 'cabo-energia', scale: .6, r: .45, kind: 'hazard', label: 'Cabo energizado' },
  { id: 'lanterna', x: 22.5, y: 23.5, art: 'lanterna-sinal', scale: .52, r: .4, kind: 'light', label: 'Lanterna de sinal' },
  { id: 'porta', x: 24.5, y: 22.5, art: 'porta-fenda', scale: .9, r: .7, kind: 'door', label: 'Porta da fenda' },
]);
export const pods = Object.freeze(combatProps.filter((p) => p.kind === 'pod').map(({ x, y }) => ({ x, y })));
export const isInteractiveCombat = (p) => Boolean(p && ['hazard', 'light', 'mirror', 'panel'].includes(p.kind));
export function useCombatProp(m, prop, enemies = []) {
  if (!prop || Math.hypot(m.x - prop.x, m.y - prop.y) > 1.8) return 'Aproxime-se do painel.';
  const flags = (m.p.containment ??= {});
  if (prop.kind === 'hazard') {
    if (flags.cabo) return 'O cabo já está isolado. A passagem está segura.';
    flags.cabo = true;
    m.stress = Math.max(0, m.stress - 12);
    return 'CABO ISOLADO — a resina conduzia a descarga. Tensão aliviada; a passagem central está segura.';
  }
  if (prop.kind === 'light') {
    flags.lanterna = !flags.lanterna;
    return flags.lanterna
      ? 'LANTERNA ACESA — o salão da âncora perde tensão, mas sua silhueta fica mais visível para os infectados.'
      : 'LANTERNA APAGADA — a escuridão volta a esconder você e a apertar o peito.';
  }
  if (prop.kind === 'mirror') {
    if (flags.eco) return 'O eco repete seu último passo. Não há mais nada a aprender aqui.';
    flags.eco = true;
    m.stress = Math.max(0, m.stress - 18);
    return 'ECO — o operador de costas para você tem o seu casaco. Quando ele vira, o rosto é uma parede de sal. “Não fui eu que abri o portão.”';
  }
  if (prop.kind === 'panel') {
    flags.painel = true;
    const alive = enemies.filter((e) => !e.dead).length;
    const podsLeft = pods.length;
    return `PAINEL DE CONTENÇÃO — ameaças ativas ${alive}/${enemies.length || 2} · casulos ${podsLeft} · ciclo de reforma 30s. A resina aprende cada pulso seu.`;
  }
  return 'A porta da fenda pulsa, mas ainda não cede.';
}
