import { bridge as api } from '../bridge/client'
import { store } from '../state'
import type { SearchResult } from '../bridge/client'

export function initCompanion(root: HTMLElement) {
  let type: 'track' | 'album' | 'playlist' = 'track'
  let results: SearchResult[] = []
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  root.innerHTML = `
    <div class="c-shell">
      <header class="c-header">
        <span class="c-logo">PeekDeez</span>
        <span class="c-np" id="c-np"></span>
      </header>
      <div class="c-tabs" id="c-tabs">
        <button class="c-tab c-tab--active" data-t="track">Tracks</button>
        <button class="c-tab" data-t="album">Albums</button>
        <button class="c-tab" data-t="playlist">Playlists</button>
      </div>
      <div class="c-search-wrap">
        <input id="c-search" class="c-search" type="search"
               placeholder="Search Deezer…" autocomplete="off" autocorrect="off" />
      </div>
      <div id="c-results" class="c-results">
        <div class="c-placeholder">Search for tracks, albums, or playlists</div>
      </div>
      <div id="c-toast" class="c-toast" aria-live="polite"></div>
    </div>
  `

  const npEl    = root.querySelector<HTMLElement>('#c-np')!
  const searchEl = root.querySelector<HTMLInputElement>('#c-search')!
  const tabsEl   = root.querySelector<HTMLElement>('#c-tabs')!
  const resultsEl = root.querySelector<HTMLElement>('#c-results')!
  const toastEl   = root.querySelector<HTMLElement>('#c-toast')!

  store.subscribe((np) => {
    npEl.textContent = np.title ? `${np.artist} – ${np.title}` : ''
  })

  tabsEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-t]')
    if (!btn) return
    type = btn.dataset.t as typeof type
    tabsEl.querySelectorAll('.c-tab').forEach(t => t.classList.remove('c-tab--active'))
    btn.classList.add('c-tab--active')
    const q = searchEl.value.trim()
    if (q) doSearch(q)
  })

  searchEl.addEventListener('input', () => {
    const q = searchEl.value.trim()
    if (debounceTimer) clearTimeout(debounceTimer)
    if (!q) { renderResults([]); return }
    debounceTimer = setTimeout(() => doSearch(q), 400)
  })

  async function doSearch(q: string) {
    resultsEl.innerHTML = '<div class="c-placeholder">Searching…</div>'
    try {
      results = await api.search(q, type)
      renderResults(results)
    } catch {
      resultsEl.innerHTML = '<div class="c-placeholder">Bridge offline</div>'
    }
  }

  function renderResults(items: SearchResult[]) {
    resultsEl.replaceChildren()
    if (!items.length) {
      const p = document.createElement('div')
      p.className = 'c-placeholder'
      p.textContent = 'No results'
      resultsEl.appendChild(p)
      return
    }
    for (const item of items) {
      const el = document.createElement('div')
      el.className = 'c-item'
      el.setAttribute('role', 'button')
      el.tabIndex = 0

      const titleEl = document.createElement('div')
      titleEl.className = 'c-item-title'
      titleEl.textContent = item.title

      const subEl = document.createElement('div')
      subEl.className = 'c-item-sub'
      subEl.textContent = item.albumName
        ? `${item.artist} · ${item.albumName}`
        : item.artist

      el.appendChild(titleEl)
      el.appendChild(subEl)
      el.addEventListener('click', () => launchItem(item))
      resultsEl.appendChild(el)
    }
  }

  async function launchItem(item: SearchResult) {
    showToast('Launching…')
    try {
      const res = await api.launch(item.type as 'track' | 'album' | 'playlist' | 'radio', item.id)
      if (!res.installed) {
        showToast('Deezer not found — is it installed?')
      } else {
        showToast(`Playing: ${item.title}`)
      }
    } catch {
      showToast('Failed — bridge offline?')
    }
  }

  function showToast(msg: string) {
    toastEl.textContent = msg
    toastEl.classList.add('c-toast--show')
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => toastEl.classList.remove('c-toast--show'), 2500)
  }
}
