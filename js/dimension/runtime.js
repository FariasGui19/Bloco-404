import { createMasterMorpher } from "./master-morpher.js";
import { createMasterMorpherPanel } from "./master-morpher-ui.js";
import { deferAppearance } from "./operator-performance.js";
import { createNucleoHUD } from "./nucleo-hud.js";
import { createOperatorActions } from "./operator-actions.js";
import { createCameraMotion } from "./camera-motion.js";
import { navigationBearing } from "./sector-layout.js";
import * as T from "../vendor/three.module.js";
import { createSector } from "./sector-scene.js";
import { createOperator } from "./operator.js";
import { SpatialController } from "./controller.js";
import {
  SECTOR,
  PLATFORMS,
  terrainHeight,
  groundAt,
  profileFor,
  clamp,
} from "./sector-data.js";
import { getArchetypeLevel } from "../game/rpg.js";

export function createSpatialWorld({
  state,
  exit,
  fail,
  mount,
  sourceCanvas,
  onAnchor = () => {},
  sound = () => {},
  developerTools = false,
}) {
  // Local facade: creative player/progress can never replace application refs.
  state = { ...state };
  const viewport = mount.querySelector(".dimension-viewport");
  let renderer;
  try {
    renderer = new T.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    throw new Error(
      "WebGL2 indisponível. O jogo 2D foi preservado; tente habilitar aceleração gráfica.",
    );
  }
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = T.SRGBColorSpace;
  viewport.append(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    "aria-label",
    "Setor Limiar tridimensional. Use WASD, espaço e arraste para olhar.",
  );
  const listener = new AbortController(),
    events = { signal: listener.signal };
  let world, masterMorpher, morpherPanel;
  try {
    world = createSector();
    const anchorPOI = world.layout.pois.find((p) => p.id === "limiar.anchor");
    const camera = new T.PerspectiveCamera(58, 1, 0.12, 420),
      controller = new SpatialController(state);
    let operator = createOperator(state.progress, state.player),
      archetype = `${state.progress.archetype}:${state.player.nucleoForm ?? ""}:${state.player.equippedSuit ?? ""}`;
    world.scene.add(operator.root);
    // During the rupture the actual 2D canvas becomes a tilting, fading plane.
    const snapshot = document.createElement("canvas");
    snapshot.width = sourceCanvas?.width || 1;
    snapshot.height = sourceCanvas?.height || 1;
    if (sourceCanvas) snapshot.getContext("2d").drawImage(sourceCanvas, 0, 0);
    const flatTexture = new T.CanvasTexture(snapshot);
    flatTexture.magFilter = T.NearestFilter;
    flatTexture.minFilter = T.NearestFilter;
    flatTexture.colorSpace = T.SRGBColorSpace;
    const flatPlane = new T.Mesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({
        map: flatTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );
    flatPlane.position.z = -2;
    flatPlane.renderOrder = 100;
    camera.add(flatPlane);
    world.scene.add(camera);
    const keys = new Set(),
      pressed = new Set();
    const cameraMotion = createCameraMotion();
    const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
    let yaw = 0.3,
      pitch = 0.38,
      distance = 9,
      time = 0,
      disposed = false,
      dragging = false,
      lastX = 0,
      lastY = 0,
      lock = false,
      hudTime = 0,
      frames = 0,
      fps = 0,
      fpsTime = 0,
      lastWallTime = performance.now();
    const position = new T.Vector3(),
      target = new T.Vector3(),
      desired = new T.Vector3(),
      ray = new T.Raycaster();
    const el = (s) => mount.querySelector(s),
      notice = el(".dimension-notice"),
      map = el(".dimension-map");
    const mapContext = map.getContext("2d");
    const actions = createOperatorActions(state, (message) => {
      notice.textContent = message;
    });
    const nucleoHUD = createNucleoHUD(mount, state, actions);
    masterMorpher = createMasterMorpher(
      state,
      () => {
        reset();
        actions.reset();
        controller.actionBoost = 0;
        morpherPanel?.update();
        notice.textContent = masterMorpher.active
          ? "MORFADOR MESTRE · TESTE ISOLADO · SAVE NORMAL PRESERVADO"
          : "MORFADOR DESATIVADO · OPERADOR E PROGRESSO RESTAURADOS";
      },
      { laboratory: developerTools },
    );
    morpherPanel = createMasterMorpherPanel(mount, masterMorpher);
    mount
      .querySelector(".dimension-morpher")
      .addEventListener("focusin", reset, events);
    function reset() {
      keys.clear();
      pressed.clear();
      dragging = false;
    }
    function key(e, down) {
      if (e.code === "F8") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (down && !e.repeat) {
          reset();
          morpherPanel.toggle();
        }
        return;
      }
      if (e.code !== "Escape" && e.target.closest?.("[data-dimension-dev]")) {
        // Keep native checkbox/select/summary behavior, but never leak dev
        // typing to either the spatial controls or the underlying 2D hotkeys.
        e.stopImmediatePropagation();
        return;
      }
      if (e.target instanceof HTMLSelectElement && e.code !== "Escape") return;
      if (
        e.code === "Tab" ||
        (e.target instanceof HTMLButtonElement &&
          ["Enter", "Space"].includes(e.code))
      )
        return;
      if (!e.code) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (down) {
        if (!keys.has(e.code)) pressed.add(e.code);
        keys.add(e.code);
        if (e.code === "Escape") exit();
      } else keys.delete(e.code);
    }
    window.addEventListener("keydown", (e) => key(e, true), {
      ...events,
      capture: true,
    });
    window.addEventListener("keyup", (e) => key(e, false), {
      ...events,
      capture: true,
    });
    window.addEventListener("blur", reset, events);
    document.addEventListener("visibilitychange", reset, events);
    renderer.domElement.addEventListener(
      "contextmenu",
      (e) => e.preventDefault(),
      events,
    );
    renderer.domElement.addEventListener(
      "pointerdown",
      (e) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        renderer.domElement.setPointerCapture(e.pointerId);
      },
      events,
    );
    renderer.domElement.addEventListener(
      "pointermove",
      (e) => {
        if (!dragging) return;
        yaw -= (e.clientX - lastX) * 0.006;
        pitch = clamp(pitch + (e.clientY - lastY) * 0.004, -0.3, 1.25);
        lastX = e.clientX;
        lastY = e.clientY;
      },
      events,
    );
    renderer.domElement.addEventListener(
      "pointerup",
      () => (dragging = false),
      events,
    );
    renderer.domElement.addEventListener(
      "pointercancel",
      () => (dragging = false),
      events,
    );
    renderer.domElement.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        distance = clamp(distance + e.deltaY * 0.01, 3, 20);
      },
      { ...events, passive: false },
    );
    for (const button of mount.querySelectorAll("[data-spatial-key]")) {
      const code = button.dataset.spatialKey;
      button.addEventListener(
        "pointerdown",
        (e) => {
          e.preventDefault();
          button.setPointerCapture(e.pointerId);
          if (!keys.has(code)) pressed.add(code);
          keys.add(code);
        },
        events,
      );
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        button.addEventListener(type, () => keys.delete(code), events);
    }
    const contextLost = (e) => {
      e.preventDefault();
      fail(new Error("Contexto WebGL perdido. Retorno seguro ao 2D."));
    };
    renderer.domElement.addEventListener(
      "webglcontextlost",
      contextLost,
      events,
    );
    function resize() {
      const scale = Number(el(".dimension-quality").value);
      renderer.setSize(
        Math.max(1, innerWidth * scale),
        Math.max(1, innerHeight * scale),
        false,
      );
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize, events);
    el(".dimension-quality").addEventListener("change", resize, events);
    resize();
    const minimap = document.createElement("canvas");
    minimap.width = minimap.height = 144;
    const mc = minimap.getContext("2d"),
      image = mc.createImageData(144, 144);
    for (let z = 0; z < 144; z++)
      for (let x = 0; x < 144; x++) {
        const h = terrainHeight((x / 144 - 0.5) * 256, (z / 144 - 0.5) * 256),
          i = (z * 144 + x) * 4;
        const rgb =
          h < 0
            ? [39, 69, 96]
            : h < 3
              ? [161, 146, 128]
              : h > 18
                ? [158, 165, 169]
                : [93, 126, 118];
        for (let j = 0; j < 3; j++) image.data[i + j] = rgb[j];
        image.data[i + 3] = 255;
      }
    mc.putImageData(image, 0, 0);
    // Routes/POIs use the same authored registry as geometry and future lore hooks.
    for (const route of world.layout.routes.filter(
      (r) =>
        r.mode === "walk" || r.mode === "jump" || r.id === "harbor-channel",
    )) {
      mc.strokeStyle =
        route.mode === "water"
          ? "#aacad577"
          : route.mode === "jump"
            ? "#cda2de88"
            : "#e3d4b070";
      mc.lineWidth = 1;
      mc.setLineDash(route.mode === "walk" ? [] : [2, 2]);
      mc.beginPath();
      route.points.forEach(([x, z], i) => {
        const a = (x / 256 + 0.5) * 144,
          b = (z / 256 + 0.5) * 144;
        i ? mc.lineTo(a, b) : mc.moveTo(a, b);
      });
      mc.stroke();
    }
    mc.setLineDash([]);
    const landmarkList = el(".dimension-landmark-list"),
      landmarkRows = new Map();
    for (const poi of world.layout.pois) {
      const row = document.createElement("span");
      row.dataset.poiId = poi.id;
      row.style.color = poi.color;
      landmarkList.append(row);
      landmarkRows.set(poi.id, row);
    }

    function drawMap() {
      mapContext.drawImage(minimap, 0, 0);
      const dot = (x, z, color, r) => {
        mapContext.fillStyle = color;
        mapContext.beginPath();
        mapContext.arc(
          (x / 256 + 0.5) * 144,
          (z / 256 + 0.5) * 144,
          r,
          0,
          Math.PI * 2,
        );
        mapContext.fill();
      };
      for (const poi of world.layout.pois) {
        dot(poi.x, poi.z, poi.color, 4.2);
        mapContext.fillStyle = "#13283b";
        mapContext.textAlign = "center";
        mapContext.font = "bold 7px monospace";
        mapContext.fillText(
          poi.code,
          (poi.x / 256 + 0.5) * 144,
          (poi.z / 256 + 0.5) * 144 + 2.4,
        );
      }
      dot(controller.x, controller.z, "white", 3);
      mapContext.strokeStyle = "white";
      const x = (controller.x / 256 + 0.5) * 144,
        z = (controller.z / 256 + 0.5) * 144;
      mapContext.beginPath();
      mapContext.moveTo(x, z);
      mapContext.lineTo(x - Math.sin(yaw) * 8, z - Math.cos(yaw) * 8);
      mapContext.stroke();
    }
    function interact() {
      actions.presentInteraction();
      const c = controller,
        nearAnchor =
          Math.hypot(c.x - anchorPOI.x, c.z - anchorPOI.z) < 5 &&
          Math.abs(c.y - terrainHeight(anchorPOI.x, anchorPOI.z)) < 4;
      const nearBoat =
        Math.hypot(c.x - world.boat.position.x, c.z - world.boat.position.z) <
          5 && Math.abs(c.y) < 7;
      if (c.boating) {
        const bx = c.x + Math.cos(c.yaw) * 3,
          bz = c.z - Math.sin(c.yaw) * 3;
        c.boating = false;
        if (Math.hypot(c.x + 16, c.z - 65) < 7) {
          c.x = -16;
          c.z = 62;
          c.y = PLATFORMS.find((p) => p.id === "pier").top;
        } else {
          c.x = clamp(bx, -124, 124);
          c.z = clamp(bz, -124, 124);
          c.y = Math.max(0.5, groundAt(c.x, c.z));
        }
        c.vy = 0;
      } else if (nearAnchor) {
        state.progress.flags ??= {};
        state.progress.flags.dimensionalAnchorStabilized = true;
        if (!masterMorpher.active) onAnchor();
        sound("anchor");
        notice.textContent =
          "ÂNCORA ESTABILIZADA · A consciência suporta profundidade. Retorno 2D disponível a qualquer momento.";
      } else if (nearBoat) {
        c.boating = true;
        c.flying = false;
        c.x = world.boat.position.x;
        c.z = world.boat.position.z;
        c.y = 0.65;
      }
    }
    function frame(dt, transition) {
      if (disposed) return;
      const wallTime = performance.now();
      const realDelta = Math.max(0, (wallTime - lastWallTime) / 1000);
      lastWallTime = wallTime;
      dt = document.hidden ? 0 : clamp(dt, 0, 0.05);
      time += dt;
      frames++;
      fpsTime += realDelta;
      if (fpsTime >= 1) {
        fps = Math.round(frames / fpsTime);
        frames = 0;
        fpsTime = 0;
      }
      masterMorpher.update();
      const appearanceKey = `${state.progress.archetype}:${state.player.nucleoForm ?? ""}:${state.player.equippedSuit ?? ""}`;
      if (
        archetype !== appearanceKey &&
        !deferAppearance(actions.action, motionPreference.matches)
      ) {
        world.scene.remove(operator.root);
        disposeTree(operator.root);
        operator = createOperator(state.progress, state.player);
        world.scene.add(operator.root);
        archetype = `${state.progress.archetype}:${state.player.nucleoForm ?? ""}:${state.player.equippedSuit ?? ""}`;
        if (!profileFor(state.progress).fly) controller.flying = false;
      }
      if (transition.mode === "3d") {
        actions.update(dt);
        if (pressed.has("KeyR")) actions.select();
        if (pressed.has("KeyT")) actions.transform();
        if (pressed.has("KeyJ")) actions.trigger("primary", controller);
        if (pressed.has("KeyK")) actions.trigger("secondary", controller);
        if (pressed.has("KeyL")) actions.trigger("signature", controller);
        if (pressed.has("KeyQ")) lock = !lock;
        if (pressed.has("KeyE")) interact();
        if (lock) {
          const wanted = Math.atan2(
            controller.x - anchorPOI.x,
            controller.z - anchorPOI.z,
          );
          yaw +=
            Math.atan2(Math.sin(wanted - yaw), Math.cos(wanted - yaw)) *
            (1 - Math.exp(-dt * 3));
        }
        controller.step(dt, { keys, pressed }, yaw);
      }
      pressed.clear();
      const c = controller;
      const reducedMotion = motionPreference.matches;
      operator.animate(c, time, { reducedMotion, action: actions.action });
      world.update(c, time, reducedMotion);
      const framing = cameraMotion.update(c, dt, {
        reducedMotion,
        stature: state.player.nucleoForm === "forma_bruta" ? 1.28 : 1,
      });
      target.set(c.x + framing.lookX, c.y + framing.lookY, c.z + framing.lookZ);
      if (Math.abs(camera.fov - framing.fov) > 0.01) {
        camera.fov = framing.fov;
        camera.updateProjectionMatrix();
      }
      const progress =
          transition.mode === "entering" && !reducedMotion
            ? transition.progress
            : 1,
        smooth = progress * progress * (3 - 2 * progress);
      const orbitYaw = yaw + (1 - smooth) * 0.8,
        orbitPitch = pitch + (1 - smooth) * 0.62,
        dist = distance + framing.distance + (1 - smooth) * 17;
      desired.set(
        target.x + Math.sin(orbitYaw) * Math.cos(orbitPitch) * dist,
        target.y + Math.sin(orbitPitch) * dist,
        target.z + Math.cos(orbitYaw) * Math.cos(orbitPitch) * dist,
      );
      // Segment test against active terrain/architecture, plus ground clearance.
      position.copy(desired).sub(target);
      const length = position.length();
      ray.set(target, position.normalize());
      ray.far = length;
      const hit = ray
        .intersectObjects(world.cameraSolids, false)
        .find(
          (h) =>
            h.distance > 0.2 &&
            (h.object.visible || h.object.userData.cameraOnly) &&
            h.object.parent.visible,
        );
      if (hit)
        desired
          .copy(target)
          .addScaledVector(position, Math.max(0.8, hit.distance - 0.45));
      desired.y = Math.max(
        desired.y,
        terrainHeight(desired.x, desired.z) + 0.4,
      );
      if (time < 0.1) camera.position.copy(desired);
      else camera.position.lerp(desired, 1 - Math.exp(-dt * 10));
      // Clamp the smoothed camera too, so interpolation cannot drift into hills.
      camera.position.y = Math.max(
        camera.position.y,
        terrainHeight(camera.position.x, camera.position.z) + 0.35,
      );
      // Recheck the interpolated segment against walls, not only its desired end.
      position.copy(camera.position).sub(target);
      ray.set(target, position.clone().normalize());
      ray.far = position.length();
      const obstruction = ray
        .intersectObjects(world.cameraSolids, false)
        .find(
          (h) =>
            h.distance > 0.2 &&
            (h.object.visible || h.object.userData.cameraOnly) &&
            h.object.parent.visible,
        );
      if (obstruction)
        camera.position
          .copy(target)
          .addScaledVector(
            ray.ray.direction,
            Math.max(0.5, obstruction.distance - 0.3),
          );
      camera.lookAt(target);
      flatPlane.visible = transition.mode === "entering";
      flatPlane.material.opacity = 1 - smooth;
      flatPlane.scale.set(
        2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * 2 * camera.aspect,
        2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * 2,
        1,
      );
      flatPlane.rotation.set(-smooth * 0.8, smooth * 0.6, smooth * 0.08);
      const underwater = camera.position.y < -0.25;
      world.environment.setCamera(camera, underwater);
      mount.classList.toggle("underwater", underwater);
      mount.style.setProperty(
        "--rupture",
        String(transition.mode === "entering" ? 1 - transition.progress : 0),
      );
      renderer.render(world.scene, camera);
      hudTime += dt;
      if (hudTime > 0.1) {
        hudTime = 0;
        drawMap();
        nucleoHUD.update();
        morpherPanel.update();
        el(".dimension-suit").textContent = profileFor(state.progress).name;
        el(".dimension-actions").textContent = actions.label();
        el(".dimension-level").textContent =
          `SINCRONIZAÇÃO ${getArchetypeLevel(state.progress)} · ${c.mode}${lock ? " · MIRA: ÂNCORA" : ""}`;
        el(".dimension-vitals").textContent =
          `VIDA ${Math.ceil(state.player.health ?? 0)}/${state.player.maxHealth ?? 0}   ENERGIA ${Math.ceil(state.player.energy ?? 100)}/${state.player.maxEnergy ?? 100}`;
        el(".dimension-flight").textContent =
          `ALT ${Math.max(0, c.y).toFixed(1)} m   PROF ${Math.max(0, -c.y).toFixed(1)} m   VEL ${(c.speed * 3.6).toFixed(0)} km/h`;
        el(".dimension-heading").textContent =
          `N  ·  ${(((Math.round((yaw * 180) / Math.PI) % 360) + 360) % 360).toString().padStart(3, "0")}°  ·  S`;
        const bearings = world.layout.pois.map((p) =>
          navigationBearing(c.x, c.z, yaw, p),
        );
        for (const b of bearings)
          landmarkRows.get(b.poi.id).textContent =
            `${b.poi.code} ${b.poi.short} ${b.arrow} ${Math.round(b.distance)}m`;
        const ahead = bearings
          .filter((b) => Math.abs(b.delta) < Math.PI * 0.36 && b.distance > 5)
          .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
        if (ahead)
          el(".dimension-heading").textContent +=
            `  |  ${ahead.poi.code} ${ahead.poi.short} ${Math.round(ahead.distance)}m`;
        el(".dimension-performance").textContent =
          `${fps} FPS · ${renderer.info.render.calls} DRAWS · ${(renderer.info.render.triangles / 1000).toFixed(1)}K TRI · ${world.chunks.filter((ch) => ch.group.visible).length}/64 SETORES`;
        const anchorDistance = Math.hypot(c.x - anchorPOI.x, c.z - anchorPOI.z),
          boatDistance = Math.hypot(
            c.x - world.boat.position.x,
            c.z - world.boat.position.z,
          );
        el(".dimension-prompt").textContent = c.boating
          ? "E · DESEMBARCAR"
          : anchorDistance < 5 &&
              Math.abs(c.y - terrainHeight(anchorPOI.x, anchorPOI.z)) < 4
            ? "E · ESTABILIZAR NÚCLEO DE ÂNCORA"
            : boatDistance < 5 && Math.abs(c.y) < 7
              ? "E · PILOTAR EMBARCAÇÃO"
              : `◆ NÚCLEO DE ÂNCORA · ${Math.round(anchorDistance)} m`;
        el(".dimension-capability").textContent = profileFor(state.progress).fly
          ? "F · alternar voo | espaço / ctrl · altitude"
          : profileFor(state.progress).dive
            ? "Maré Astral · mergulho livre | espaço / ctrl · profundidade"
            : "E + avançar · escalar encosta | nado de superfície";
      }
    }
    function disposeTree(root) {
      const geometries = new Set(),
        materials = new Set(),
        textures = new Set();
      root.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        for (const m of Array.isArray(o.material)
          ? o.material
          : o.material
            ? [o.material]
            : []) {
          materials.add(m);
          for (const value of Object.values(m))
            if (value?.isTexture) textures.add(value);
        }
      });
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures)
        if (!world.environment.textures.includes(t)) t.dispose();
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      masterMorpher.dispose();
      morpherPanel.dispose();
      nucleoHUD.dispose();
      listener.abort();
      reset();
      world.environment.dispose();
      disposeTree(world.scene);
      renderer.dispose();
      renderer.forceContextLoss();
      landmarkList.replaceChildren();
      renderer.domElement.remove();
      mount.classList.remove("underwater");
    }
    return {
      frame,
      dispose,
      controller,
      masterMorpher,
      actions,
      camera,
      world,
      get operator() {
        return operator;
      },
      get stats() {
        return {
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          fps,
        };
      },
    };
  } catch (error) {
    masterMorpher?.dispose();
    morpherPanel?.dispose();
    listener.abort();
    world?.environment.dispose();
    world?.scene.traverse((o) => {
      o.geometry?.dispose();
      for (const m of Array.isArray(o.material)
        ? o.material
        : o.material
          ? [o.material]
          : [])
        m.dispose();
    });
    renderer.dispose();
    renderer.forceContextLoss();
    mount.querySelector(".dimension-landmark-list")?.replaceChildren();
    renderer.domElement.remove();
    throw error;
  }
}
