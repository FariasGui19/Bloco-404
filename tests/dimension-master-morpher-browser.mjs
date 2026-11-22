import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
if (!process.env.BROWSER_EXECUTABLE)
  console.log("Master morpher browser: configure Chromium/Playwright.");
else {
  const { chromium } = await import(
    process.env.PLAYWRIGHT_MODULE ?? "playwright-core"
  );
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE,
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
    env: {
      ...process.env,
      LD_LIBRARY_PATH: process.env.BROWSER_LIBRARY_PATH ?? "",
    },
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    mkdirSync(".qa", { recursive: true });
    await page.goto(
      `${process.env.PREVIEW_ORIGIN ?? "http://127.0.0.1:8000"}/docs/setor-limiar-3d.html`,
    );
    const storage = await page.evaluate(() => JSON.stringify(localStorage));
    await page.click("#enter");
    await page.waitForFunction(() => window.labDimension.mode === "3d", null, {
      timeout: 120000,
    });
    await page.evaluate(() => {
      const m = window.labDimension;
      window.morphOriginal = {
        progress: m.state.progress,
        player: m.state.player,
        json: JSON.stringify([m.state.progress, m.state.player]),
        x: m.runtime.controller.x,
        z: m.runtime.controller.z,
      };
    });
    await page.keyboard.press("F8");
    await page.locator("[data-morph-enable]").focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(
      () => window.labDimension.runtime.masterMorpher.active,
    );
    await page.keyboard.press("Space");
    await page.waitForFunction(
      () => !window.labDimension.runtime.masterMorpher.active,
    );
    await page.check("[data-morph-enable]");
    await page.waitForFunction(
      () => window.labDimension.runtime.masterMorpher.active,
    );
    for (const id of [
      "motor_bio_forja",
      "lamina_dominio_anciao",
      "mare_astral",
      "nucleo_dez_forma",
    ]) {
      await page.selectOption("[data-morph-archetype]", id);
      await page.waitForFunction(
        (id) =>
          window.labDimension.runtime.operator.root.userData.identity
            .archetype === id,
        id,
        { timeout: 60000 },
      );
      assert.equal(
        await page.evaluate(() =>
          JSON.stringify([
            window.labDimension.state.progress,
            window.labDimension.state.player,
          ]),
        ),
        await page.evaluate(() => window.morphOriginal.json),
      );
      assert(
        await page.evaluate(
          () =>
            window.labDimension.runtime.controller.x ===
              window.morphOriginal.x &&
            window.labDimension.runtime.controller.z === window.morphOriginal.z,
        ),
      );
    }
    await page.waitForFunction(
      () => document.querySelectorAll(".nucleo-card.locked").length === 0,
    );
    assert.equal(await page.locator(".nucleo-card.locked").count(), 0);
    await page.selectOption("[data-morph-appearance]", "forma_bruta");
    await page.waitForFunction(
      () =>
        window.labDimension.runtime.operator.root.userData.identity.form ===
        "forma_bruta",
      null,
      { timeout: 60000 },
    );
    await page.screenshot({ path: ".qa/master-morpher.png" });
    await page.evaluate(() => {
      const p = window.labDimension.runtime.controller.state.player;
      p.energy = 1;
      p.ability.cooldowns.eco_scan = 99;
    });
    await page.waitForFunction(
      () =>
        window.labDimension.runtime.controller.state.player.energy === 100 &&
        window.labDimension.runtime.controller.state.player.ability.cooldowns
          .eco_scan === 0,
    );
    await page.uncheck("[data-morph-free]");
    await page.evaluate(
      () => (window.labDimension.runtime.controller.state.player.energy = 3),
    );
    await page.waitForFunction(
      () => window.labDimension.runtime.controller.state.player.energy > 3,
    );
    assert(
      await page.evaluate(
        () => window.labDimension.runtime.controller.state.player.energy < 20,
      ),
    );
    // Anchor writes only the detached progress; normal save path stays untouched.
    await page.evaluate(async () => {
      const { terrainHeight } = await import("/js/dimension/sector-data.js");
      const r = window.labDimension.runtime,
        p = r.world.layout.pois.find((p) => p.id === "limiar.anchor");
      Object.assign(r.controller, {
        x: p.x,
        z: p.z,
        y: terrainHeight(p.x, p.z),
        flying: false,
        vy: 0,
      });
    });
    await page.locator(".dimension-viewport canvas").focus();
    await page.keyboard.press("e");
    await page.waitForFunction(
      () =>
        window.labDimension.runtime.controller.state.progress.flags
          .dimensionalAnchorStabilized === true,
    );
    assert.equal(
      await page.evaluate(() =>
        JSON.stringify([
          window.labDimension.state.progress,
          window.labDimension.state.player,
        ]),
      ),
      await page.evaluate(() => window.morphOriginal.json),
    );
    await page.uncheck("[data-morph-enable]");
    await page.waitForFunction(
      () => !window.labDimension.runtime.masterMorpher.active,
    );
    assert(
      await page.evaluate(
        () =>
          window.labDimension.runtime.controller.state.progress ===
            window.morphOriginal.progress &&
          window.labDimension.runtime.controller.state.player ===
            window.morphOriginal.player,
      ),
    );
    assert.equal(
      await page.evaluate(
        () => window.labDimension.runtime.actions.available().length,
      ),
      1,
    );
    await page.check("[data-morph-enable]");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => window.labDimension.mode === "2d", null, {
      timeout: 60000,
    });
    assert.equal(await page.locator(".dimension-morpher").count(), 0);
    assert.equal(
      await page.evaluate(() => JSON.stringify(localStorage)),
      storage,
    );
    await page.click("#enter");
    await page.waitForFunction(() => window.labDimension.mode === "3d", null, {
      timeout: 120000,
    });
    assert.equal(
      await page.evaluate(
        () => window.labDimension.runtime.masterMorpher.active,
      ),
      false,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.keyboard.press("F8");
    const bounds = await page.locator(".dimension-morpher").boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    await page.check("[data-morph-enable]");
    await page.evaluate(() => {
      window.failedMaster = window.labDimension.runtime.masterMorpher;
      document
        .querySelector(".dimension-viewport canvas")
        .getContext("webgl2")
        .getExtension("WEBGL_lose_context")
        .loseContext();
    });
    await page.waitForFunction(() => window.labDimension.mode === "2d", null, {
      timeout: 60000,
    });
    assert.equal(await page.evaluate(() => window.failedMaster.active), false);
    assert.equal(await page.locator(".dimension-morpher").count(), 0);
    // Main game: reuse the existing explicit creator authorization, never public cheats.
    await page.goto(process.env.PREVIEW_ORIGIN ?? "http://127.0.0.1:8000");
    await page.waitForFunction(
      () => typeof window.__morfador === "function",
      null,
      { timeout: 120000 },
    );
    await page.evaluate(async () => {
      const { createNewSave } = await import("/js/game/save.js");
      const s = createNewSave(1, "QA morfador");
      s.world = { lastMapId: "mare_cromatica_docas", lastSpawnId: "inicio" };
      s.progress.archetype = "nucleo_dez_forma";
      s.progress.abilities = ["forma_veloz", "eco_scan"];
      s.progress.onboardingCompleted = true;
      s.progress.flags = {
        docas_neblina_alcancada: true,
        docas_sinal_interceptado: true,
      };
      s.progress.mareCromatica = {
        versaoCronometro: 1,
        iniciada: false,
        restante: 600,
      };
      localStorage.setItem("BLOCO404_SAVE_SLOT_1", JSON.stringify(s));
    });
    await page.click("#startBtn");
    await page.click(".continue-btn");
    await page.waitForSelector("#dimension-entry", { state: "visible" });
    await page.click("#dimension-entry");
    await page.waitForFunction(
      () => window.__dimension404.mode === "3d",
      null,
      { timeout: 120000 },
    );
    assert.equal(await page.locator(".dimension-morpher").isVisible(), false);
    assert.equal(
      await page.evaluate(() => {
        const m = window.__dimension404.runtime.masterMorpher;
        m.enable();
        return m.active;
      }),
      false,
    );
    assert(
      await page.evaluate(() => window.__morfador("morfador_de_ressonancia")),
    );
    await page.waitForSelector(".dimension-morpher", { state: "visible" });
    await page.keyboard.press("F8");
    await page.check("[data-morph-enable]");
    const saved = await page.evaluate(() =>
      localStorage.getItem("BLOCO404_SAVE_SLOT_1"),
    );
    await page.selectOption("[data-morph-archetype]", "mare_astral");
    await page.waitForFunction(
      () =>
        window.__dimension404.runtime.operator.root.userData.identity
          .archetype === "mare_astral",
      null,
      { timeout: 60000 },
    );
    assert.equal(
      await page.evaluate(() => window.__dimension404.state.progress.archetype),
      "nucleo_dez_forma",
    );
    await page.evaluate(async () => {
      const { terrainHeight } = await import("/js/dimension/sector-data.js");
      const r = window.__dimension404.runtime,
        p = r.world.layout.pois.find((p) => p.id === "limiar.anchor");
      Object.assign(r.controller, {
        x: p.x,
        z: p.z,
        y: terrainHeight(p.x, p.z),
        flying: false,
        vy: 0,
      });
    });
    await page.locator(".dimension-viewport canvas").focus();
    await page.keyboard.press("e");
    await page.waitForFunction(
      () =>
        window.__dimension404.runtime.controller.state.progress.flags
          .dimensionalAnchorStabilized,
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("BLOCO404_SAVE_SLOT_1")),
      saved,
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => window.__dimension404.mode === "2d",
      null,
      { timeout: 60000 },
    );
    assert.equal(
      await page.evaluate(() => window.__dimension404.state.progress.archetype),
      "nucleo_dez_forma",
    );
    assert.deepEqual(errors, []);
    console.log(
      "Master morpher WebGL: live archetype/suit/form swaps without teleport, all native forms unlocked, optional free resources, isolated anchor, exact refs, exit/reentry cleanup, mobile and no storage writes OK.",
    );
  } finally {
    await browser.close();
  }
}
