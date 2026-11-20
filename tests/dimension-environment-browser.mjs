import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
if (!process.env.BROWSER_EXECUTABLE) {
  console.log(
    "Environment browser: ignorado; defina BROWSER_EXECUTABLE e PLAYWRIGHT_MODULE.",
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
    ],
    env: {
      ...process.env,
      LD_LIBRARY_PATH: process.env.BROWSER_LIBRARY_PATH ?? "",
    },
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1100, height: 700 },
      }),
      errors = [],
      report = {};
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("response", (r) => {
      if (r.status() >= 400 && !r.url().endsWith("favicon.ico"))
        errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(
      `${process.env.PREVIEW_ORIGIN ?? "http://127.0.0.1:8000"}/tests/fixtures/dimension-environment.html`,
    );
    await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
    mkdirSync(".qa", { recursive: true });
    for (const view of ["ground", "coast", "flight", "underwater"]) {
      report[view] = await page.evaluate(
        (name) => window.sampleEnvironment(name, 12),
        view,
      );
      assert(
        report[view].textures <= 5,
        "five resident textures, no reflection/depth render targets",
      );
      assert(report[view].calls <= 125);
      assert(
        report[view].triangles < 30000,
        "base environmental pass does not increase geometric budget",
      );
      await page.screenshot({ path: `.qa/environment-after-${view}.png` });
    }
    const animation = await page.evaluate(() => {
      const renderer = window.environmentRenderer,
        world = window.environmentWorld;
      const water = world.scene.children.find(
        (m) => m.material === world.environment.waterMaterial,
      );
      window.sampleEnvironment("coast", 0);
      const first = renderer.domElement.toDataURL();
      const version = water.geometry.attributes.position.version,
        programs = renderer.info.programs.length;
      window.sampleEnvironment("coast", 12);
      const next = renderer.domElement.toDataURL();
      window.sampleEnvironment("coast", 12);
      const repeated = renderer.domElement.toDataURL();
      return {
        moves: first !== next,
        deterministic: next === repeated,
        vertexUploads: water.geometry.attributes.position.version - version,
        programsStable: programs === renderer.info.programs.length,
      };
    });
    assert(animation.moves);
    assert(animation.deterministic);
    assert.equal(animation.vertexUploads, 0);
    assert(animation.programsStable);
    const memory = await page.evaluate(() => {
      const env = window.environmentWorld.environment,
        r = window.environmentRenderer;
      const before = r.info.memory.textures;
      env.dispose();
      const after = r.info.memory.textures;
      env.dispose();
      return { before, after, owned: env.textures.length };
    });
    assert.equal(
      memory.before - memory.after,
      memory.owned,
      "shader-uniform textures explicitly freed",
    );
    assert.deepEqual(errors, []);
    writeFileSync(
      ".qa/environment-report.json",
      JSON.stringify({ report, animation, memory, errors }, null, 2),
    );
    console.log(
      "Environment WebGL: four fixed views, animated shore/waves, deterministic frames, stable shader programs, zero vertex uploads and owned texture disposal OK.",
      report,
    );
  } finally {
    await browser.close();
  }
}
