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
    await page.selectOption("#sculpt-form", "forma_veloz");
    await page.selectOption("#sculpt-motion", "run");
    await page.waitForFunction(
      () =>
        window.labGallery.models[0].root.userData.performance?.gait ===
        "four-beat",
      null,
      { timeout: 60000 },
    );
    await page.waitForFunction(
      () => !window.labGallery.models[0].root.userData.performance.action,
      null,
      { timeout: 60000 },
    );
    await page.screenshot({ path: ".qa/living-veloz.png" });
    await page.selectOption("#sculpt-form", "forma_bruta");
    await page.waitForFunction(
      () =>
        window.labGallery.models[0].root.userData.identity.form ===
        "forma_bruta",
      null,
      { timeout: 60000 },
    );
    await page.click('[data-performance="primary"]');
    await page.waitForFunction(
      () =>
        window.labGallery.models[0].root.userData.performance?.beat ===
        "execution",
      null,
      { timeout: 60000 },
    );
    await page.screenshot({ path: ".qa/living-bruta.png" });
    assert(
      await page.evaluate(
        () =>
          !!window.labGallery.models[0].root.getObjectByName(
            "industrial-hammer",
          ),
      ),
    );
    await page.selectOption("#sculpt-motion", "idle");
    await page.selectOption("#sculpt-focus", "lamina_dominio_anciao");
    await page.click('[data-performance="primary"]');
    await page.waitForFunction(
      () =>
        window.labGallery.models[3].root.userData.performance?.beat ===
        "execution",
      null,
      { timeout: 60000 },
    );
    await page.screenshot({ path: ".qa/living-sword.png" });
    assert.equal(
      await page.evaluate(() => JSON.stringify(localStorage)),
      storage,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Living browser: shared creature running gait, heavy hammer execution, sword action and unchanged storage OK.",
    );
  } finally {
    await browser.close();
  }
}
