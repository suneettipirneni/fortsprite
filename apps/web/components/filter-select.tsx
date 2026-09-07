"use client"

import type { ComponentProps } from "react"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

export function FilterSelect({
  label,
  placeholder,
  className,
  children,
  ...props
}: ComponentProps<typeof Select> & {
  label: string
  placeholder?: string
  className?: string
}) {
  return (
    <Select {...props}>
      <SelectTrigger
        aria-label={label}
        className={cn("w-full data-[size=default]:h-11", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  )
}
