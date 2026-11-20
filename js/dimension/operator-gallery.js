import { deferAppearance } from "./operator-performance.js";
import * as T from "../vendor/three.module.js";
import { createOperator, OPERATOR_STYLES } from "./operator.js";

// Inspection only. Uses the gameplay constructor without controller, save,
// abilities or map builders. Created on demand, disposed when the panel closes.
export function createOperatorGallery(mount) {
  const renderer = new T.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.setClearColor(0x182631);
  renderer.domElement.setAttribute(
    "aria-label",
    "Quatro esculturas lvl 1. Arraste para girar.",
  );
  mount.append(renderer.domElement);
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(32, 1, 0.05, 50);
  scene.add(new T.HemisphereLight(0xd8edf2, 0x59606c, 2.1));
  const key = new T.DirectionalLight(0xffe7cb, 2.6);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const rim = new T.DirectionalLight(0x8abbcf, 1.4);
  rim.position.set(3, 3, -5);
  scene.add(rim);
  const floor = new T.Mesh(
    new T.PlaneGeometry(30, 16),
    new T.MeshLambertMaterial({ color: 0x30434a }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.012;
  scene.add(floor);
  const ids = Object.keys(OPERATOR_STYLES),
    models = ids.map((id) => {
      const op = createOperator(
        { archetype: id },
        {
          equippedSuit: {
            motor_bio_forja: "bio_forja",
            mare_astral: "mare",
            lamina_dominio_anciao: "dominio",
          }[id],
        },
      );
      scene.add(op.root);
      return op;
    });
  function disposeModel(root) {
    const gs = new Set(),
      ms = new Set(),
      ts = new Set();
    root.traverse((o) => {
      if (o.geometry) gs.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (m) {
          ms.add(m);
          for (const v of Object.values(m)) if (v?.isTexture) ts.add(v);
        }
    });
    gs.forEach((g) => g.dispose());
    ms.forEach((m) => m.dispose());
    ts.forEach((t) => t.dispose());
  }
  let previewAction = null,
    previewRemaining = 0,
    locomotion = "idle",
    lastPreviewForm = "forma_veloz",
    pendingForm = undefined,
    pendingClothing = null,
    previewVariant = 0,
    combo = 0;
  let focus = "all",
    yaw = -0.28,
    drag = false,
    lastX = 0,
    disposed = false,
    time = 0,
    last = performance.now(),
    raf;
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  let detail = "body";
  const events = new AbortController();
  const pose = {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    vy: 0,
    vx: 0,
    vz: 0,
    grounded: true,
    speed: 0,
    mode: "TERRA",
  };
  function resize() {
    const w = Math.max(1, mount.clientWidth),
      h = Math.max(1, mount.clientHeight);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    const distance =
      focus === "all"
        ? Math.max(4.6, 3.65 / camera.aspect / Math.tan((Math.PI * 32) / 360))
        : Math.max(4.6, 0.85 / camera.aspect / Math.tan((Math.PI * 32) / 360));
    if (focus !== "all" && detail !== "body") {
      const form = models[0].root.userData.identity.form;
      const height =
        focus === ids[0] && form ? (form === "forma_bruta" ? 2 : 1.25) : 1.73;
      const x = detail === "bracelet" ? -0.36 : 0;
      const y = detail === "bracelet" ? height - 0.73 : height;
      const d = Math.max(
        detail === "bracelet" ? 1.1 : 1.2,
        0.26 / camera.aspect / Math.tan((Math.PI * 32) / 360),
      );
      camera.position.set(x, y + 0.05, d);
      camera.lookAt(x, y, 0);
    } else {
      camera.position.set(0, 1 + distance * 0.13, distance);
      camera.lookAt(0, 1, 0);
    }
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(mount);
  renderer.domElement.addEventListener(
    "pointerdown",
    (e) => {
      drag = true;
      lastX = e.clientX;
      renderer.domElement.setPointerCapture(e.pointerId);
    },
    { signal: events.signal },
  );
  renderer.domElement.addEventListener(
    "pointermove",
    (e) => {
      if (drag) {
        yaw += (e.clientX - lastX) * 0.009;
        lastX = e.clientX;
      }
    },
    { signal: events.signal },
  );
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    renderer.domElement.addEventListener(
      name,
      () => {
        drag = false;
      },
      { signal: events.signal },
    );
  function frame(now) {
    if (disposed) return;
    time += Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    previewRemaining = Math.max(
      0,
      previewRemaining -
        Math.min(0.05, Math.max(0, (now - lastPreview) / 1000)),
    );
    lastPreview = now;
    if (
      pendingForm !== undefined &&
      !deferAppearance(
        {
          id: previewAction,
          remaining: previewRemaining,
          duration: 1.4,
        },
        motionPreference.matches,
      )
    ) {
      const old = models[0];
      scene.remove(old.root);
      disposeModel(old.root);
      models[0] = createOperator(
        { archetype: ids[0] },
        { nucleoForm: pendingForm },
      );
      scene.add(models[0].root);
      pendingForm = undefined;
      resize();
    }
    if (
      pendingClothing &&
      !deferAppearance(
        { id: previewAction, remaining: previewRemaining, duration: 1.4 },
        motionPreference.matches,
      )
    ) {
      const { index, equippedSuit } = pendingClothing;
      const old = models[index];
      scene.remove(old.root);
      disposeModel(old.root);
      models[index] = createOperator(
        { archetype: ids[index] },
        { equippedSuit },
      );
      scene.add(models[index].root);
      pendingClothing = null;
    }
    models.forEach((op, i) => {
      op.root.visible = focus === "all" || focus === ids[i];
      const primary = [
        "forma_veloz",
        "bio_dash",
        "passo_corrente",
        "golpe_ruptura",
      ][i];
      const secondary = [
        "eco_scan",
        "bio_diagnostic",
        "senso_corrente",
        "postura_dominio",
      ][i];
      const action =
        previewRemaining > 0
          ? {
              id: ["primary", "signature"].includes(previewAction)
                ? op.root.userData.identity.form === "forma_bruta"
                  ? "pancada_quebra"
                  : primary
                : previewAction === "secondary"
                  ? secondary
                  : previewAction,
              variant: previewVariant,
              selected: models[0].root.userData.identity.form ?? "forma_veloz",
              remaining: previewRemaining,
              duration: 1.4,
            }
          : null;
      const swim = locomotion === "swim",
        flight = locomotion === "flight";
      op.animate(
        {
          ...pose,
          mode: swim ? "SUBMERSO" : "TERRA",
          grounded: !swim && !flight,
          flying: flight,
          speed:
            locomotion === "run"
              ? 8
              : locomotion === "walk"
                ? 4
                : swim
                  ? 5
                  : flight
                    ? 15
                    : 0,
          x: focus === "all" ? (i - 1.5) * 1.9 : 0,
          yaw,
        },
        time,
        { action, reducedMotion: motionPreference.matches },
      );
    });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  let lastPreview = performance.now();
  resize();
  raf = requestAnimationFrame(frame);
  return {
    models,
    renderer,
    setClothing(equipped) {
      pendingForm = undefined;
      pendingClothing = null;
      models.forEach((old, i) => {
        scene.remove(old.root);
        disposeModel(old.root);
        models[i] = createOperator(
          { archetype: ids[i] },
          {
            equippedSuit: equipped
              ? {
                  motor_bio_forja: "bio_forja",
                  mare_astral: "mare",
                  lamina_dominio_anciao: "dominio",
                }[ids[i]]
              : null,
          },
        );
        scene.add(models[i].root);
      });
    },
    setForm(form) {
      const id = ["forma_veloz", "forma_bruta"].includes(form) ? form : null;
      if (id) lastPreviewForm = id;
      pendingForm = id;
      previewAction = "transform";
      previewRemaining = 1.4;
    },
    play(action) {
      if (action === "transform" && (focus === "all" || focus === ids[0])) {
        this.setForm(
          models[0].root.userData.identity.form ? null : lastPreviewForm,
        );
        return;
      }
      if (action === "transform" && focus !== "all" && focus !== ids[0]) {
        const index = ids.indexOf(focus);
        const suit = {
          motor_bio_forja: "bio_forja",
          mare_astral: "mare",
          lamina_dominio_anciao: "dominio",
        }[focus];
        pendingClothing = {
          index,
          equippedSuit:
            models[index].root.userData.identity.clothing === "civilian"
              ? suit
              : null,
        };
      }
      previewVariant =
        action === "signature" ? 2 : action === "primary" ? combo++ % 2 : 0;
      previewAction = action;
      previewRemaining = 1.4;
    },
    setLocomotion(value) {
      locomotion = ["walk", "run", "swim", "flight"].includes(value)
        ? value
        : "idle";
    },
    get preview() {
      return {
        action: previewAction,
        remaining: previewRemaining,
        locomotion,
        form:
          pendingForm !== undefined
            ? pendingForm
            : (models[0].root.userData.identity.form ?? null),
      };
    },
    setFocus(id) {
      focus = ids.includes(id) ? id : "all";
      resize();
    },
    setDetail(value) {
      detail = ["face", "bracelet"].includes(value) ? value : "body";
      yaw = 0;
      resize();
    },
    setAngle(angle) {
      yaw = angle;
    },
    get stats() {
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        textures: renderer.info.memory.textures,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      events.abort();
      const geometries = new Set(),
        materials = new Set(),
        textures = new Set();
      scene.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          if (m) {
            materials.add(m);
            for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
          }
      });
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
