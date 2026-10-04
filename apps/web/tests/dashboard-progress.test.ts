import assert from "node:assert/strict"
import { test } from "node:test"

import { summarizeDashboardProgress } from "../lib/dashboard-progress.ts"

test("dashboard progress scopes counts and denominators to each season", () => {
  const summary = summarizeDashboardProgress([
    { sourceSeasonId: 41, season: "C7 S3", owned: true, mastered: true },
    { sourceSeasonId: 42, season: "C7 S4", owned: false, mastered: false },
    { sourceSeasonId: null, season: null, owned: true, mastered: false },
    { sourceSeasonId: 42, season: "C7 S4", owned: true, mastered: false },
    { sourceSeasonId: 41, season: "C7 S3", owned: true, mastered: true },
  ])

  assert.deepEqual(summary, {
    currentSeasonId: 42,
    allTime: { owned: 4, mastered: 2, total: 5 },
    seasons: [
      { id: 42, label: "C7 S4", owned: 1, mastered: 0, total: 2 },
      { id: 41, label: "C7 S3", owned: 2, mastered: 2, total: 2 },
      { id: null, label: "Season unavailable", owned: 1, mastered: 0, total: 1 },
    ],
  })
})

test("an empty catalog has zero all-time progress and no current season", () => {
  assert.deepEqual(summarizeDashboardProgress([]), {
    currentSeasonId: null,
    allTime: { owned: 0, mastered: 0, total: 0 },
    seasons: [],
  })
})

test("unknown-season sprites contribute to all time without becoming current", () => {
  assert.deepEqual(summarizeDashboardProgress([
    { sourceSeasonId: null, season: null, owned: true, mastered: true },
  ]), {
    currentSeasonId: null,
    allTime: { owned: 1, mastered: 1, total: 1 },
    seasons: [{ id: null, label: "Season unavailable", owned: 1, mastered: 1, total: 1 }],
  })
})
