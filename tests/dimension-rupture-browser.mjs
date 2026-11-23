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
    const snap = async (path) => {
      // The mission now casts a textured floor; in headless SwiftShader the
      // compositor snapshot can stall rAF for the whole timeout window. The
      // geometry assertions are authoritative, so capture best-effort on the
      // mission canvas instead.
      try {
        const data = await page.evaluate(() => document.querySelector('.mare-mission canvas')?.toDataURL('image/png'));
        if (data) writeFileSync(path, Buffer.from(data.split(',')[1], 'base64'));
      } catch {}
    };
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
      s.world = { lastMapId: "mare_cromatica_fenda", lastSpawnId: "inicio" };
      s.progress.archetype = "nucleo_dez_forma";
      s.progress.abilities = ["forma_veloz", "eco_scan"];
      s.progress.onboardingCompleted = true;
      s.progress.flags = {
        docas_neblina_alcancada: true,
        docas_sinal_interceptado: true,
      };
      s.progress.inventory = ["qa_echo"];
      s.progress.mareCromatica = {
        versaoCronometro: 1,
        iniciada: true,
        ancoraEstavel: true,
        desfecho: "parcial",
        restante: 600,
      };
      localStorage.setItem("BLOCO404_SAVE_SLOT_1", JSON.stringify(s));
    });
    await page.click("#startBtn");
    await page.click(".continue-btn");
    await page.waitForSelector("#dimension-entry", { state: "visible" });
    await page.evaluate(async () => {
      const { state } = await import("/js/game/state.js");
      state.player.x = 5;
      state.player.y = 4;
      window.ruptureBefore = {
        player: state.player,
        progress: state.progress,
        x: 5,
        y: 4,
        health: state.player.health,
      };
      window.rupturePhases = [];
      window.addEventListener("bloco404:rupture-phase", (e) =>
        window.rupturePhases.push(e.detail.phase),
      );
      const { checkInteractions } = await import("/js/game/interactions.js");
      await checkInteractions(true);
    });
    assert.equal(await page.evaluate(() => window.__dimension404.mode), "2d");
    await snap(".qa/rupture-dialogue.png");
    await page.evaluate(async () => {
      const { closeDialogue } = await import("/js/ui/dialogue.js");
      closeDialogue();
    });
    // New saves first visit the contained bay; legacy pending ruptures still use
    // the unmodified bridge contract covered by dimension-rupture.mjs.
    await page.waitForFunction(() => window.__dimension404.mode === '3d' && !!window.__dimension404.runtime?.mission);
    assert.equal(await page.evaluate(async () => {
      const { state } = await import('/js/game/state.js');
      return state.progress.dimensionalRupture?.status ?? null;
    }), null);
    const staged = await page.evaluate(async () => {
      const { sites } = await import('/js/dimension/mare-mission-model.js');
      const m = window.__dimension404.runtime.mission;
      // Staged objective positions: this smoke is not a manual traversal claim.
      for (const id of ['fita','sal','eco','terminal','ancora']) {
        const s = sites.find(s => s.id === id);
        m.x=s.x; m.y=s.y; m.vx=m.vy=0;
        window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));
        window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE'}));
      }
      return { finished: m.finished, rank: m.p.rank, data: m.p.data.length };
    });
    assert.deepEqual(staged, { finished: true, rank: 4, data: 3 });
    await page.evaluate(() => {
      for (let i = 0; i < 90; i++) window.__dimension404.tick(0.1);
    });
    // The intermediate "entering" beat can be shorter than a polling frame on
    // slow software renderers; the handoff itself is the contract.
    await page.waitForFunction(
      () => !window.__dimension404.runtime?.mission,
      null,
      { timeout: 120000 },
    );
    await snap(".qa/rupture-entering.png");
    await page.waitForFunction(
      () => window.__dimension404.mode === "3d",
      null,
      { timeout: 60000 },
    );
    await page.waitForFunction(
      () => window.rupturePhases.includes("arrived"),
      null,
      { timeout: 60000 },
    );
    assert(
      await page.evaluate(async () => {
        const { state } = await import("/js/game/state.js");
        return (
          state.progress.dimensionalRupture.status === "arrived" &&
          state.progress === window.ruptureBefore.progress &&
          state.player === window.ruptureBefore.player
        );
      }),
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => window.__dimension404.mode === "2d",
      null,
      { timeout: 60000 },
    );
    assert(
      await page.evaluate(async () => {
        const { state } = await import("/js/game/state.js");
        return (
          state.player.x === 5 &&
          state.player.y === 4 &&
          state.player.health === window.ruptureBefore.health &&
          state.progress.mareCromatica.desfecho === "parcial"
        );
      }),
    );
    await page.waitForFunction(() => window.rupturePhases.includes("returned"));
    assert.deepEqual(await page.evaluate(() => window.rupturePhases), [
      "interference",
      "entering",
      "arrived",
      "returned",
    ]);
    assert.deepEqual(errors, []);
    console.log(
      "Rupture browser: real final terminal → Nulo dialogue → entering sequence → Limiar → Esc/2D, unchanged references/vitals/outcome and no page errors OK.",
    );
  } finally {
    await browser.close();
  }
}
