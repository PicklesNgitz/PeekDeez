import {
  waitForEvenAppBridge,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import { bridge as api } from './bridge/client'
import { store } from './state'
import { createDisplay } from './glasses/render'
import { initController } from './glasses/controller'
import { initCompanion } from './companion/index'

// Companion UI runs immediately — no SDK dependency.
initCompanion(document.getElementById('app')!)

const sdk = await waitForEvenAppBridge()

const ok = await createDisplay(sdk)
if (!ok) console.warn('createDisplay returned non-zero')

// Start now-playing SSE; fall back to 1-second polling if EventSource fails.
let stopSse: (() => void) | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    try { store.set(await api.nowPlaying()) } catch { /* bridge offline */ }
  }, 1000)
}

function startSse() {
  try {
    stopSse = api.nowPlayingStream((np) => {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
      store.set(np)
    })
  } catch {
    startPolling()
  }
}

startSse()

// Fallback: if no SSE update in 3s, also start polling.
setTimeout(() => {
  if (!store.get().title) startPolling()
}, 3000)

// Initialize the glasses controller (event routing + rendering).
initController(sdk)

// Exit: tear down on double-tap from root level only if controller hasn't consumed it.
// The controller handles DOUBLE_CLICK for screen navigation; root-level exit is handled
// inside the controller via shutDownPageContainer when no other action applies.
sdk.onEvenHubEvent((event) => {
  const sysType = event.sysEvent?.eventType ?? null
  if (
    sysType === OsEventTypeList.SYSTEM_EXIT_EVENT ||
    sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT
  ) {
    stopSse?.()
    if (pollTimer) clearInterval(pollTimer)
  }
})
