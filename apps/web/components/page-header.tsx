import type { ReactNode } from "react"

type PageHeaderProps = {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="grid gap-5 border-b border-border pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:pb-8">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 font-mono text-sm uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="max-w-[28ch] text-balance text-3xl font-semibold tracking-tight break-words sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[62ch] text-pretty text-base text-muted-foreground sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}
    </header>
  )
}
