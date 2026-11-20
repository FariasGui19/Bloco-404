// Real index/menu/save/WebGL smoke and round-trip test. Requires a static server.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
if (!process.env.BROWSER_EXECUTABLE) {
  console.log(
    "Dimension browser: ignorado; defina BROWSER_EXECUTABLE e PLAYWRIGHT_MODULE para WebGL real.",
  );
} else {
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
      "--disable-dev-shm-usage",
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
    let expectedContextFailure = false;
    page.on("console", (m) => {
      if (
        m.type() === "error" &&
        !m.text().includes("404") &&
        !(expectedContextFailure && m.text().includes("THREE.WebGLRenderer"))
      )
        errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400 && !r.url().endsWith("favicon.ico"))
        errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(process.env.PREVIEW_ORIGIN ?? "http://127.0.0.1:8000");
    await page.waitForFunction(
      () => typeof window.__morfador === "function",
      null,
      { timeout: 120000 },
    );
    await page.evaluate(async () => {
      const { createNewSave } = await import("/js/game/save.js");
      const s = createNewSave(1, "QA dimensional");
      s.world = { lastMapId: "mare_cromatica_docas", lastSpawnId: "inicio" };
      s.progress.archetype = "nucleo_dez_forma";
      s.progress.onboardingCompleted = true;
      s.progress.flags = {
        docas_neblina_alcancada: true,
        docas_sinal_interceptado: true,
      };
      s.progress.inventory = ["qa_echo"];
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
    await page.evaluate(async () => {
      const { state } = await import("/js/game/state.js");
      window.dimensionBefore = {
        player: state.player,
        progress: state.progress,
        inventory: state.progress.inventory,
        x: state.player.x,
        y: state.player.y,
        map: state.world.currentMapId,
        health: state.player.health,
      };
    });
    await page.click("#dimension-entry");
    await page.waitForFunction(
      () =>
        window.__dimension404.mode === "3d" || !!window.__dimension404.error,
      null,
      { timeout: 120000 },
    );
    assert.equal(await page.evaluate(() => window.__dimension404.error), "");
    assert.equal(await page.evaluate(() => window.__dimension404.mode), "3d");
    await page.waitForFunction(
      () => {
        const rows = [
          ...document.querySelectorAll(".dimension-landmark-list > *"),
        ];
        return (
          rows.length === 5 && rows.every((row) => /\d+m/.test(row.textContent))
        );
      },
      null,
      { timeout: 60000 },
    );
    const poiLegend = await page
      .locator(".dimension-landmark-list")
      .innerText();
    for (const name of ["PÍER", "ÂNCORA", "FAROL", "RUÍNAS", "ANEL"])
      assert(poiLegend.includes(name));
    const start = await page.evaluate(
      () => window.__dimension404.runtime.controller.z,
    );
    await page.keyboard.down("w");
    await page.waitForFunction(
      (start) => window.__dimension404.runtime.controller.z < start - 1,
      start,
      { timeout: 60000 },
    );
    assert.equal(
      await page.evaluate(
        () => window.__dimension404.runtime.operator.pose.state,
      ),
      "walk",
    );
    await page.keyboard.up("w");
    assert(
      await page.evaluate(
        (start) => window.__dimension404.runtime.controller.z < start - 1,
        start,
      ),
      "WASD moves the actual 3D character",
    );
    await page.keyboard.press("f");
    await page.keyboard.down("Space");
    await page.waitForFunction(
      () => window.__dimension404.runtime.controller.y > 8,
      null,
      { timeout: 60000 },
    );
    await page.keyboard.up("Space");
    assert(
      await page.evaluate(
        () => window.__dimension404.runtime.controller.flying,
      ),
    );
    assert(
      await page.evaluate(() => window.__dimension404.runtime.controller.y > 7),
    );
    assert.equal(
      await page.evaluate(
        () => window.__dimension404.runtime.operator.pose.state,
      ),
      "flight",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        window.__dimension404.runtime.operator.pose.bob === 0 &&
        window.__dimension404.runtime.operator.pose.head === 0,
      null,
      { timeout: 60000 },
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const beforeOrbit = await page.evaluate(() =>
      window.__dimension404.runtime.camera.quaternion.toArray(),
    );
    await page.mouse.move(700, 450);
    await page.mouse.down();
    await page.mouse.move(920, 420, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(
      (before) =>
        window.__dimension404.runtime.camera.quaternion
          .toArray()
          .reduce((sum, n, i) => sum + Math.abs(n - before[i]), 0) > 0.1,
      beforeOrbit,
    );
    await page.keyboard.press("q");
    await page.waitForFunction(() =>
      document.querySelector(".dimension-level").textContent.includes("MIRA"),
    );
    await page.keyboard.press("q");
    await page.selectOption(".dimension-quality", "0.6");
    await page.locator(".dimension-viewport canvas").focus();
    await page.screenshot({ path: ".qa/dimension-flight.png" });
    await page.evaluate(async () => {
      const c = window.__dimension404.runtime.controller;
      const { terrainHeight } = await import("/js/dimension/sector-data.js");
      Object.assign(c, {
        x: 22,
        z: -28,
        y: terrainHeight(22, -28),
        vx: 0,
        vy: 0,
        vz: 0,
        flying: false,
        grounded: true,
      });
    });
    await page.keyboard.press("e");
    await page.waitForFunction(
      () =>
        !!window.__dimension404.state.progress.flags
          .dimensionalAnchorStabilized,
      null,
      { timeout: 15000 },
    );
    assert(
      await page.evaluate(
        () =>
          window.__dimension404.state.progress.flags
            .dimensionalAnchorStabilized,
      ),
    );
    await page.waitForTimeout(250);
    await page.screenshot({ path: ".qa/dimension-anchor.png" });
    await page.evaluate(() =>
      Object.assign(window.__dimension404.runtime.controller, {
        x: -16,
        z: 62,
        y: 5.3,
        vx: 0,
        vy: 0,
        vz: 0,
        flying: false,
        grounded: true,
      }),
    );
    await page.keyboard.press("e");
    await page.waitForFunction(
      () => window.__dimension404.runtime.controller.boating,
    );
    await page.keyboard.down("s");
    await page.waitForFunction(
      () => {
        const c = window.__dimension404.runtime.controller;
        return Math.hypot(c.x + 16, c.z - 65) > 2;
      },
      null,
      { timeout: 60000 },
    );
    await page.keyboard.up("s");
    await page.screenshot({ path: ".qa/dimension-boat.png" });
    await page.keyboard.press("e");
    await page.waitForFunction(
      () => !window.__dimension404.runtime.controller.boating,
    );
    const stats = await page.evaluate(
      () => window.__dimension404.runtime.stats,
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => window.__dimension404.mode === "2d");
    assert(
      await page.evaluate(async () => {
        const { state } = await import("/js/game/state.js"),
          b = window.dimensionBefore;
        return (
          state.player === b.player &&
          state.progress === b.progress &&
          state.progress.inventory === b.inventory &&
          state.player.x === b.x &&
          state.player.y === b.y &&
          state.world.currentMapId === b.map &&
          state.player.health === b.health &&
          !state.world.dimensionActive
        );
      }),
      "all shared data and 2D coordinates survive round-trip",
    );
    assert.equal(await page.locator(".dimension-viewport canvas").count(), 0);
    // Repeat entry; direct event uses the same safeguards and context lifecycle.
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent("bloco404:rupture")),
    );
    await page.waitForFunction(() => window.__dimension404.mode === "3d");
    await page.evaluate(
      () =>
        (window.__dimension404.runtime.controller.state.progress.archetype =
          "mare_astral"),
    );
    await page.evaluate(() =>
      Object.assign(window.__dimension404.runtime.controller, {
        x: 90,
        z: 80,
        y: -1,
        vx: 0,
        vy: 0,
        vz: 0,
        flying: false,
        grounded: false,
      }),
    );
    await page.keyboard.down("Control");
    await page.waitForFunction(
      () => window.__dimension404.runtime.controller.y < -7,
      null,
      { timeout: 60000 },
    );
    await page.keyboard.up("Control");
    assert(
      await page.evaluate(
        () => window.__dimension404.runtime.controller.y < -2,
      ),
      "real Maré swim dive",
    );
    assert.equal(
      await page.evaluate(
        () => window.__dimension404.runtime.operator.pose.state,
      ),
      "swim",
    );
    await page.screenshot({ path: ".qa/dimension-underwater.png" });
    // Graceful hardware/context failure, with no stale input or overlay.
    await page.evaluate(
      () =>
        window.__dimension404.runtime.world.scene &&
        document
          .querySelector(".dimension-viewport canvas")
          .dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
    await page.waitForFunction(() => window.__dimension404.mode === "2d");
    assert.equal(await page.locator(".dimension-viewport canvas").count(), 0);
    assert.equal(await page.locator("#dimension-error").isVisible(), true);
    await page.reload();
    await page.waitForFunction(() => typeof window.__morfador === "function");
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("BLOCO404_SAVE_SLOT_1")),
    );
    assert.equal(saved.progress.flags.dimensionalAnchorStabilized, true);
    assert.equal(saved.world.lastMapId, "mare_cromatica_docas");
    // Unsupported WebGL must leave the real 2D session usable, not a black screen.
    await page.click("#startBtn");
    await page.click(".continue-btn");
    await page.waitForSelector("#dimension-entry", { state: "visible" });
    expectedContextFailure = true;
    await page.evaluate(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        if (
          kind === "webgl2" ||
          kind === "webgl" ||
          kind === "experimental-webgl"
        )
          return null;
        return original.call(this, kind, ...args);
      };
    });
    await page.click("#dimension-entry");
    await page.waitForFunction(() => !!window.__dimension404.error);
    assert.equal(await page.evaluate(() => window.__dimension404.mode), "2d");
    assert.equal(await page.locator(".dimension-viewport canvas").count(), 0);
    assert.match(
      await page.locator("#dimension-error").textContent(),
      /WebGL2 indisponível/,
    );
    assert.deepEqual(errors, []);
    mkdirSync(".qa", { recursive: true });
    writeFileSync(
      ".qa/dimension-report.json",
      JSON.stringify(
        {
          stats,
          errors,
          roundTrip: true,
          contextLoss: true,
          anchorSaved: true,
          boat: true,
          webglUnavailable: true,
        },
        null,
        2,
      ),
    );
    console.log(
      "Dimension real browser: menu/save, WebGL, WASD, flight, orbit, anchor/save, round-trip, Maré dive, reentry and context-loss rollback OK.",
      stats,
    );
  } finally {
    await browser.close();
  }
}
