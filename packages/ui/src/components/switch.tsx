"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex h-11 shrink-0 items-center justify-center rounded-full transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 data-[size=default]:w-14 data-[size=sm]:w-12 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      {/* The button owns the full hit area; the smaller track stays inside it. */}
      <span
        data-slot="switch-track"
        aria-hidden="true"
        className="pointer-events-none inline-flex items-center rounded-full border border-transparent bg-input transition-colors dark:group-data-[state=unchecked]/switch:bg-input/80 group-data-[size=default]/switch:h-[18.4px] group-data-[size=default]/switch:w-8 group-data-[size=sm]/switch:h-[14px] group-data-[size=sm]/switch:w-6 group-data-[state=checked]/switch:bg-primary"
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className="pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-[state=checked]:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-[state=checked]:translate-x-[calc(100%-2px)] dark:data-[state=checked]:bg-primary-foreground group-data-[size=default]/switch:data-[state=unchecked]:translate-x-0 group-data-[size=sm]/switch:data-[state=unchecked]:translate-x-0 dark:data-[state=unchecked]:bg-foreground"
        />
      </span>
    </SwitchPrimitive.Root>
  )
}

export { Switch }
