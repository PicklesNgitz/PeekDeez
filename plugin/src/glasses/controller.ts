import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'
import { bridge as api } from '../bridge/client'
import { store } from '../state'
import { renderText } from './render'
import {
  nowPlayingContent, transportContent, lyricsContent,
  nextHighlight,
  type TransportState, type LyricsState,
} from './screens'

type Screen = 'nowplaying' | 'transport' | 'lyrics'

let sdk: EvenAppBridge
let screen: Screen = 'nowplaying'
let transport: TransportState = { highlight: 0 }
let lyrics: LyricsState = { scroll: 0, lines: [], artist: '', track: '' }

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

// ---- lyrics loader ---------------------------------------------------------

async function loadLyrics() {
  const np = store.get()
  if (!np.artist && !np.title) return
  if (lyrics.artist === np.artist && lyrics.track === np.title) return
  lyrics = { scroll: 0, lines: [], artist: np.artist, track: np.title }
  const res = await api.lyrics(np.artist, np.title)
  const text = res?.plain ?? null
  lyrics = {
    scroll: 0,
    artist: np.artist,
    track: np.title,
    lines: text ? text.split('\n') : [],
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
  const sys = sysType
  const txt = textType

  if (screen === 'nowplaying') {
    if (sys === OsEventTypeList.CLICK_EVENT) {
      api.transport('playPause')
    } else if (sys === OsEventTypeList.DOUBLE_CLICK_EVENT || txt === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      screen = 'transport'
      render()
    } else if (txt === OsEventTypeList.SCROLL_TOP_EVENT) {
      screen = 'lyrics'
      loadLyrics()
      render()
    }
    // SCROLL_BOTTOM from nowplaying: no-op per plan
  } else if (screen === 'transport') {
    if (sys === OsEventTypeList.CLICK_EVENT) {
      activateTransportRow()
    } else if (sys === OsEventTypeList.DOUBLE_CLICK_EVENT || txt === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      screen = 'nowplaying'
      render()
    } else if (txt === OsEventTypeList.SCROLL_TOP_EVENT) {
      transport = { highlight: nextHighlight(transport.highlight, -1) }
      render()
    } else if (txt === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      transport = { highlight: nextHighlight(transport.highlight, 1) }
      render()
    }
  } else {
    // lyrics
    if (sys === OsEventTypeList.DOUBLE_CLICK_EVENT || txt === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      screen = 'nowplaying'
      render()
    } else if (txt === OsEventTypeList.SCROLL_TOP_EVENT) {
      if (lyrics.scroll > 0) {
        lyrics = { ...lyrics, scroll: lyrics.scroll - 1 }
        render()
      }
    } else if (txt === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      if (lyrics.scroll + 1 < lyrics.lines.length) {
        lyrics = { ...lyrics, scroll: lyrics.scroll + 1 }
        render()
      }
    }
  }
}

// ---- init ------------------------------------------------------------------

export function initController(bridge: EvenAppBridge) {
  sdk = bridge

  // Re-render on now-playing change.
  store.subscribe(() => render())

  // Reload lyrics when track changes.
  store.subscribe((np) => {
    if (np.artist !== lyrics.artist || np.title !== lyrics.track) {
      lyrics = { scroll: 0, lines: [], artist: np.artist, track: np.title }
    }
  })

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
