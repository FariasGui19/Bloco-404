import assert from "node:assert/strict";
import { chromium } from "../.qa/node_modules/playwright-core/index.mjs";
import binary from "../.qa/node_modules/@sparticuz/chromium/build/index.js";

const browser = await chromium.launch({
  executablePath: await binary.executablePath(),
  headless: true,
  args: binary.args,
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(process.env.PREVIEW_ORIGIN ?? "http://127.0.0.1:8000");
  await page.evaluate(async () => {
    document.body.innerHTML = "";
    const { initDimensionModule } = await import("/js/dimension/ui.js");
    window.s = {
      player: { x: 5, y: 4, health: 77 },
      world: { currentMapId: "mare_cromatica_fenda" },
      progress: {
        archetype: "mare_astral",
        inventory: ["echo"],
        mareCromatica: { ancoraEstavel: true, desfecho: "parcial" },
      },
    };
    window.d = initDimensionModule({
      state: s,
      clearInput() {},
      canEnter: () => true,
      save() {},
    });
    await d.manager.enter({ reason: "mare-cromatica:baia-v1" });
    for (let i = 0; i < 50; i++) d.manager.tick(0.05);
  });
  assert.equal(await page.evaluate(() => d.manager.mode), "3d");
  assert.equal(
    await page.evaluate(() => d.manager.runtime.world3d?.available),
    true,
    "a cena 3D precisa estar ativa",
  );

  // HUD limpo: prompt só com alvo real e nenhum "E - undefined".
  const spawnPrompt = await page.locator(".mare-mission aside").innerText();
  assert.ok(!/undefined|null/.test(spawnPrompt), `prompt sujo: ${spawnPrompt}`);
  const cleaned = await page.evaluate(() => {
    const m = d.manager.runtime.mission;
    m.x = 9.8;
    m.y = 7.9;
    m.angle = -Math.PI / 2;
    m.pitch = 0;
    d.manager.tick(0.05);
    return document.querySelector(".mare-mission aside").textContent;
  });
  assert.match(cleaned, /^\[E\] Rádio de emergência$/);
  assert.match(
    await page.locator(".mare-readout").innerText(),
    /DESCOMPASSO LOCAL.*REGISTROS.*LORE.*AMEAÇAS/,
    "diagnóstico continua legível para QA, mas visualmente recortado",
  );

  // Câmera: pitch real, clamp e lanterna presa ao olhar.
  const camera = await page.evaluate(() => {
    const m = d.manager.runtime.mission;
    m.x = 16;
    m.y = 24;
    m.angle = -Math.PI / 2;
    m.pitch = 0.56;
    for (let i = 0; i < 4; i++) d.manager.tick(0.05);
    const w = d.manager.runtime.world3d;
    const spot = w.camera.children.find((c) => c.isSpotLight);
    return {
      pitch: w.camera.rotation.x,
      missionPitch: m.pitch,
      spot: !!spot,
      targetZ: spot?.target?.position?.z ?? null,
      near: w.camera.near,
      fov: w.camera.fov,
    };
  });
  assert.ok(camera.spot, "lanterna SpotLight existe");
  assert.ok(camera.targetZ < 0, "alvo da lanterna está à frente da câmera");
  assert.ok(Math.abs(camera.pitch - camera.missionPitch) < 0.03, "câmera segue o pitch da missão");
  assert.ok(camera.near > 0 && camera.near < 0.2);
  assert.ok(camera.fov >= 58 && camera.fov <= 62);

  // Botões de câmera na tela: ArrowUp/ArrowDown alteram o pitch e respeitam o clamp.
  await page.evaluate(() => {
    const m = d.manager.runtime.mission;
    m.pitch = 0;
    m.angle = 0;
  });
  const up = page.locator('[data-key="ArrowUp"]');
  await up.dispatchEvent("pointerdown", { pointerId: 11, bubbles: true });
  await page.evaluate(() => {
    for (let i = 0; i < 18; i++) d.manager.tick(0.05);
  });
  await up.dispatchEvent("pointerup", { pointerId: 11, bubbles: true });
  const pitchUp = await page.evaluate(() => d.manager.runtime.mission.pitch);
  assert.ok(pitchUp > 0.04, `ArrowUp move o pitch (${pitchUp})`);
  await page.evaluate(() => {
    const m = d.manager.runtime.mission;
    m.pitch = 1.4;
    d.manager.tick(0.05);
  });
  assert.ok(
    (await page.evaluate(() => d.manager.runtime.mission.pitch)) <= 0.92,
    "pitch tem clamp superior natural",
  );

  // Vulto de nevoeiro: aparece, é banido pela lanterna e não bloqueia a missão.
  const fear = await page.evaluate(() => {
    const m = d.manager.runtime.mission;
    m.p.elapsed = 27;
    m.x = 16.5;
    m.y = 10;
    m.angle = -Math.PI / 2;
    m.pitch = 0;
    for (let i = 0; i < 3; i++) d.manager.tick(0.05);
    const w = d.manager.runtime.world3d;
    const started = w.state.fear;
    for (let i = 0; i < 26; i++) d.manager.tick(0.05);
    return { started, after: w.state.fear, lit: w.state.litSilhouette, finished: m.finished };
  });
  assert.ok(fear.started > 0, "vulto aparece quando a tensão sobe");
  assert.equal(fear.after, 0, "vulto desmancha quando encarado pela lanterna");
  assert.equal(fear.finished, false, "evento de medo não falha a missão");

  // Entrada e colapso: canvas composto tem imagem e o fim aplica a classe de ruptura.
  const pixels = await page.evaluate(async () => {
    const data = document
      .querySelector(".mare-mission canvas")
      .toDataURL("image/png");
    return data.length;
  });
  assert.ok(pixels > 5000, "frame 3D foi composto no canvas da missão");
  const end = await page.evaluate(() => {
    const m = d.manager.runtime.mission;
    m.finished = true;
    for (let i = 0; i < 20; i++) d.manager.tick(0.05);
    return {
      cls: document.querySelector(".mare-mission").classList.contains("mare-fim"),
      mode: d.manager.mode,
      report: document.querySelector(".mare-message").textContent,
    };
  });
  assert.equal(end.mode, "3d", "o colapso tem tempo de tela antes do retorno");
  assert.ok(end.cls, "HUD entra no estado de ruptura");

  assert.deepEqual(errors, []);
  console.log(
    "Maré upgrade browser: 3D ativo, pitch/lanterna, botões de câmera, prompt [E] limpo, vulto banido pela luz e colapso final OK",
  );
} finally {
  await browser.close();
}
