"use client"

import { useState, type Ref } from "react"
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
  count: number
}

const groupOrder: CollectionQueryTokenGroup[] = [
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
}: {
  query: string
  onQueryChange: (query: string) => void
  tokens: CollectionQueryToken[]
  options: CollectionQueryToken[]
  onTokensChange: (tokens: CollectionQueryToken[]) => void
  inputRef?: Ref<HTMLInputElement>
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
      onInputValueChange={onQueryChange}
      itemToStringLabel={(token) => token.label}
      itemToStringValue={(token) => token.id}
      isItemEqualToValue={(option, value) => option.id === value.id}
    >
      <ComboboxChips
        ref={anchor}
        className="min-h-12 gap-1.5 border-white/12 bg-background/28 px-2 py-1.5 shadow-sm sm:min-h-10"
      >
        <SearchIcon
          aria-hidden="true"
          className="mx-1 size-4 shrink-0 text-muted-foreground"
        />
        {tokens.map((token) => (
          <ComboboxChip
            key={token.id}
            aria-label={`${token.groupLabel}: ${token.label}`}
            className="h-7 gap-1.5 rounded-md border border-white/8 bg-white/8 px-2 text-sm"
          >
            <span className="text-muted-foreground">{token.groupLabel}</span>
            <span>{token.label}</span>
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          ref={inputRef}
          name="sprite-search"
          aria-label="Search collection"
          placeholder={tokens.length === 0 ? "Search or add filters…" : "Search Sprites…"}
          className="h-8 min-w-40 text-base sm:text-sm"
        />
        {query || tokens.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear collection query"
            onClick={() => {
              onQueryChange("")
              onTokensChange([])
            }}
            className="ml-auto shrink-0"
          >
            <XIcon />
          </Button>
        ) : null}
        <ComboboxTrigger
          aria-label="Add collection filter"
          className="relative flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-white/8 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <FilterIcon aria-hidden="true" />
          <span
            aria-hidden="true"
            className="pointer-fine:hidden absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2"
          />
        </ComboboxTrigger>
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
                      {option.count}
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
