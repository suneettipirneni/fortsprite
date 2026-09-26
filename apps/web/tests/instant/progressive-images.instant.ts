import { readFileSync } from "node:fs"
import { expect, test, type BrowserContext, type Locator } from "@playwright/test"

type Fixture = {
  cookies: Record<
    "desktop" | "mobile",
    Parameters<BrowserContext["addCookies"]>[0][number]
  >
}

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  const fixture = JSON.parse(
    readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"),
  ) as Fixture
  await page.context().addCookies([
    {
      ...fixture.cookies[testInfo.project.name as "desktop" | "mobile"],
      name: "__Secure-better-auth.session_token",
      url: baseURL!.replace("http:", "https:"),
      secure: true,
    },
  ])
})

async function assertOptimizedWidth(image: Locator) {
  const { currentSrc, width, density } = await image.evaluate((element: HTMLImageElement) => ({
    currentSrc: element.currentSrc,
    width: element.getBoundingClientRect().width,
    density: window.devicePixelRatio,
  }))
  const url = new URL(currentSrc)
  expect(url.pathname).toBe("/_next/image")
  expect(url.searchParams.get("url")).toMatch(/^\/_next\/static\/media\/[^/]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/)
  expect(Number(url.searchParams.get("w"))).toBeLessThanOrEqual(Math.ceil(width * density) * 2)
}

test("Sprite previews crossfade into decoded, appropriately sized artwork", async ({ page }) => {
  let releaseImages!: () => void
  const imagesReleased = new Promise<void>((resolve) => { releaseImages = resolve })
  const imageRequests: string[] = []
  page.on("request", (request) => {
    if (request.resourceType() === "image") imageRequests.push(request.url())
  })
  await page.route("**/_next/image?*", async (route) => {
    await imagesReleased
    await route.continue()
  })
  await page.goto("/collection", { waitUntil: "domcontentloaded" })
  const image = page.getByRole("main").locator("article[data-sprite-id] img").first()
  const preview = image.locator("..").locator('[aria-hidden="true"]')
  await expect(page.getByRole("main").getByTestId("virtualized-sprite-groups")).toHaveAttribute("data-hydrated", "true")
  await expect(image).toHaveAttribute("sizes", "(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 14rem")
  await expect(async () => {
    await image.scrollIntoViewIfNeeded()
  }).toPass({ timeout: 5_000 })
  await expect(preview).toHaveCSS("opacity", "1")
  await expect(preview).toHaveCSS("background-image", /url\("data:image\//)
  await expect(image).toHaveCSS("opacity", "0")
  await expect(image).toHaveAttribute("loading", "lazy")
  const transition = image.evaluate((element) => new Promise<number>((resolve) => {
    element.addEventListener("transitionrun", () => {
      const sample = () => {
        const opacity = Number(getComputedStyle(element).opacity)
        if (opacity === 0) requestAnimationFrame(sample)
        else resolve(opacity)
      }
      requestAnimationFrame(sample)
    }, { once: true })
  }))
  await page.screenshot({ path: test.info().outputPath("blurred-previews.png") })
  releaseImages()
  const intermediateOpacity = await transition
  expect(intermediateOpacity).toBeGreaterThan(0)
  expect(intermediateOpacity).toBeLessThan(1)
  await expect(image).toHaveCSS("opacity", "1")
  await expect(preview).toHaveCSS("opacity", "0")
  expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0)
  await assertOptimizedWidth(image)
  expect(imageRequests.some((request) => new URL(request).searchParams.get("w") === "8")).toBe(false)
  await page.screenshot({ path: test.info().outputPath("loaded-artwork.png") })
})

test("Sprite artwork respects reduced motion and cached remounts", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/collection")
  const image = page.getByRole("main").locator("article[data-sprite-id] img").first()
  await expect(image).toHaveCSS("opacity", "1")
  await expect(image).toHaveCSS("transition-property", "none")
  await assertOptimizedWidth(image)
  const source = await image.evaluate((element: HTMLImageElement) => element.currentSrc)
  await page.reload()
  await expect(image).toHaveCSS("opacity", "1")
  await expect(image.locator("..").locator('[aria-hidden="true"]')).toHaveCSS("opacity", "0")
  expect(await image.evaluate((element: HTMLImageElement) => element.currentSrc)).toBe(source)
  expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0)
})

test("grid changes reuse cached image sizes without oversized downloads", async ({ page, isMobile }) => {
  const requestedWidths: number[] = []
  const widthsBySource = new Map<string, Set<number>>()
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (url.pathname !== "/_next/image") return
    const source = url.searchParams.get("url")!
    const width = Number(url.searchParams.get("w"))
    requestedWidths.push(width)
    const widths = widthsBySource.get(source) ?? new Set<number>()
    widths.add(width)
    widthsBySource.set(source, widths)
  })
  await page.goto("/collection")
  await page.getByRole("radio", { name: "Grid view", exact: true }).click()
  await page.getByRole("radio", { name: "Small grid", exact: true }).click()
  const image = page.getByRole("main").locator("article[data-sprite-id] img").first()
  await image.scrollIntoViewIfNeeded()
  await expect(image).toHaveCSS("opacity", "1")
  await assertOptimizedWidth(image)
  expect(requestedWidths.length).toBeGreaterThan(0)
  expect(Math.max(...requestedWidths)).toBeLessThanOrEqual(isMobile ? 640 : 256)
  for (const [source, widths] of widthsBySource) {
    expect([...widths], source).toHaveLength(1)
  }
  await test.info().attach("image-request-widths", {
    body: JSON.stringify(requestedWidths),
    contentType: "application/json",
  })
})

test("Sprite previews remain visible when full artwork fails", async ({ page }) => {
  await page.route("**/_next/image?*", (route) => route.fulfill({ status: 503, body: "Unavailable" }))
  await page.goto("/collection")
  const image = page.getByRole("main").locator("article[data-sprite-id] img").first()
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete)).toBe(true)
  expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(0)
  await expect(image).toHaveCSS("opacity", "0")
  await expect(image.locator("..").locator('[aria-hidden="true"]')).toHaveCSS("opacity", "1")
})
