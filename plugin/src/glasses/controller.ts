import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'
import { bridge as api } from '../bridge/client'
import { store } from '../state'
import { renderText } from './render'
import {
  nowPlayingContent, transportContent, lyricsContent,
  nextHighlight, LYRICS_SLOTS,
  type TransportState, type LyricsState,
} from './screens'

type Screen = 'nowplaying' | 'transport' | 'lyrics'

let sdk: EvenAppBridge
let screen: Screen = 'nowplaying'
let transport: TransportState = { highlight: 0 }
let lyrics: LyricsState = {
  scroll: 0, lines: [], artist: '', track: '',
  syncedMs: null, manualScroll: false,
}

// ---- LRC parser ------------------------------------------------------------

function parseLrc(lrc: string): { lines: string[]; syncedMs: number[] } {
  const entries: Array<{ ms: number; text: string }> = []
  for (const raw of lrc.split('\n')) {
    const m = raw.match(/^\[(\d+):(\d{2})\.(\d+)\](.*)/)
    if (!m) continue
    const ms = (parseInt(m[1]) * 60 + parseInt(m[2])) * 1000 + Math.round(parseInt(m[3]) * 10)
    entries.push({ ms, text: m[4].trim() })
  }
  return {
    lines: entries.map(e => e.text),
    syncedMs: entries.map(e => e.ms),
  }
}

// Returns index of the current line for positionMs (binary search).
function currentLineIndex(syncedMs: number[], positionMs: number): number {
  let lo = 0, hi = syncedMs.length - 1, result = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (syncedMs[mid] <= positionMs) { result = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  return result
}

// ---- render ----------------------------------------------------------------

function render() {
  const np = store.get()
  let content: string
  if (screen === 'nowplaying') {
    content = nowPlayingContent(np)
  } else if (screen === 'transport') {
    content = transportContent(np, transport)
  } else {
    content = lyricsContent(lyrics)
  }
  renderText(sdk, content)
}

// ---- auto-scroll -----------------------------------------------------------

function autoScroll() {
  if (screen !== 'lyrics') return
  if (!lyrics.syncedMs || lyrics.manualScroll) return
  const np = store.get()
  if (!np.isPlaying) return
  // Interpolate position: positionMs was accurate at timestampMs, advance by elapsed.
  const elapsed = np.timestampMs > 0 ? Date.now() - np.timestampMs : 0
  const pos = np.positionMs + elapsed
  const idx = currentLineIndex(lyrics.syncedMs, pos)
  const target = Math.max(0, idx - Math.floor(LYRICS_SLOTS / 2))
  if (target !== lyrics.scroll) {
    lyrics = { ...lyrics, scroll: target }
    render()
  }
}

// ---- lyrics loader ---------------------------------------------------------

async function loadLyrics() {
  const np = store.get()
  if (!np.artist && !np.title) return
  if (lyrics.artist === np.artist && lyrics.track === np.title && lyrics.lines.length > 0) return
  lyrics = { scroll: 0, lines: ['Loading...'], artist: np.artist, track: np.title, syncedMs: null, manualScroll: false }
  if (screen === 'lyrics') render()
  const res = await api.lyrics(np.artist, np.title)
  if (res?.synced) {
    const parsed = parseLrc(res.synced)
    lyrics = { scroll: 0, artist: np.artist, track: np.title, syncedMs: parsed.syncedMs, manualScroll: false, lines: parsed.lines.filter(l => l) }
  } else {
    const text = res?.plain ?? null
    lyrics = { scroll: 0, artist: np.artist, track: np.title, syncedMs: null, manualScroll: false, lines: text ? text.split('\n').filter(l => l.trim()) : [] }
  }
  if (screen === 'lyrics') render()
}

// ---- transport row actions -------------------------------------------------

function activateTransportRow() {
  const np = store.get()
  switch (transport.highlight) {
    case 0: api.transport('playPause'); break
    case 1: api.transport('next'); break
    case 2: api.transport('previous'); break
    case 3: api.transport('seekDelta', 15_000); break
    case 4: api.transport('seekDelta', -15_000); break
    case 5: api.shuffle(!np.shuffle); break
  }
}

// ---- event handler ---------------------------------------------------------

function handleEvent(sysType: OsEventTypeList | null, textType: OsEventTypeList | null) {
  if (screen === 'nowplaying') {
    if (sysType === OsEventTypeList.CLICK_EVENT) {
      api.transport('playPause')
    } else if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT || textType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      screen = 'transport'
      render()
    } else if (textType === OsEventTypeList.SCROLL_TOP_EVENT) {
      screen = 'lyrics'
      loadLyrics()
      render()
    }
  } else if (screen === 'transport') {
    if (sysType === OsEventTypeList.CLICK_EVENT) {
      activateTransportRow()
    } else if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT || textType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      screen = 'nowplaying'
      render()
    } else if (textType === OsEventTypeList.SCROLL_TOP_EVENT) {
      transport = { highlight: nextHighlight(transport.highlight, -1) }
      render()
    } else if (textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      transport = { highlight: nextHighlight(transport.highlight, 1) }
      render()
    }
  } else {
    // lyrics
    if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT || textType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      screen = 'nowplaying'
      render()
    } else if (textType === OsEventTypeList.SCROLL_TOP_EVENT) {
      if (lyrics.scroll > 0) {
        lyrics = { ...lyrics, scroll: lyrics.scroll - 1, manualScroll: true }
        render()
      }
    } else if (textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      if (lyrics.scroll + 1 < lyrics.lines.length) {
        lyrics = { ...lyrics, scroll: lyrics.scroll + 1, manualScroll: true }
        render()
      }
    }
  }
}

// ---- init ------------------------------------------------------------------

export function initController(bridge: EvenAppBridge) {
  sdk = bridge

  store.subscribe((np) => {
    // Reset lyrics state on track change.
    if (np.artist !== lyrics.artist || np.title !== lyrics.track) {
      lyrics = { scroll: 0, lines: [], artist: np.artist, track: np.title, syncedMs: null, manualScroll: false }
    }
    render()
  })

  // Auto-scroll timer: runs every 500ms, interpolates position independently of SSE.
  setInterval(() => autoScroll(), 500)

  bridge.onEvenHubEvent((event) => {
    const sysType = event.sysEvent
      ? (event.sysEvent.eventType ?? OsEventTypeList.CLICK_EVENT)
      : null
    const textType = event.textEvent?.eventType ?? null

    if (
      sysType === OsEventTypeList.SYSTEM_EXIT_EVENT ||
      sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT
    ) return

    handleEvent(sysType, textType)
  })
}
