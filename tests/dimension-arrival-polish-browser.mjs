import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
if (!process.env.BROWSER_EXECUTABLE)
  console.log("Living browser: configure Chromium/Playwright.");
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
    mkdirSync(".qa", { recursive: true });
    const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
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
    await page.selectOption("#sculpt-focus", "nucleo_dez_forma");
    await page.selectOption("#sculpt-detail", "face");
    for (const [label, angle] of [
      ["front", 0],
      ["profile", -1.57],
      ["back", Math.PI],
    ]) {
      await page.evaluate((angle) => window.labGallery.setAngle(angle), angle);
      await page.screenshot({ path: `.qa/arrival-face-${label}.png` });
    }
    await page.selectOption("#sculpt-detail", "body");
    await page.evaluate(() => window.labGallery.setAngle(-0.65));
    await page.selectOption("#sculpt-form", "forma_veloz");
    await page.selectOption("#sculpt-motion", "run");
    await page.waitForFunction(
      () =>
        window.labGallery.models[0].root.userData.identity.form ===
          "forma_veloz" &&
        !window.labGallery.models[0].root.userData.performance.action,
      null,
      { timeout: 60000 },
    );
    const slender = await page.evaluate(
      () => window.labGallery.models[0].root.userData.performance.feline.width,
    );
    assert(slender < 1);
    await page.screenshot({ path: ".qa/arrival-feline-run.png" });
    await page.click('[data-performance="primary"]');
    await page.waitForFunction(
      () =>
        window.labGallery.models[0].root.userData.performance.feline.width >
        1.09,
      null,
      { timeout: 60000 },
    );
    await page.screenshot({ path: ".qa/arrival-feline-attack.png" });
    await page.waitForFunction(
      () => !window.labGallery.models[0].root.userData.performance.action,
      null,
      { timeout: 60000 },
    );
    assert(
      await page.evaluate(
        () =>
          window.labGallery.models[0].root.getObjectByName("feline-jaw")
            .rotation.x === 0,
      ),
    );
    await page.selectOption("#sculpt-focus", "lamina_dominio_anciao");
    await page.selectOption("#sculpt-motion", "idle");
    for (const action of ["select", "interact", "primary", "secondary"]) {
      await page.click(`[data-performance="${action}"]`);
      await page.waitForFunction(
        () => window.labGallery.models[3].root.userData.performance.phase > 0.4,
        null,
        { timeout: 60000 },
      );
      await page.screenshot({ path: `.qa/arrival-ancient-${action}.png` });
    }
    assert.equal(
      await page.evaluate(() => JSON.stringify(localStorage)),
      storage,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Arrival browser: portrait in three angles, slender running / aggressive attack / recovery, ancient R/E/J/K and no storage/page errors OK.",
    );
  } finally {
    await browser.close();
  }
}
