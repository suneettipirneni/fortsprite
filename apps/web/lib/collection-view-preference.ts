export type CollectionView = "list" | "grid" | "grouped"

export const DEFAULT_COLLECTION_VIEW: CollectionView = "grouped"

const STORAGE_KEY = "fortsprite:collection-view:v1"
const CHANGE_EVENT = "fortsprite:collection-view-change"

let cachedView: CollectionView | undefined

export function isCollectionView(value: unknown): value is CollectionView {
  return value === "list" || value === "grid" || value === "grouped"
}

export function getCollectionViewServerSnapshot(): CollectionView {
  return DEFAULT_COLLECTION_VIEW
}

export function getCollectionViewSnapshot(): CollectionView {
  if (cachedView) return cachedView

  try {
    const storedView = window.localStorage.getItem(STORAGE_KEY)
    cachedView = isCollectionView(storedView)
      ? storedView
      : DEFAULT_COLLECTION_VIEW
  } catch {
    cachedView = DEFAULT_COLLECTION_VIEW
  }

  return cachedView
}

export function subscribeToCollectionView(onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return

    cachedView = isCollectionView(event.newValue)
      ? event.newValue
      : DEFAULT_COLLECTION_VIEW
    onChange()
  }

  window.addEventListener("storage", handleStorage)
  window.addEventListener(CHANGE_EVENT, onChange)

  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

export function saveCollectionView(view: CollectionView) {
  cachedView = view

  try {
    window.localStorage.setItem(STORAGE_KEY, view)
  } catch {
    // Keep the current page interactive when storage is unavailable.
  }

  window.dispatchEvent(new Event(CHANGE_EVENT))
}
