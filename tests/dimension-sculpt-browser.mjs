import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
if (!process.env.BROWSER_EXECUTABLE) {
  console.log("Sculpt browser: ignorado; configure Chromium/Playwright.");
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
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(
      `${process.env.PREVIEW_ORIGIN ?? "http://127.0.0.1:8000"}/docs/setor-limiar-3d.html`,
    );
    const storage = await page.evaluate(() => JSON.stringify(localStorage));
    await page.click("#inspect");
    await page.waitForFunction(
      () => window.labGallery?.stats.triangles > 0,
      null,
      { timeout: 60000 },
    );
    assert.equal(await page.evaluate(() => window.labGallery.models.length), 4);
    const stats = await page.evaluate(() => window.labGallery.stats);
    assert(
      stats.calls < 180 && stats.triangles < 26000 && stats.textures === 12,
      "bounded four-rig inspection scene",
    );
    mkdirSync(".qa", { recursive: true });
    for (const [name, angle] of [
      ["front", "0"],
      ["three-quarter", "-0.65"],
      ["back", "3.14159265"],
    ]) {
      await page.click(`[data-sculpt-angle="${angle}"]`);
      await page.waitForFunction(
        (a) =>
          Math.abs(window.labGallery.models[0].root.rotation.y - a) < 0.001,
        Number(angle),
      );
      await page.screenshot({ path: `.qa/sculpt-lab-${name}.png` });
    }
    await page.selectOption("#sculpt-focus", "nucleo_dez_forma");
    await page.click('[data-sculpt-angle="-0.65"]');
    await page.waitForFunction(
      () => window.labGallery.models.filter((m) => m.root.visible).length === 1,
    );
    await page.screenshot({ path: ".qa/sculpt-lab-x10.png" });
    await page.click("#sculpt-close");
    assert.equal(await page.locator("#sculpt-view canvas").count(), 0);
    await page.click("#enter");
    await page.waitForFunction(() => window.labDimension.mode === "3d", null, {
      timeout: 120000,
    });
    for (const id of [
      "motor_bio_forja",
      "mare_astral",
      "lamina_dominio_anciao",
      "nucleo_dez_forma",
    ]) {
      await page.selectOption("#archetype", id);
      await page.waitForFunction(
        (id) =>
          window.labDimension.runtime.operator.root.userData.identity
            .archetype === id,
        id,
        { timeout: 60000 },
      );
      assert.equal(
        await page.evaluate(
          () =>
            window.labDimension.runtime.operator.root.userData.sculpt.revision,
        ),
        "3B.1",
      );
    }
    // Opening inspection from exploration must dispose that world first.
    await page.click("#inspect");
    await page.waitForFunction(
      () => window.labGallery?.stats.triangles > 0,
      null,
      { timeout: 120000 },
    );
    assert.equal(await page.evaluate(() => window.labDimension.mode), "2d");
    assert.equal(await page.locator(".dimension-viewport canvas").count(), 0);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !window.labGallery);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click("#inspect");
    await page.waitForFunction(
      () =>
        window.labGallery?.models.filter((m) => m.root.visible).length === 1,
      null,
      { timeout: 60000 },
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "mobile inspection does not overflow",
    );
    await page.screenshot({ path: ".qa/sculpt-lab-mobile.png" });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !window.labGallery);
    assert.equal(
      await page.evaluate(() => JSON.stringify(localStorage)),
      storage,
      "laboratory never writes a save",
    );
    assert.deepEqual(errors, []);
    console.log(
      "Sculpt real lab: four shared gameplay rigs, front/three-quarter/back, portrait focus, archetype switching, world→gallery disposal, Esc and no storage writes OK.",
      stats,
    );
  } finally {
    await browser.close();
  }
}
