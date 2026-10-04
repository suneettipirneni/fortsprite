"use client"

import { useState, type ReactNode } from "react"

import { Progress } from "@workspace/ui/components/progress"
import { SelectItem } from "@workspace/ui/components/select"

import { FilterSelect } from "@/components/filter-select"
import { PageValueSkeleton, ProgressBarSkeleton } from "@/components/page-data-skeletons"
import { completionPercent } from "@/lib/catalog-presentation"
import type { DashboardProgress } from "@/lib/dashboard-progress"

// Without progress, render the same geometry while the server streams the data.
export function DashboardStats({ progress, sharingCount }: {
  progress?: DashboardProgress
  sharingCount: ReactNode
}) {
  const [scope, setScope] = useState("current")
  const currentSeason = progress?.seasons.find((season) =>
    season.id !== null && season.id === progress.currentSeasonId,
  )
  const selectedSeason = progress?.seasons.find((season) =>
    scope === "current"
      ? season.id !== null && season.id === progress.currentSeasonId
      : String(season.id) === scope,
  )
  const stats = scope === "all" ? progress?.allTime : selectedSeason
  const percent = stats ? completionPercent(stats.owned, stats.total) : 0

  return (
    <section aria-labelledby="progress-heading" className="@container space-y-3">
      <div className="flex flex-col gap-3 @min-[28rem]:flex-row @min-[28rem]:items-center @min-[28rem]:justify-between">
        <h2 id="progress-heading" className="text-lg font-semibold tracking-tight">
          Collection progress
        </h2>
        <FilterSelect
          label="Stats season"
          value={scope}
          onValueChange={setScope}
          disabled={!progress}
          className="@min-[28rem]:w-auto"
        >
          <SelectItem value="current">
            {progress?.currentSeasonId === null
              ? "Current season unavailable"
              : `Current season${currentSeason ? ` · ${currentSeason.label}` : ""}`}
          </SelectItem>
          {progress?.seasons.filter((season) => season.id === null || season.id !== progress.currentSeasonId).map((season) => (
            <SelectItem key={String(season.id)} value={String(season.id)}>
              {season.label}
            </SelectItem>
          ))}
          <SelectItem value="all">All time</SelectItem>
        </FilterSelect>
      </div>
      <dl aria-live="polite" aria-busy={!progress} className="grid grid-cols-2 border-y border-white/10 @min-[36rem]:grid-cols-4">
        <div className="flex flex-col gap-1 py-5 pr-4">
          <dt className="truncate text-base text-muted-foreground sm:text-sm">Collected</dt>
          <dd className="tabular-nums text-3xl font-semibold tracking-tight">
            {progress ? stats?.owned ?? 0 : <PageValueSkeleton label="Loading collected count" />}
          </dd>
        </div>
        <div className="flex flex-col gap-1 border-l border-white/10 py-5 pl-4 @min-[36rem]:px-6">
          <dt className="truncate text-base text-muted-foreground sm:text-sm">Completion</dt>
          <dd className="tabular-nums text-3xl font-semibold tracking-tight">
            {progress ? <>
              {percent}%
              <Progress value={percent} aria-label="Collection completion" className="mt-3 h-1.5" />
            </> : <>
              <PageValueSkeleton label="Loading completion" />
              <ProgressBarSkeleton />
            </>}
          </dd>
        </div>
        <div className="flex flex-col gap-1 border-t border-white/10 py-5 pr-4 @min-[36rem]:border-t-0 @min-[36rem]:border-l @min-[36rem]:px-6">
          <dt className="truncate text-base text-muted-foreground sm:text-sm">Sharing friends</dt>
          <dd className="tabular-nums text-3xl font-semibold tracking-tight">{sharingCount}</dd>
        </div>
        <div className="flex flex-col gap-1 border-t border-l border-white/10 py-5 pl-4 @min-[36rem]:border-t-0 @min-[36rem]:pl-6">
          <dt className="truncate text-base text-muted-foreground sm:text-sm">Mastered</dt>
          <dd className="tabular-nums text-3xl font-semibold tracking-tight">
            {progress ? stats?.mastered ?? 0 : <PageValueSkeleton label="Loading mastered count" />}
          </dd>
        </div>
      </dl>
    </section>
  )
}
