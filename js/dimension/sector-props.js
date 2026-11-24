import * as T from "../vendor/three.module.js";

// Adereços pintados do Limiar (lote 11). Cada placa, estandarte, lanterna,
// caixote e a estátua é um billboard com a base encostada no terreno. Lanterna,
// caixote e estátua respondem ao E com mudança visível no mundo: luz, marca de
// saque e halo, mais um anel de choque no chão em qualquer interação.
export const LIMIAR_PROPS = Object.freeze([
  { id: "marco-chegada", art: "pilar-runa-arte", x: -1.6, z: 1.2, height: 1.9, kind: "decor" },
  { id: "lanterna-0", art: "lanterna-limiar", x: 1.7, z: 0.6, height: 0.85, base: 0.6, kind: "lantern" },
  { id: "placa-1", art: "placa-limiar", x: 6.6, z: -4.2, height: 2.1, kind: "decor" },
  { id: "lanterna-1", art: "lanterna-limiar", x: 9.7, z: -6.2, height: 0.85, base: 0.6, kind: "lantern" },
  { id: "estandarte-1", art: "estandarte-limiar", x: 8.4, z: -12.0, height: 2.7, kind: "decor" },
  { id: "caixote-1", art: "caixote-limiar", x: 12.6, z: -8.2, height: 0.9, kind: "crate" },
  { id: "placa-2", art: "placa-limiar", x: 13.6, z: -17.9, height: 2.1, kind: "decor" },
  { id: "lanterna-2", art: "lanterna-limiar", x: 10.3, z: -15.8, height: 0.85, base: 0.6, kind: "lantern" },
  { id: "estandarte-2", art: "estandarte-limiar", x: 20.4, z: -22.3, height: 2.7, kind: "decor" },
  { id: "caixote-2", art: "caixote-limiar", x: 16.4, z: -26.4, height: 0.9, kind: "crate" },
  { id: "estatua-limiar", art: "estatua-limiar", x: 26.6, z: -24.6, height: 2.6, kind: "shrine" },
  { id: "lanterna-3", art: "lanterna-limiar", x: 27.4, z: -28.6, height: 0.85, base: 0.6, kind: "lantern" },
]);

export const PROP_PROMPTS = Object.freeze({
  lantern: "E · ACENDER LANTERNA",
  crate: "E · ABRIR CAIXOTE",
  shrine: "E · DESPERTAR A ESTÁTUA",
});

const DIM_LANTERN = 0x7d8a90,
  LIT_LANTERN = 0xffd9a4,
  DIM_CRATE = 0xffffff,
  OPEN_CRATE = 0x9fa8a6,
  DIM_SHRINE = 0xdfe6e2,
  LIT_SHRINE = 0xa8fff0;

