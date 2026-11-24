import assert from "node:assert/strict";
if (!process.env.BROWSER_EXECUTABLE) {
  console.log("Lote 12 browser: ignorado; configure Chromium/Playwright.");
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
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }),
      errors = [],
      missing = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("response", (r) => {
      if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(
      `${process.env.PREVIEW_ORIGIN ?? "http://127.0.0.1:8000"}/docs/setor-limiar-3d.html`,
    );
    await page.click("#enter");
    await page.waitForFunction(() => window.labDimension?.mode === "3d", null, {
      timeout: 120000,
    });
    await page.waitForTimeout(1800);

    // Todas as folhas do lote 12 precisam chegar: um 404 deixa o halo, a
    // neblina ou a poeira invisíveis sem quebrar nada — falha silenciosa.
    assert.deepEqual(missing.filter((m) => m.includes("lote12")), []);
    const art = await page.evaluate(() => {
      const m = window.labDimension.runtime.world.materials;
      const loaded = (tex) => !!(tex && tex.image && tex.image.width);
      return {
        detailTerrain: loaded(m.detailTerrain),
        caustics: loaded(m.caustics),
        halo: loaded(m.haloTexture),
        mist: loaded(m.mistTexture),
        mask: loaded(m.transitionMask),
      };
    });
    assert.deepEqual(art, {
      detailTerrain: true,
      caustics: true,
      halo: true,
      mist: true,
      mask: true,
    });

    const wired = await page.evaluate(() => {
      const w = window.labDimension.runtime.world;
      const flutters = w.props.props.filter((p) => p.flutter).length;
      const flames = w.props.props.filter((p) => p.flame).length;
      return { flutters, flames, leaves: w.drift.leaves.length, mist: w.drift.mist.length };
    });
    assert.equal(wired.flutters, 2, "dois estandartes tremulam");
    assert.equal(wired.flames, 4, "quatro lanternas têm chama");
    assert.equal(wired.leaves, 10);
    assert.equal(wired.mist, 7);

    // Andar precisa soltar poeira: o passo é medido no controlador.
    const walked = await page.evaluate(() => {
      const rt = window.labDimension.runtime,
        c = rt.controller;
      c.x = 6;
      c.z = -8;
      const dust = rt.world.scene.getObjectByName("footfall-dust");
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW", key: "w" }));
      let seen = 0;
      for (let i = 0; i < 30; i++) {
        rt.frame(0.033, { mode: "3d", progress: 1 });
        seen = Math.max(seen, dust.children.filter((s) => s.visible).length);
      }
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW", key: "w" }));
      const puff = dust.children.find((s) => s.material.map?.image);
      return { seen, map: puff ? puff.material.map.image.width : 0 };
    });
    assert.ok(walked.seen > 0, "andar solta poeira no pé");
    assert.equal(walked.map, 96, "a poeira usa a tira de 96 px");

    const stats = await page.evaluate(() => window.labDimension.runtime.stats);
    assert.ok(stats.calls < 150, `calls ${stats.calls} acima do teto`);
    assert.ok(stats.triangles < 26000, `triangles ${stats.triangles}`);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}
