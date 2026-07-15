// Shared now-playing state. The helper streams (or we poll) updates;
// subscribers (glasses controller) re-render on change.
import type { NowPlaying } from './bridge/client'
import { EMPTY } from './bridge/client'

type Listener = (np: NowPlaying) => void

let current: NowPlaying = EMPTY
const listeners = new Set<Listener>()

export const store = {
  get(): NowPlaying { return current },
  set(np: NowPlaying) {
    // Skip no-op updates (same track, position抖eking within 500ms).
    if (
      np.trackId === current.trackId &&
      np.isPlaying === current.isPlaying &&
      np.shuffle === current.shuffle &&
      np.album === current.album &&
      Math.abs((np.positionMs ?? 0) - (current.positionMs ?? 0)) < 800
    ) return
    current = np
    for (const l of listeners) l(current)
  },
  subscribe(l: Listener) { listeners.add(l); l(current); return () => { listeners.delete(l) } },
}
