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
      const op = createOperator({ archetype: id });
      scene.add(op.root);
      return op;
    });
  let focus = "all",
    yaw = -0.28,
    drag = false,
    lastX = 0,
    disposed = false,
    time = 0,
    last = performance.now(),
    raf;
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
        : Math.max(3.7, 0.7 / camera.aspect / Math.tan((Math.PI * 32) / 360));
    camera.position.set(0, 1 + distance * 0.13, distance);
    camera.lookAt(0, 1, 0);
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
    models.forEach((op, i) => {
      op.root.visible = focus === "all" || focus === ids[i];
      op.animate(
        { ...pose, x: focus === "all" ? (i - 1.5) * 1.9 : 0, yaw },
        time,
      );
    });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  resize();
  raf = requestAnimationFrame(frame);
  return {
    models,
    renderer,
    setFocus(id) {
      focus = ids.includes(id) ? id : "all";
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