function softGlowTexture() {
  const size = 64,
    canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d"),
    grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  tex.magFilter = tex.minFilter = T.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

const dist = (c, x, z) => Math.hypot((c?.x ?? 0) - x, (c?.z ?? 0) - z);

export function createLimiarProps({
  scene,
  heightAt = () => 0,
  state = null,
  billboard = () => null,
  frames = () => [],
  halo = null,
  sigil = null,
  postMaterial = null,
  reach = 2.9,
} = {}) {
  const group = new T.Group();
  group.name = "limiar-props";
  scene?.add(group);

  const flags = state ? (state.progress.flags ??= {}) : null;
  const saved = new Set(Array.isArray(flags?.limiarProps) ? flags.limiarProps : []);

  // Halo suave: a runa pintada (sigil) é um selo grande; para lanterna e
  // caixote um gradiente radial pequeno lê melhor que o mandala inteiro.
  // Lote 12: o halo pintado substitui o gradiente gerado em canvas quando a
  // folha carrega. O procedural fica de reserva — é o caso dos testes em Node.
  const soft =
    halo ?? (typeof document === "undefined" ? null : softGlowTexture());

  function glowSprite(tint, scale, parent, y, map = soft) {
    if (!map) return null;
    const glow = new T.Sprite(
      new T.SpriteMaterial({
        map,
        color: tint,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: T.AdditiveBlending,
        fog: true,
      }),
    );
    glow.scale.setScalar(scale);
    glow.position.y = y;
    glow.renderOrder = 5;
    parent.add(glow);
    return glow;
  }

  const props = LIMIAR_PROPS.map((def) => {
    const tex = billboard(def.art);
    const root = new T.Group();
    root.name = def.id;
    const y = heightAt(def.x, def.z);
    root.position.set(def.x, y, def.z);
    group.add(root);
    let sprite = null;
    if (tex) {
      sprite = new T.Sprite(
        new T.SpriteMaterial({
          map: tex,
          transparent: true,
          alphaTest: 0.12,
          depthWrite: true,
          fog: true,
          color: def.kind === "lantern" ? DIM_LANTERN : 0xffffff,
        }),
      );
      sprite.position.y = def.base ? def.base : 0.01;
      sprite.center.set(0.5, 0);
      const fit = () => {
        const iw = tex.image?.width || 1,
          ih = tex.image?.height || 1;
        sprite.scale.set(def.height * (iw / ih), def.height, 1);
      };
      fit();
      const img = tex.userData?.image;
      if (img && !img.complete) img.addEventListener("load", fit, { once: true });
      root.add(sprite);
    }
    // Lanterna pendurada em um poste: sem apoio ela parece flutuar no ar.
    if (def.kind === "lantern") {
      const post = new T.Mesh(
        new T.CylinderGeometry(0.055, 0.075, def.base + 0.06, 6),
        postMaterial ?? new T.MeshLambertMaterial({ color: 0x6d5a46, flatShading: true }),
      );
      post.position.y = (def.base + 0.06) / 2;
      root.add(post);
      const arm = new T.Mesh(
        new T.BoxGeometry(0.5, 0.045, 0.045),
        post.material,
      );
      arm.position.set(0.18, def.base + 0.02, 0);
      root.add(arm);
    }
    const shrine = def.kind === "shrine";
    const glow =
      def.kind === "decor"
        ? null
        : glowSprite(
            shrine ? 0x9fffe4 : def.kind === "lantern" ? 0xffc887 : 0xffcf9a,
            shrine ? 1.6 : def.kind === "lantern" ? 0.95 : 0.9,
            root,
            shrine ? def.height * 0.86 : (def.base ?? 0) + def.height * 0.52,
            shrine ? sigil ?? soft : soft,
          );
    // Lote 12: estandarte tremula em quatro quadros e a chama da lanterna é um
    // flipbook aditivo por cima do vidro. Sem as folhas, os dois continuam
    // exatamente como no lote 11.
    let flutter = null;
    if (sprite && def.art === "estandarte-limiar") {
      const strip = frames("estandarte-tremura", 4);
      if (strip.length) {
        // Já troca a arte no nascimento: o pano do lote 12 tem mastro próprio.
        sprite.material.map = strip[0];
        flutter = { frames: strip, base: tex, index: -1 };
      }
    }
    let flame = null;
    if (def.kind === "lantern") {
      const strip = frames("lanterna-chama", 4);
      if (strip.length) {
        flame = new T.Sprite(
          new T.SpriteMaterial({
            map: strip[0],
            transparent: true,
            alphaTest: 0.1,
            depthWrite: false,
            blending: T.AdditiveBlending,
            fog: true,
            opacity: 0,
          }),
        );
        // A lanterna já vem com a chama pintada no vidro: o flipbook entra no
        // mesmo ponto, aditivo e pequeno, só para ela respirar.
        flame.center.set(0.5, 0.42);
        flame.scale.setScalar(def.height * 0.4);
        flame.position.set(0, (def.base ?? 0) + def.height * 0.6, 0.02);
        flame.renderOrder = 3;
        root.add(flame);
        flame.userData.frames = strip;
        flame.userData.index = 0;
      }
    }
    const on = saved.has(def.id);
    const prop = {
      def,
      root,
      sprite,
      glow,
      flame,
      flutter,
      active: on,
      phase: (def.x * 0.7 + def.z * 0.3) % 6.28,
      marker: null,
    };
    if (on) applyLook(prop);
    return prop;
  });

  function applyLook(prop) {
    const { kind } = prop.def;
    if (prop.sprite) {
      prop.sprite.material.color.set(
        kind === "lantern"
          ? prop.active
            ? LIT_LANTERN
            : DIM_LANTERN
          : kind === "crate"
            ? prop.active
              ? OPEN_CRATE
              : DIM_CRATE
            : kind === "shrine"
              ? prop.active
                ? LIT_SHRINE
                : DIM_SHRINE
              : 0xffffff,
      );
    }
    if (prop.flame)
      prop.flame.material.opacity =
        prop.active && kind === "lantern" ? 0.95 : 0;
    if (prop.glow)
      prop.glow.material.opacity = prop.active
        ? kind === "lantern" || kind === "shrine"
          ? 0.5
          : 0.32
        : 0;
    // Caixote aberto deixa uma marca de saque flutuando acima dele.
    if (kind === "crate" && prop.active && !prop.marker) {
      const marker = new T.Mesh(
        new T.OctahedronGeometry(0.11, 0),
        new T.MeshBasicMaterial({ color: 0xffc887 }),
      );
      marker.position.y = prop.def.height + 0.35;
      marker.name = "loot-marker";
      prop.root.add(marker);
      prop.marker = marker;
    }
  }

  // Anel de choque: toda interação deixa uma onda visível no chão.
  const rings = Array.from({ length: 4 }, () => {
    const ring = new T.Mesh(
      new T.RingGeometry(0.55, 0.78, 22),
      new T.MeshBasicMaterial({
        color: 0xbafff0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    ring.renderOrder = 4;
    group.add(ring);
    return { mesh: ring, age: 1 };
  });
  let ringCursor = 0;
  function pulse(x, z, color = 0xbafff0) {
    const slot = rings[ringCursor++ % rings.length];
    slot.age = 0;
    slot.mesh.visible = true;
    slot.mesh.material.color.set(color);
    slot.mesh.position.set(x, heightAt(x, z) + 0.08, z);
    slot.mesh.scale.setScalar(1);
    slot.mesh.material.opacity = 0.7;
  }

  const interactables = props.filter((p) => p.def.kind !== "decor");

  const nearest = (c) =>
    interactables
      .filter((p) => !p.active && dist(c, p.def.x, p.def.z) <= reach)
      .sort((a, b) => dist(c, a.def.x, a.def.z) - dist(c, b.def.x, b.def.z))[0] ??
    null;

  function activate(prop) {
    if (!prop || prop.active) return null;
    prop.active = true;
    if (flags) flags.limiarProps = [...new Set([...saved, prop.def.id])];
    saved.add(prop.def.id);
    applyLook(prop);
    pulse(
      prop.def.x,
      prop.def.z,
      prop.def.kind === "lantern"
        ? 0xffcf9a
        : prop.def.kind === "shrine"
          ? 0xa8fff0
          : 0xffd0a0,
    );
    return prop;
  }

  return {
    group,
    props,
    rings,
    get count() {
      return props.length;
    },
    get lit() {
      return interactables.filter((p) => p.active).length;
    },
    get total() {
      return interactables.length;
    },
    pulse,
    nearest,
    activate,
    interact(c) {
      return activate(nearest(c));
    },
    prompt(c) {
      const prop = nearest(c);
      return prop ? PROP_PROMPTS[prop.def.kind] ?? "" : "";
    },
    update(time = 0, dt = 0, reducedMotion = false) {
      for (const prop of props) {
        const { kind } = prop.def;
        // O estandarte tremula mesmo em repouso: é tecido, não mecanismo.
        if (prop.flutter && prop.sprite) {
          const index = reducedMotion
            ? 0
            : Math.floor((time * 4.5 + prop.phase) % prop.flutter.frames.length);
          if (index !== prop.flutter.index) {
            prop.flutter.index = index;
            prop.sprite.material.map = prop.flutter.frames[index];
          }
        }
        if (!prop.active) continue;
        if (prop.flame && !reducedMotion) {
          const strip = prop.flame.userData.frames,
            index = Math.floor((time * 9 + prop.phase * 3) % strip.length);
          if (index !== prop.flame.userData.index) {
            prop.flame.userData.index = index;
            prop.flame.material.map = strip[index];
          }
          prop.flame.position.x = Math.sin(time * 2.3 + prop.phase) * 0.012;
        }
        if (prop.glow) {
          const flicker =
            kind === "lantern" && !reducedMotion
              ? 0.44 + Math.sin(time * 5.1 + prop.phase) * 0.06 + Math.sin(time * 13.7 + prop.phase) * 0.03
              : 0.5;
          prop.glow.material.opacity =
            kind === "crate" ? 0.28 : kind === "shrine" ? 0.34 : flicker;
        }
        if (prop.marker && !reducedMotion) {
          prop.marker.rotation.y = time * 1.4;
          prop.marker.position.y = prop.def.height + 0.34 + Math.sin(time * 2.2) * 0.05;
        }
      }
      for (const slot of rings) {
        if (!slot.mesh.visible) continue;
        slot.age = Math.min(1, slot.age + dt * 1.5);
        const t = slot.age;
        slot.mesh.scale.setScalar(1 + t * 3.4);
        slot.mesh.material.opacity = 0.7 * (1 - t);
        if (t >= 1) slot.mesh.visible = false;
      }
    },
    dots() {
      return props
        .filter((p) => p.def.kind !== "decor")
        .map((p) => ({ x: p.def.x, z: p.def.z, kind: p.def.kind, on: p.active }));
    },
  };
}
