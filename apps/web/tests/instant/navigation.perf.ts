import { readFileSync, writeFileSync } from "node:fs"
import { expect, test, type Request } from "@playwright/test"

type LongTask = { start: number; duration: number }
type NavigationProbe = {
  target: string
  click: number
  heading: number
  paint: number
  tasks: LongTask[]
}

declare global {
  interface Window {
    fortspriteNavigationProbe: NavigationProbe
  }
}

type NavigationRequest = {
  path: string
  prefetch: string | undefined
  timing: ReturnType<Request["timing"]>
}
type NavigationSample = {
  cycle: number
  from: string
  to: string
  cards: number
  domNodes: number
  clickToHeadingMs: number
  clickToPaintMs: number
  longTasks: LongTask[]
  requests: NavigationRequest[]
}

const routes = [
  { path: "/collection", title: "Sprite locker" },
  { path: "/matches", title: "Find your next capture." },
  { path: "/friends", title: "Collect with your squad." },
  { path: "/account", title: "Make your profile yours." },
  { path: "/", title: "Good hunting," },
]

test("measure first and repeat page navigation", async ({ page, baseURL, isMobile }, info) => {
  const fixture = JSON.parse(readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"))
  await page.context().addCookies([{
    ...fixture.cookies[info.project.name],
    name: "__Secure-better-auth.session_token",
    url: baseURL!,
    secure: true,
  }])
  const cdp = await page.context().newCDPSession(page)
  if (isMobile) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
  await page.addInitScript(() => {
    const probe: NavigationProbe = { target: "", click: 0, heading: 0, paint: 0, tasks: [] }
    window.fortspriteNavigationProbe = probe
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        probe.tasks.push({ start: entry.startTime, duration: entry.duration })
    }).observe({ type: "longtask", buffered: true })
    document.addEventListener("click", (event) => {
      const link = (event.target as Element).closest("nav a")
      if (!link) return
      probe.click = performance.now()
      probe.heading = 0
      probe.paint = 0
      const sample = () => {
        const heading = [...document.querySelectorAll<HTMLElement>("main h1")]
          .find((element) => element.offsetHeight > 0 && element.textContent?.includes(probe.target))
        if (heading && location.pathname === link.getAttribute("href")) {
          probe.heading = performance.now()
          requestAnimationFrame(() => { probe.paint = performance.now() })
        } else requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    }, true)
  })
  const requests: NavigationRequest[] = []
  page.on("requestfinished", (request) => {
    if (request.headers().rsc) requests.push({
      path: new URL(request.url()).pathname,
      prefetch: request.headers()["next-router-prefetch"],
      timing: request.timing(),
    })
  })
  await page.goto("/account")
  await expect(page.getByLabel("FortSprite display name", { exact: true })).toBeVisible()
  await page.waitForTimeout(1800)
  const nav = page.getByRole("navigation", {
    name: isMobile ? "Mobile primary" : "Primary", exact: true,
  })
  await cdp.send("Profiler.enable")
  await cdp.send("Profiler.start")
  const samples: NavigationSample[] = []
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const route of routes) {
      const from = new URL(page.url()).pathname
      await page.evaluate((target) => { window.fortspriteNavigationProbe.target = target }, route.title)
      const requestIndex = requests.length
      await nav.locator(`a[href="${route.path}"]`).click()
      await expect(page).toHaveURL(new RegExp(`${route.path}$`))
      await page.waitForFunction(() => window.fortspriteNavigationProbe.paint > 0)
      const result = await page.evaluate(() => {
        const probe = window.fortspriteNavigationProbe
        return {
          cards: document.querySelectorAll("main article[data-sprite-id]").length,
          domNodes: document.querySelector("main")?.querySelectorAll("*").length ?? 0,
          clickToHeadingMs: probe.heading - probe.click,
          clickToPaintMs: probe.paint - probe.click,
          longTasks: probe.tasks.filter((task) =>
            task.start + task.duration >= probe.click && task.start <= probe.paint),
        }
      })
      await page.waitForTimeout(450)
      samples.push({ cycle, from, to: route.path, ...result, requests: requests.slice(requestIndex) })
    }
  }
  const { profile } = await cdp.send("Profiler.stop")
  writeFileSync(info.outputPath("navigation.json"), JSON.stringify(samples, null, 2))
  writeFileSync(info.outputPath("navigation.cpuprofile"), JSON.stringify(profile))
  await info.attach("navigation measurements", { path: info.outputPath("navigation.json"), contentType: "application/json" })
  await info.attach("CPU profile", { path: info.outputPath("navigation.cpuprofile"), contentType: "application/json" })
  console.table(samples.map(({ cycle, to, clickToHeadingMs, clickToPaintMs, cards }) => ({
    cycle, to, cards, headingMs: Math.round(clickToHeadingMs), paintMs: Math.round(clickToPaintMs),
  })))
})
