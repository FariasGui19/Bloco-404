
const sprites = new Map();

export async function loadSprites(list) {
  return Promise.all(list.map(({ id, src }) => loadSprite(id, src)));
}

function loadSprite(id, src) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => { sprites.set(id, image); resolve(image); };
    image.onerror = () => { resolve(null); };
    image.src = src;
  });
}

export function getSprite(id) {
  return sprites.get(id) ?? null;
}