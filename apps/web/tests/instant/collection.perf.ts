import { readFileSync, writeFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import type { CollectionSnapshot } from "@workspace/contracts"

test("measure collection toggle work independently of save latency", async ({ page, baseURL, isMobile }, info) => {
  const fixture = JSON.parse(readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"))
  const secure = new URL(baseURL!).protocol === "https:"
  await page.context().addCookies([{
    ...fixture.actors.b.cookies[info.project.name],
    name: `${secure ? "__Secure-" : ""}better-auth.session_token`,
    url: baseURL!, secure,
  }])
  const response = await page.request.get("/api/v1/collection")
  expect(response.ok()).toBe(true)
  const collection = await response.json() as CollectionSnapshot
  const season = Math.max(...collection.items.flatMap((item) => item.sourceSeasonId === null ? [] : [item.sourceSeasonId]))
  const first = collection.items.filter((item) => item.sourceSeasonId === season)
    .toSorted((a, b) => a.displayOrder - b.displayOrder)[0]!
  const reset = await page.request.put(`/api/v1/collection/${first.id}`, {
    headers: { origin: baseURL! }, data: { owned: false, mastered: false },
  })
  expect(reset.ok()).toBe(true)
  await page.goto("/collection")
  const article = page.locator(`article[data-sprite-id="${first.id}"]`)
  const capture = article.getByRole("button", { name: /^Captured / })
  await expect(capture).toHaveAttribute("aria-pressed", "false")
  await page.waitForLoadState("networkidle")

  const initialScripts = await page.evaluate(() => performance.getEntriesByType("resource")
    .filter((entry): entry is PerformanceResourceTiming => entry instanceof PerformanceResourceTiming && entry.initiatorType === "script")
    .reduce((bytes, entry) => bytes + entry.decodedBodySize, 0))
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Performance.enable")
  if (isMobile) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
  const samples: Array<{ scriptMs: number; taskMs: number; clickToPaintMs: number }> = []
  for (let index = 0; index < 7; index++) {
    const desired = index % 2 === 0 ? "true" : "false"
    const gate = Promise.withResolvers<void>()
    const intercepted = Promise.withResolvers<void>()
    await page.route("**/collection", async (route) => {
      if (!route.request().headers()["next-action"]) return route.continue()
      intercepted.resolve()
      await gate.promise
      await route.continue()
    })
    try {
      await capture.evaluate((element, desired) => {
        element.addEventListener("click", () => {
          performance.mark("capture-click")
          const sample = () => {
            if (element.getAttribute("aria-pressed") !== desired) return requestAnimationFrame(sample)
            requestAnimationFrame(() => { performance.mark("capture-paint") })
          }
          requestAnimationFrame(sample)
        }, { once: true })
      }, desired)
      const before = await cdp.send("Performance.getMetrics")
      await capture.click()
      await intercepted.promise
      await expect(capture).toHaveAttribute("aria-pressed", desired)
      await expect(article).toHaveAttribute("aria-busy", "true")
      await page.waitForFunction(() => performance.getEntriesByName("capture-paint").length > 0)
      const after = await cdp.send("Performance.getMetrics")
      const duration = (name: string) => 1000 * (
        after.metrics.find((metric) => metric.name === name)!.value -
        before.metrics.find((metric) => metric.name === name)!.value
      )
      const clickToPaintMs = await page.evaluate(() => {
        const value = performance.getEntriesByName("capture-paint")[0]!.startTime - performance.getEntriesByName("capture-click")[0]!.startTime
        performance.clearMarks("capture-click")
        performance.clearMarks("capture-paint")
        return value
      })
      samples.push({ scriptMs: duration("ScriptDuration"), taskMs: duration("TaskDuration"), clickToPaintMs })
    } finally {
      gate.resolve()
    }
    await expect(article).toHaveAttribute("aria-busy", "false")
    await page.unroute("**/collection")
    await page.waitForLoadState("networkidle")
  }
  const result = { viewport: page.viewportSize(), cpuThrottle: isMobile ? 4 : 1, initialScriptBytes: initialScripts, samples }
  await info.attach("collection-performance", { body: JSON.stringify(result, null, 2), contentType: "application/json" })
  const median = (values: number[]) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)]!
  console.log(JSON.stringify({ project: info.project.name, initialScriptBytes: initialScripts,
    scriptMs: median(samples.map((sample) => sample.scriptMs)),
    taskMs: median(samples.map((sample) => sample.taskMs)),
    clickToPaintMs: median(samples.map((sample) => sample.clickToPaintMs)),
  }))
})

