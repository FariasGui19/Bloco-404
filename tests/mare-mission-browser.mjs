import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
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
  await page.screenshot({ path: "qa/mare-mission-baia.png" });
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
      await page.screenshot({ path: "qa/mare-mission-cabana.png" });
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
