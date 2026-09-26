"use client"

import { useState, type ReactNode, type Ref } from "react"
import {
  FilterIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox"

export type CollectionQueryTokenGroup =
  | "season"
  | "capture"
  | "mastery"
  | "variant"
  | "rarity"

export type CollectionQueryToken = {
  id: string
  group: CollectionQueryTokenGroup
  groupLabel: string
  label: string
  value: string
  count: number | null
}

const groupOrder: CollectionQueryTokenGroup[] = [
  "season",
  "capture",
  "mastery",
  "variant",
  "rarity",
]

export function CollectionQueryBar({
  query,
  onQueryChange,
  tokens,
  options,
  onTokensChange,
  inputRef,
  renderCount,
}: {
  query: string
  onQueryChange: (query: string) => void
  tokens: CollectionQueryToken[]
  options: CollectionQueryToken[]
  onTokensChange: (tokens: CollectionQueryToken[]) => void
  inputRef?: Ref<HTMLInputElement>
  renderCount?: (option: CollectionQueryToken) => ReactNode
}) {
  const anchor = useComboboxAnchor()
  const [open, setOpen] = useState(false)

  function normalizeTokens(nextTokens: CollectionQueryToken[]) {
    const added = nextTokens.find(
      (token) => !tokens.some((current) => current.id === token.id),
    )
    if (!added || (added.group !== "capture" && added.group !== "mastery")) {
      onTokensChange(nextTokens)
      return
    }

    onTokensChange(
      nextTokens.filter(
        (token) => token.group !== added.group || token.id === added.id,
      ),
    )
  }

  return (
    <Combobox
      items={options}
      multiple
      open={open}
      openOnInputClick={false}
      onOpenChange={(nextOpen, details) => {
        if (nextOpen && details.reason === "input-change" && !open) return
        setOpen(nextOpen)
      }}
      value={tokens}
      onValueChange={normalizeTokens}
      inputValue={query}
      onInputValueChange={(value, details) => {
        if (details.reason === "input-clear") {
          details.cancel()
          return
        }
        onQueryChange(value)
        if (details.reason === "input-change") setOpen(false)
      }}
      itemToStringLabel={(token) => token.label}
      itemToStringValue={(token) => token.id}
      isItemEqualToValue={(option, value) => option.id === value.id}
    >
      <ComboboxChips
        ref={anchor}
        className="grid min-h-(--control-height) grid-cols-[auto_minmax(0,1fr)_auto] gap-1 border-white/12 bg-background/28 px-1 py-0 shadow-sm"
      >
        <SearchIcon
          aria-hidden="true"
          className="mx-1 size-4 shrink-0 text-muted-foreground"
        />
        <div className="flex min-w-0 flex-wrap items-center gap-1 py-0.5">
          {tokens.map((token) => (
            <ComboboxChip
              key={token.id}
              aria-label={`${token.groupLabel}: ${token.label}`}
              className="h-7 max-w-full gap-1.5 rounded-md border border-white/8 bg-white/8 px-2 text-sm"
            >
              <span className="hidden text-muted-foreground sm:inline">{token.groupLabel}</span>
              <span className="truncate">{token.label}</span>
            </ComboboxChip>
          ))}
          <ComboboxChipsInput
            ref={inputRef}
            name="sprite-search"
            aria-label="Search collection"
            placeholder={tokens.length === 0 ? "Search or add filters…" : "Search Sprites…"}
            className="h-7 min-w-0 basis-20 text-base sm:text-sm"
          />
        </div>
        <div className="flex shrink-0 self-start">
          {query || tokens.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Clear collection query"
              onClick={() => {
                onQueryChange("")
                onTokensChange([])
              }}
              className="relative h-[calc(var(--control-height)-2px)] rounded-md"
            >
              <XIcon />
              <span aria-hidden="true" className="pointer-fine:hidden absolute -inset-y-px inset-x-0" />
            </Button>
          ) : null}
          <ComboboxTrigger
            aria-label="Add collection filter"
            className="relative flex h-[calc(var(--control-height)-2px)] w-(--control-height) shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-white/8 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <FilterIcon aria-hidden="true" />
            <span aria-hidden="true" className="pointer-fine:hidden absolute -inset-y-px inset-x-0" />
          </ComboboxTrigger>
        </div>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} align="start" className="w-(--anchor-width)">
        <ComboboxEmpty>
          No filter tokens match. Keep typing to search the collection.
        </ComboboxEmpty>
        <ComboboxList>
          {groupOrder.map((group) => {
            const groupOptions = options.filter((option) => option.group === group)
            if (groupOptions.length === 0) return null

            return (
              <ComboboxGroup key={group}>
                <ComboboxLabel>{groupOptions[0]!.groupLabel}</ComboboxLabel>
                {groupOptions.map((option) => (
                  <ComboboxItem key={option.id} value={option}>
                    <span>{option.label}</span>
                    <span className="ml-auto pr-6 text-sm tabular-nums text-muted-foreground">
                      {renderCount ? renderCount(option) : option.count}
                    </span>
                  </ComboboxItem>
                ))}
              </ComboboxGroup>
            )
          })}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
