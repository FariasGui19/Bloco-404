// js/data/ground.js
function hash(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function buildGround({ sheet, rows, legend }) {
  const pisos = {};

  const walkMask = rows.map((row, y) => {
    let mask = '';

    for (let x = 0; x < row.length; x++) {
      const def = legend[row[x]];

      if (!def) {
        console.warn(`[GROUND] Letra "${row[x]}" sem legenda em (${x},${y}).`);
        mask += '#';
        continue;
      }

      const [r, c] = def.tiles[Math.floor(hash(x, y) * def.tiles.length)];
      pisos[`${x},${y}`] = [r, c, sheet, !!def.flip];
      mask += def.walk ? '.' : '#';
    }

    return mask;
  });

  return { pisos, walkMask };
}