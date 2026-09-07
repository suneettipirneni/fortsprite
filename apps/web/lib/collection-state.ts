import type { CollectionState } from "@workspace/contracts"

export type CollectionChange = {
  field: "owned" | "mastered"
  checked: boolean
}

export function updateCollectionState(
  state: CollectionState,
  change: CollectionChange,
): CollectionState {
  if (change.field === "owned") {
    return change.checked
      ? { owned: true, mastered: state.mastered }
      : { owned: false, mastered: false }
  }
  return state.owned
    ? { owned: true, mastered: change.checked }
    : { owned: false, mastered: false }
}
