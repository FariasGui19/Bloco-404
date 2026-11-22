import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
if (!process.env.BROWSER_EXECUTABLE)
  console.log("Surgery browser: configure Chromium/Playwright.");
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
    for (const detail of ["face", "bracelet"]) {
      await page.selectOption("#sculpt-detail", detail);
      await page.screenshot({ path: `.qa/surgery-${detail}.png` });
    }
    await page.selectOption("#sculpt-detail", "body");
    for (const [id, kind] of [
      ["lamina_dominio_anciao", "ancient"],
      ["motor_bio_forja", "bio"],
      ["mare_astral", "mare"],
    ]) {
      await page.selectOption("#sculpt-focus", id);
      await page.click('[data-performance="secondary"]');
      await page.waitForFunction(
        (kind) =>
          window.labGallery.models
            .find(
              (m) =>
                m.root.userData.identity.archetype ===
                {
                  ancient: "lamina_dominio_anciao",
                  bio: "motor_bio_forja",
                  mare: "mare_astral",
                }[kind],
            )
            .root.getObjectByName("operator-vfx").userData.signature === kind,
        kind,
        { timeout: 60000 },
      );
      await page.screenshot({ path: `.qa/surgery-${kind}-reading.png` });
      await page.click('[data-performance="signature"]');
      await page.waitForFunction(
        () =>
          window.labGallery.models.some(
            (m) => m.root.visible && m.root.userData.performance.variant === 2,
          ),
        null,
        { timeout: 60000 },
      );
      await page.screenshot({ path: `.qa/surgery-${kind}-special.png` });
    }
    // A native suit reveal, not merely a transformation fixture.
    await page.selectOption("#sculpt-focus", "lamina_dominio_anciao");
    await page.click('[data-performance="transform"]');
    await page.waitForFunction(
      () =>
        window.labGallery.models[3].root.userData.identity.clothing ===
        "civilian",
      null,
      { timeout: 60000 },
    );
    await page.waitForFunction(
      () => window.labGallery.preview.remaining === 0,
      null,
      { timeout: 60000 },
    );
    await page.click('[data-performance="transform"]');
    await page.waitForFunction(
      () =>
        window.labGallery.models[3].root.userData.identity.clothing ===
        "dominio",
      null,
      { timeout: 60000 },
    );
    await page.selectOption("#sculpt-form", "forma_bruta");
    await page.waitForFunction(
      () =>
        window.labGallery.models[0].root.userData.identity.form ===
        "forma_bruta",
      null,
      { timeout: 60000 },
    );
    await page.waitForFunction(
      () => window.labGallery.preview.remaining === 0,
      null,
      { timeout: 60000 },
    );
    await page.screenshot({ path: ".qa/surgery-brute.png" });
    await page.click('[data-performance="signature"]');
    await page.waitForFunction(
      () =>
        window.labGallery.models[0].root.userData.performance.phase > 0.48 &&
        window.labGallery.models[0].root.userData.performance.phase < 0.75,
      null,
      { timeout: 60000 },
    );
    await page.screenshot({ path: ".qa/surgery-brute-impact.png" });
    await page.click("#sculpt-close");
    await page.selectOption("#archetype", "lamina_dominio_anciao");
    await page.click("#enter");
    await page.waitForFunction(() => window.labDimension.mode === "3d", null, {
      timeout: 120000,
    });
    await page.locator(".dimension-viewport canvas").focus();
    await page.keyboard.press("t");
    await page.waitForFunction(
      () =>
        window.labDimension.runtime.operator.root.userData.identity.clothing ===
        "dominio",
      null,
      { timeout: 60000 },
    );
    await page.waitForFunction(
      () => window.labDimension.runtime.actions.action.remaining === 0,
      null,
      { timeout: 60000 },
    );
    await page.keyboard.press("l");
    await page.waitForFunction(
      () =>
        window.labDimension.runtime.actions.action.variant === 2 &&
        window.labDimension.runtime.actions.action.remaining > 0,
      null,
      { timeout: 60000 },
    );
    assert.equal(
      await page.evaluate(() => window.labDimension.runtime.actions.action.id),
      "golpe_ruptura",
    );
    await page.screenshot({ path: ".qa/surgery-gameplay-domain.png" });
    await page.waitForFunction(
      () => window.labDimension.runtime.actions.action.remaining === 0,
      null,
      { timeout: 60000 },
    );
    const energy = await page.evaluate(
      () => window.labDimension.runtime.controller.state.player.energy,
    );
    await page.keyboard.press("l"); // Same cooldown is not bypassed by the new button.
    assert.equal(
      await page.evaluate(
        () => window.labDimension.runtime.controller.state.player.energy,
      ),
      energy,
    );
    await page.selectOption("#archetype", "nucleo_dez_forma");
    await page.waitForFunction(
      () =>
        window.labDimension.runtime.operator.root.userData.identity
          .archetype === "nucleo_dez_forma",
      null,
      { timeout: 60000 },
    );
    await page.evaluate(() => {
      window.labDimension.runtime.controller.state.progress.archetypeProgress.nucleo_dez_forma =
        { level: 4, xp: 0 };
    });
    await page.locator(".dimension-viewport canvas").focus();
    await page.keyboard.press("r");
    await page.waitForFunction(
      () => window.labDimension.runtime.actions.selected === "forma_veloz",
      null,
      { timeout: 60000 },
    );
    await page.keyboard.press("r");
    await page.waitForFunction(
      () => window.labDimension.runtime.actions.selected === "forma_bruta",
      null,
      { timeout: 60000 },
    );
    await page.keyboard.press("t");
    await page.waitForFunction(
      () =>
        window.labDimension.runtime.controller.state.player.nucleoForm ===
        "forma_bruta",
      null,
      { timeout: 60000 },
    );
    await page.waitForFunction(
      () =>
        window.labDimension.runtime.operator.root.userData.identity.form ===
        "forma_bruta",
      null,
      { timeout: 60000 },
    );
    await page.waitForFunction(
      () => window.labDimension.runtime.actions.action.remaining === 0,
      null,
      { timeout: 60000 },
    );
    await page.screenshot({ path: ".qa/surgery-gameplay-brute.png" });
    await page.keyboard.press("l");
    await page.waitForFunction(
      () => window.labDimension.runtime.actions.action.id === "pancada_quebra",
      null,
      { timeout: 60000 },
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.keyboard.press("t");
    await page.waitForFunction(
      () => !window.labDimension.runtime.operator.root.userData.identity.form,
      null,
      { timeout: 60000 },
    );
    assert.equal(
      await page.evaluate(() => JSON.stringify(localStorage)),
      storage,
    );
    const touch = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    await touch.goto(
      `${process.env.PREVIEW_ORIGIN ?? "http://127.0.0.1:8000"}/docs/setor-limiar-3d.html`,
    );
    await touch.click("#enter");
    await touch.waitForFunction(() => window.labDimension.mode === "3d", null, {
      timeout: 120000,
    });
    const bar = await touch.locator(".dimension-combat-touch").boundingBox();
    const status = await touch.locator(".dimension-status").boundingBox();
    assert(
      bar &&
        bar.x >= 0 &&
        bar.x + bar.width <= 390 &&
        bar.y >= status.y + status.height,
    );
    await touch
      .locator('.dimension-combat-touch [data-spatial-key="KeyL"]')
      .tap();
    await touch.waitForFunction(
      () => window.labDimension.runtime.actions.action.variant === 2,
      null,
      { timeout: 60000 },
    );
    await touch.screenshot({ path: ".qa/surgery-touch.png" });
    await touch.close();
    assert.deepEqual(errors, []);
    console.log(
      "Surgery browser: detail inspection, three signatures, real gallery suit reveal, native L costs/cooldown, level-4 Bruta/hammer, reduced-motion return and no storage/page errors OK.",
    );
  } finally {
    await browser.close();
  }
}
