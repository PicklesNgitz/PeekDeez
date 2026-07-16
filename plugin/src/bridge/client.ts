const BASE = 'http://127.0.0.1:8765';

export interface NowPlaying {
  title: string;
  artist: string;
  album: string;
  trackId: string;
  albumId?: string | null;
  artUrl?: string | null;
  durationMs: number;
  positionMs: number;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  source: string;
  timestampMs: number;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  artist: string;
  albumName?: string | null;
  artUrl?: string | null;
}

export interface LyricsResponse {
  artist: string;
  track: string;
  plain?: string | null;
  synced?: string | null;
  albumName?: string | null;
  durationMs?: number | null;
}

export interface HealthResponse {
  ok: boolean;
  deezerInstalled: boolean;
  deezerActive: boolean;
}

export const EMPTY: NowPlaying = {
  title: '', artist: '', album: '', trackId: '', durationMs: -1,
  positionMs: 0, isPlaying: false, shuffle: false, repeat: 'off',
  source: 'deezer', timestampMs: 0,
};

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

export const bridge = {
  health: () => getJson<HealthResponse>('/health'),

  nowPlaying: () => getJson<NowPlaying>('/nowplaying').catch(() => EMPTY),

  nowPlayingStream: (onUpdate: (np: NowPlaying) => void): (() => void) => {
    const es = new EventSource(`${BASE}/nowplaying/stream`);
    es.onmessage = (e) => {
      try { onUpdate(JSON.parse(e.data) as NowPlaying); } catch { /* ignore parse errors */ }
    };
    return () => es.close();
  },

  transport: (action: string, deltaMs?: number) =>
    postJson<Record<string, never>>('/transport', { action, deltaMs }),

  shuffle: (enabled: boolean) =>
    postJson<{ enabled: boolean }>('/shuffle', { enabled }),

  search: (q: string, type: 'track' | 'album' | 'playlist' = 'track') =>
    getJson<SearchResult[]>(`/search?q=${encodeURIComponent(q)}&type=${type}`),

  lyrics: (artist: string, track: string) =>
    getJson<LyricsResponse>(
      `/lyrics?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`
    ).catch(() => null),

  launch: (type: 'track' | 'album' | 'playlist' | 'radio', id: string) =>
    postJson<{ installed: boolean; uri: string }>('/launch', { type, id }),
};