test("profile collection scrolling, search, and view changes", async ({ page, baseURL, isMobile }, info) => {
  const fixture = JSON.parse(readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"))
  const secure = new URL(baseURL!).protocol === "https:"
  await page.context().addCookies([{
    ...fixture.actors.b.cookies[info.project.name],
    name: `${secure ? "__Secure-" : ""}better-auth.session_token`, url: baseURL!, secure,
  }])
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/collection")
  await expect(page.getByRole("heading", { name: "Sprite locker" })).toBeVisible()
  await page.getByRole("button", { name: "Clear collection query" }).click()
  await page.waitForLoadState("networkidle")
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Performance.enable")
  await cdp.send("Profiler.enable")
  if (isMobile) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
  await cdp.send("Profiler.start")
  const metrics = async () => (await cdp.send("Performance.getMetrics")).metrics
  const measurements = []
  for (const view of ["Grouped", "Grid", "List"]) {
    await page.getByRole("radio", { name: `${view} view`, exact: true }).click()
    const before = await metrics()
    const frames = await page.evaluate(async () => {
      const frames: number[] = []
      const maxScroll = Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 3)
      await new Promise<void>((resolve) => {
        let start = 0
        let previous = 0
        const step = (now: number) => {
          if (!start) start = previous = now
          const progress = Math.min((now - start) / 1600, 1)
          frames.push(now - previous)
          previous = now
          window.scrollTo(0, maxScroll * (progress <= 0.5 ? progress * 2 : (1 - progress) * 2))
          if (progress === 1) resolve()
          else requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      })
      return frames.slice(1)
    })
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    const after = await metrics()
    const duration = (name: string) => 1000 * (after.find((metric) => metric.name === name)!.value - before.find((metric) => metric.name === name)!.value)
    measurements.push({ view, scriptMs: duration("ScriptDuration"), taskMs: duration("TaskDuration"),
      frames: frames.length, framesOver50Ms: frames.filter((frame) => frame > 50).length,
      mountedCards: await page.locator("article[data-sprite-id]").count(),
      domNodes: await page.locator("main *").count(),
    })
  }
  await page.getByRole("radio", { name: "Grouped view", exact: true }).click()
  const search = page.getByRole("combobox", { name: "Search collection", exact: true })
  const beforeSearch = await metrics()
  await search.pressSequentially("Trick or Treat")
  await expect(page.getByRole("status").filter({ hasText: /^Showing / })).toHaveText(/Showing \d+ of/)
  await search.fill("no-such-sprite-123")
  await expect(page.getByText("No Sprites match these filters", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Clear filters", exact: true }).click()
  await expect(page.locator("article[data-sprite-id]").first()).toBeVisible()
  const afterSearch = await metrics()
  const searchScriptMs = 1000 * (afterSearch.find((metric) => metric.name === "ScriptDuration")!.value - beforeSearch.find((metric) => metric.name === "ScriptDuration")!.value)
  const { profile } = await cdp.send("Profiler.stop")
  writeFileSync(info.outputPath("collection.cpuprofile"), JSON.stringify(profile))
  await info.attach("collection CPU profile", { path: info.outputPath("collection.cpuprofile"), contentType: "application/json" })
  await info.attach("collection interaction measurements", { body: JSON.stringify({ measurements, searchScriptMs }, null, 2), contentType: "application/json" })
  await page.screenshot({ path: info.outputPath("collection.png") })
  expect(errors).toEqual([])
  await expect(page.locator("nextjs-dialog")).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  console.log(JSON.stringify({ project: info.project.name, measurements, searchScriptMs }))
})

test("fast scrolling keeps the collection height stable and artwork visible", async ({ page, baseURL, isMobile }, info) => {
  const fixture = JSON.parse(readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"))
  const secure = new URL(baseURL!).protocol === "https:"
  await page.context().addCookies([{
    ...fixture.actors.b.cookies[info.project.name],
    name: `${secure ? "__Secure-" : ""}better-auth.session_token`, url: baseURL!, secure,
  }])
  await page.goto("/collection")
  await page.getByRole("button", { name: "Clear collection query" }).click()
  const cdp = await page.context().newCDPSession(page)
  if (isMobile) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
  const measurements = []
  for (const view of ["Grouped", "Grid", "List"]) {
    await page.getByRole("radio", { name: `${view} view`, exact: true }).click()
    await page.evaluate(() => window.scrollTo(0, 0))
    const grid = page.locator('[data-hydrated="true"][data-testid^="virtualized-sprite-"]')
    await expect(grid).toBeVisible()
    await page.waitForLoadState("networkidle")
    const initial = await grid.evaluate((element) => {
      const rows = [...element.children].map((row) => row.getBoundingClientRect())
      return { height: element.getBoundingClientRect().height, bufferedBottom: Math.max(...rows.map((row) => row.bottom)), viewportHeight: innerHeight }
    })
    expect(initial.bufferedBottom).toBeGreaterThanOrEqual(initial.viewportHeight * 2)
    await cdp.send("Input.synthesizeScrollGesture", {
      x: page.viewportSize()!.width / 2, y: page.viewportSize()!.height * 0.75,
      yDistance: -6000, speed: 12000, gestureSourceType: "touch", preventFling: true,
    })
    const after = await grid.evaluate((element) => {
      const visible = [...element.querySelectorAll("img")].filter((image) => {
        const bounds = image.getBoundingClientRect()
        return bounds.top < innerHeight && bounds.bottom > 96
      })
      return { height: element.getBoundingClientRect().height, scrollY, images: visible.length,
        fadingDecodedImages: visible.filter((image) => image.complete && image.naturalWidth > 0 && Number(getComputedStyle(image).opacity) < 1).length,
      }
    })
    expect(after.scrollY).toBeGreaterThan(4000)
    // Unseen rows should have accurate estimates, rather than collapsing the
    // scroll range by thousands of pixels as a fast gesture reaches them.
    expect(Math.abs(after.height - initial.height)).toBeLessThan(100)
    expect(after.images).toBeGreaterThan(0)
    expect(after.fadingDecodedImages).toBe(0)
    measurements.push({ view, initial, after })
  }
  await info.attach("fast-scroll measurements", { body: JSON.stringify(measurements, null, 2), contentType: "application/json" })
})
