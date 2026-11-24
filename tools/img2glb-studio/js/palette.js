// Heurísticas de cor, não segmentação semântica: o fundo ainda pode influenciar.
const brightness = ({ r, g, b }) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const distance = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
const hex = color => '#' + [color.r, color.g, color.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const saturation = ({ r, g, b }) => (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1);
const looksLikeSkin = ({ r, g, b }) => r >= 75 && g >= 40 && r - g >= 8 && r - b >= 15 && r > g * 1.05 && r > b * 1.12;

// Retorna apenas papéis para os quais encontrou cores distintas. O chamador mantém
// a cor anterior nos demais; uma imagem monocromática não tinge tudo da mesma cor.
export function paletteFromPixels(pixels, entity = 'human') {
  const buckets = new Map();
  let usable = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b, alpha] = pixels.subarray(i, i + 4);
    const light = brightness({ r, g, b });
    const neutralExtreme = Math.max(r, g, b) - Math.min(r, g, b) < 22 && (light < 75 || light > 235);
    if (alpha < 128 || light < 42 || Math.max(r, g, b) < 55 || neutralExtreme) continue;
    usable++;
    const key = [r, g, b].map(v => Math.floor(v / 32)).join(',');
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++; bucket.r += r; bucket.g += g; bucket.b += b; buckets.set(key, bucket);
  }
  if (!usable) return {};
  // Agrupa tons próximos antes de escolher, para que sombras de uma mesma área
  // não ocupem os três seletores. Despreza ruído muito pequeno da imagem.
  const bins = [...buckets.values()].filter(b => b.count >= Math.max(1, usable * 0.002)).map(b => ({ count: b.count, r: b.r / b.count, g: b.g / b.count, b: b.b / b.count })).sort((a, b) => b.count - a.count);
  const colors = [];
  for (const bin of bins) {
    const match = colors.find(color => distance(color, bin) < 42);
    if (!match) { colors.push({ ...bin }); continue; }
    const total = match.count + bin.count;
    for (const channel of ['r', 'g', 'b']) match[channel] = (match[channel] * match.count + bin[channel] * bin.count) / total;
    match.count = total;
  }
  const maxCount = Math.max(...colors.map(c => c.count));
  const prominence = c => Math.sqrt(c.count / maxCount);
  const choose = (list, score) => list.reduce((best, c) => !best || score(c) > score(best) ? c : best, null);
  const result = {}, chosen = [];
  const distinct = c => chosen.every(other => distance(c, other) >= 55);
  // Para personagens fantásticos sem tom de pele convencional, aproveita a
  // cor cromática mais representativa em vez de manter uma pele genérica.
  const body = (entity === 'human' && choose(colors.filter(looksLikeSkin), c => prominence(c) * 2 + saturation(c) * 0.4))
    || choose(colors.filter(c => saturation(c) >= 0.15), c => prominence(c) + saturation(c) * 0.9);
  if (body) { result.body = hex(body); chosen.push(body); }
  // Favorece uma área clara para roupa, mas sem premiar um pixel claro isolado.
  const clothing = choose(colors.filter(distinct), c => prominence(c) * 0.85 + brightness(c) / 255 * 1.35);
  if (clothing) { result.clothes = hex(clothing); chosen.push(clothing); }
  // Entre as cores restantes, favorece um destaque com alguma saturação.
  const detail = choose(colors.filter(distinct), c => prominence(c) * 0.6 + saturation(c) * 1.6 + brightness(c) / 255 * 0.2);
  if (detail) result.detail = hex(detail);
  return result;
}

export function extractPalette(image, entity = 'human') {
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, 128 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return paletteFromPixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data, entity);
}
