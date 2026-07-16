// Glasses screen content builders. Each returns a plain string (multi-line)
// pushed to the single text container. ~10 visible lines; keep lines <= ~26 chars.
import type { NowPlaying } from '../bridge/client'

const SEP = '────────────────────────'
const ARROW = '▶'          // ▶ highlight marker
const PAUSE = '⏸'          // ⏸
const SHUF = '♪'           // ♪ shuffle

function fmtTime(ms: number): string {
  if (!ms || ms < 0) return '0:00'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

// 20-char ASCII progress bar.
function progressBar(pos: number, dur: number): string {
  const W = 20
  const p = dur > 0 ? Math.min(1, Math.max(0, pos / dur)) : 0
  const filled = Math.round(p * W)
  return `[${'#'.repeat(filled)}${'-'.repeat(W - filled)}] ${fmtTime(pos)}/${fmtTime(dur)}`
}

function trunc(s: string, n: number): string {
  s = s.trim()
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// ---- Now-Playing ------------------------------------------------------
export function nowPlayingContent(np: NowPlaying): string {
  if (!np.title && !np.artist) {
    return [
      'NOW PLAYING',
      SEP,
      '',
      'Nothing playing.',
      'Open Deezer and play a',
      'track to begin.',
      '',
      `${PAUSE} Bridge ↻ tap=play/pause`,
    ].join('\n')
  }
  const shuf = `${SHUF} Shuffle: ${np.shuffle ? 'ON ' : 'OFF'}`
  return [
    'NOW PLAYING',
    SEP,
    trunc(np.title, 26),
    trunc(np.artist, 26),
    trunc(np.album, 26),
    '',
    progressBar(np.positionMs, np.durationMs),
    shuf,
  ].join('\n')
}

// ---- Transport list ----------------------------------------------------
export interface TransportState { highlight: number }

export const TRANSPORT_ROWS = [
  'Play / Pause',
  'Next track',
  'Previous track',
  'Forward 15s',
  'Rewind 15s',
  'Shuffle: toggle',
] as const

export function transportContent(np: NowPlaying, st: TransportState): string {
  const rows = TRANSPORT_ROWS.map((label, i) => {
    const disp = label.startsWith('Shuffle')
      ? `Shuffle: ${np.shuffle ? 'ON ' : 'OFF'}`
      : label
    return `  ${i === st.highlight ? ARROW : ' '} ${disp}`
  }).join('\n')
  // Last row reflects current shuffle state.
  const shufRow = `  ${st.highlight === 5 ? ARROW : ' '} Shuffle: ${np.shuffle ? 'ON ' : 'OFF'}`
  return [
    'TRANSPORT   ⏬ back',
    SEP,
    rows.slice(0, rows.lastIndexOf('\n')), // drop template shuffle row
    shufRow,
  ].join('\n')
}

export function nextHighlight(current: number, dir: -1 | 1): number {
  const max = TRANSPORT_ROWS.length - 1
  let n = current + dir
  if (n < 0) n = max
  if (n > max) n = 0
  return n
}

// ---- Lyrics ------------------------------------------------------------
export interface LyricsState { scroll: number; lines: string[]; artist: string; track: string }

export const LYRICS_SLOTS = 7

export function lyricsContent(st: LyricsState): string {
  if (!st.lines.length) {
    return ['LYRICS   ⏬ back', SEP, '', 'No lyrics for', trunc(`${st.track}`, 24), trunc(`by ${st.artist}`, 24)].join('\n')
  }
  const end = Math.min(st.scroll + LYRICS_SLOTS, st.lines.length)
  const window = st.lines.slice(st.scroll, end).map(l => trunc(l, 26)).join('\n')
  const up = st.scroll > 0 ? '▲ more' : ''
  const down = end < st.lines.length ? '▼ more' : ''
  return ['LYRICS   ⏬ back', SEP, window, up, down].filter(Boolean).join('\n')
}
