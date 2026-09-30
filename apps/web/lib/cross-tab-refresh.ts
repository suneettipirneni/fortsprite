export const dataChangeChannel = "fortsprite-data-changed"

let tabId: string | undefined

export function currentTabId() {
  return tabId ??= crypto.randomUUID()
}

export function notifyOtherTabs() {
  if (typeof BroadcastChannel === "undefined") return
  const channel = new BroadcastChannel(dataChangeChannel)
  channel.postMessage(currentTabId())
  channel.close()
}
