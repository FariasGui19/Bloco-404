// Quantização simples: não identifica semântica (pele, roupa etc.).
export function extractPalette(image) {
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, 128 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Map();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const key = [pixels[i], pixels[i + 1], pixels[i + 2]].map(v => Math.floor(v / 32)).join(',');
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++; bucket.r += pixels[i]; bucket.g += pixels[i + 1]; bucket.b += pixels[i + 2]; buckets.set(key, bucket);
  }
  return [...buckets.values()].sort ( (a, b) => b.count - a.count ).slice(0, 3).map(b => '#' + [b.r, b.g, b.b].map(v => Math.round(v / b.count).toString(16).padStart(2, '0')).join(''));
}
