import { Spinner } from "@workspace/ui/components/spinner"

export function ContentLoading({
  label = "Loading FortSprite…",
}: {
  label?: string
}) {
  return (
    <div
      role="status"
      className="flex min-h-32 items-center justify-center gap-3 text-sm text-muted-foreground"
    >
      <Spinner
        aria-hidden="true"
        className="size-5 motion-reduce:animate-none"
      />
      <span>{label}</span>
    </div>
  )
}
