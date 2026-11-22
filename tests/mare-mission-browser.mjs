import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "../.qa/node_modules/playwright-core/index.mjs";
import binary from "../.qa/node_modules/@sparticuz/chromium/build/index.js";
const browser = await chromium.launch({
  executablePath: await binary.executablePath(),
  headless: true,
  args: binary.args,
});
try {
  const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.PREVIEW_ORIGIN ?? "http://127.0.0.1:8000");
  await page.evaluate(async () => {
    // Isolated real DOM + production manager adapter, not the game's onboarding.
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
    window.saved = 0;
    window.d = initDimensionModule({
      state: s,
      clearInput() {},
      canEnter: () => true,
      save() {
        saved++;
      },
    });
    await d.manager.enter({ reason: "mare-cromatica:baia-v1" });
    for (let i = 0; i < 40; i++) d.manager.tick(0.05);
  });
  assert.equal(await page.evaluate(() => d.manager.mode), "3d");
  await page.keyboard.down("w");
  await page.evaluate(() => {
    for (let i = 0; i < 70; i++) d.manager.tick(0.05);
  });
  await page.keyboard.up("w");
  assert.ok(await page.evaluate(() => d.manager.runtime.mission.y < 22));
  mkdirSync("qa", { recursive: true });
  const capture = async (path) => {
    const data = await page.evaluate(() =>
      document.querySelector(".mare-mission canvas").toDataURL("image/png"),
    );
    mkdirSync("qa", { recursive: true });
    writeFileSync(path, Buffer.from(data.split(",")[1], "base64"));
  };
  await capture("qa/mare-mission-baia.png");
  // Interactive props: real proximity + line of sight, one reservoir use, no data/rank effect.
  await page.evaluate(async () => {
    const m = d.manager.runtime.mission;
    m.x = 9.8; m.y = 7.9; m.angle = -Math.PI / 2; m.stamina = 20;
    d.manager.tick(0.05);
  });
  assert.match(await page.locator(".mare-mission aside").innerText(), /Rádio de emergência/);
  await page.locator("[data-action]").click();
  assert.match(await page.locator(".mare-message").innerText(), /RÁDIO/);
  assert.equal(await page.evaluate(() => d.manager.runtime.mission.p.details.radio), true);
  assert.equal(await page.evaluate(() => d.manager.runtime.mission.p.data.length), 0);
  await page.evaluate(() => { d.manager.tick(0.05); });
  assert.match(await page.locator(".mare-readout").innerText(), /REGISTROS 1\/8/);
  await capture("qa/mare-detail-radio.png");
  // Lore records are optional, persistent and visible in the echo report.
  await page.evaluate(() => {
    const m = d.manager.runtime.mission;
    m.x = 7.1; m.y = 9.9; m.angle = -2.356;
    d.manager.tick(0.05);
  });
  assert.match(await page.locator(".mare-mission aside").innerText(), /Diário do faroleiro/);
  await page.locator("[data-action]").click();
  assert.match(await page.locator(".mare-message").innerText(), /Nulo aprendeu a voz do faroleiro/);
  assert.equal(await page.evaluate(() => d.manager.runtime.mission.p.lore.join(",")), "diario");
  await page.evaluate(() => { d.manager.tick(0.05); });
  assert.match(await page.locator(".mare-readout").innerText(), /LORE 1\/6/);
  assert.equal(await page.evaluate(() => d.manager.runtime.mission.p.data.length), 0);
  await capture("qa/mare-lore-diario.png");
  await page.evaluate(() => {
    const m = d.manager.runtime.mission;
    m.x = 18.8; m.y = 13.4; m.angle = -Math.PI / 2;
    d.manager.tick(0.05);
  });
  assert.match(await page.locator(".mare-mission aside").innerText(), /Lente Fresnel/);
  await capture("qa/mare-lore-lente.png");
  await page.evaluate(() => {
    const m = d.manager.runtime.mission;
    m.x = 11.2; m.y = 23.9; m.angle = Math.PI / 2;
    d.manager.tick(0.05);
  });
  assert.match(await page.locator(".mare-mission aside").innerText(), /Maca de quarentena/);
  await capture("qa/mare-lore-maca.png");
  // Stage each objective; route connectivity/radius collision is checked separately in Node.
  for (const id of ["fita", "sal", "eco", "terminal", "ancora"]) {
    await page.evaluate(async (id) => {
      const { sites } = await import("/js/dimension/mare-mission-model.js");
      const site = sites.find((s) => s.id === id),
        m = d.manager.runtime.mission;
      m.x = site.x;
      m.y = site.y + 1;
      m.vx = m.vy = 0;
      m.angle = -Math.PI / 2;
    }, id);
    if (id === "fita") {
      await page.evaluate(() => d.manager.tick(0.05));
      await capture("qa/mare-mission-cabana.png");
    }
    await page.keyboard.press("e");
  }
  assert.equal(await page.evaluate(() => s.progress.mareMission.rank), 4);
  assert.equal(
    await page.evaluate(() => d.manager.runtime.mission.finished),
    true,
  );
  await page.evaluate(() => {
    for (let i = 0; i < 100; i++) d.manager.tick(0.05);
  });
  assert.equal(await page.evaluate(() => d.manager.mode), "2d");
  assert.equal(
    await page.evaluate(() => s.progress.dimensionalRupture.status),
    "pending",
  );
  assert.deepEqual(
    await page.evaluate(() => [
      s.player.x,
      s.player.y,
      s.player.health,
      s.progress.inventory[0],
    ]),
    [5, 4, 77, "echo"],
  );
  // Re-entry and return remove handlers/canvas; no duplicate mission controls.
  await page.evaluate(async () => {
    await d.manager.enter({ reason: "mare-cromatica:baia-v1" });
    for (let i = 0; i < 40; i++) d.manager.tick(0.05);
  });
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    for (let i = 0; i < 20; i++) d.manager.tick(0.05);
  });
  assert.equal(await page.locator(".mare-mission").count(), 0);
  // Timeout is a narrative handoff, not a health/game-over mutation.
  await page.evaluate(async () => {
    s.progress.mareMission.elapsed = 599.98;
    s.progress.mareMission.completed = false;
    await d.manager.enter({ reason: "mare-cromatica:baia-v1" });
    for (let i = 0; i < 40; i++) d.manager.tick(0.05);
    d.manager.tick(0.05);
  });
  assert.equal(
    await page.evaluate(() => d.manager.runtime.mission.finished),
    true,
  );
  await page.evaluate(() => { d.manager.tick(0.05); d.manager.tick(0.05); });
  await capture("qa/mare-echo-report.png");
  await page.locator("[data-audio]").click();
  await page.evaluate(() => {
    for (let i = 0; i < 110; i++) d.manager.tick(0.05);
  });
  assert.equal(await page.evaluate(() => s.player.health), 77);
  // Decoding failure must clean the temporary mount and roll back through manager.
  await page.route("**/sprites/mare-missao-base/gravador.png", (r) =>
    r.abort(),
  );
  await page.evaluate(async () => {
    await d.manager.enter({ reason: "mare-cromatica:baia-v1" });
  });
  assert.equal(await page.evaluate(() => d.manager.mode), "2d");
  assert.equal(await page.locator(".mare-mission").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Chromium: entry, keyboard/action, decoded assets, staged objectives, timer sabotage, optional audio, preserved state, ESC, asset-failure rollback and disposal OK",
  );
} finally {
  await browser.close();
}
