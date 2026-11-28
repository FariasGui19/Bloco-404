// Optional environmental records. They enrich the bay and the final echo
// report, but never gate rank, mnemonic data or the bridge transition.
export const lore = Object.freeze([
  { id: 'diario', x: 6.4, y: 9.2, art: 'diario-faroleiro', scale: .4, r: .4, label: 'Diário do faroleiro' },
  { id: 'lente', x: 18.8, y: 12.2, art: 'lente-farol', scale: .95, r: .7, label: 'Lente Fresnel abandonada' },
  { id: 'mapa', x: 21.2, y: 10.4, art: 'mapa-evacuacao', scale: .82, r: .6, label: 'Mapa de evacuação' },
  { id: 'maca', x: 11.2, y: 25.2, art: 'maca-quarentena', scale: .95, r: .8, label: 'Maca de quarentena' },
  { id: 'prontuario', x: 7.4, y: 25.2, art: 'prontuario-quarentena', scale: .52, r: .45, label: 'Prontuário 07' },
  { id: 'caixa', x: 22.4, y: 22.4, art: 'caixa-sinal', scale: .56, r: .6, label: 'Caixa de sinalização' },
]);
export const loreById = (id) => lore.find((entry) => entry.id === id);
const text = {
  diario:
    'DIÁRIO — “O sino tocou sem vento. Nulo aprendeu a voz do faroleiro.”',
  lente:
    'LENTE FRESNEL — o vidro ainda guarda um eco de luz. Na armação: “cegueira negociada”. O Núcleo comprou o silêncio do farol e chamou isso de manutenção.',
  mapa:
    'MAPA — a rota oficial passa pelo terminal. A lápis, alguém contorna a âncora e traça uma seta para o mar. Ao lado: “não atravesse de costas”.',
  maca:
    'MACA — correias cortadas por dentro. O último paciente não foi contido; o corredor foi contido com ele. O lençol guarda a marca de uma mão menor.',
  prontuario:
    'PRONTUÁRIO 07 — “Ainda ouço o sino.” Alta assinada três dias antes da evacuação.',
  caixa:
    'CAIXA DE SINAL — faltam três sinalizadores. Alguém os levou para a âncora. O rádio de emergência nunca foi autorizado a transmitir.',
};
export function useLore(m, site) {
  if (!site || Math.hypot(m.x - site.x, m.y - site.y) > 1.8)
    return 'Aproxime-se do registro.';
  if (m.p.lore.includes(site.id)) return 'Registro preservado neste eco.';
  m.p.lore.push(site.id);
  return text[site.id] ?? 'Registro recuperado.';
}
