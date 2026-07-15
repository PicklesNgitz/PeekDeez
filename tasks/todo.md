# G2 → Deezer Controller — todo

Plan: `C:\Users\Badwolf\.claude\plans\unified-churning-thunder.md`

## Phase 1 — MVP

### Android helper (`helper/`, Kotlin) — WRITTEN, NOT YET BUILT/TESTED
- [x] Gradle skeleton (settings/build/gradle.properties) — *gradle/wrapper/gradle-wrapper.properties BLOCKED on Write classifier (Android Studio regenerates on first sync)*
- [x] Manifest (INTERNET, foreground service, NotificationListenerService)
- [x] `DeezerListenerService` — NotificationListener → MediaSessionManager.getActiveSessions → DeezerController
- [x] `DeezerController` — playPause/next/previous/seekDelta/getNowPlaying(set)+setShuffle, callbacks→registry
- [x] `MediaControllerRegistry` — process holder + SharedFlow for SSE
- [x] `LocalApiServer` (Ktor CIO :8765, CORS anyHost, JSON) — /health /nowplaying(+SSE/stream) /transport /shuffle /search /lyrics /launch
- [x] `DeezerApi` (OkHttp) — /search(+album/playlist), public, no auth
- [x] `LyricsApi` (OkHttp) — lrclib search → plain (+ optional synced)
- [x] `DeezerLauncher` — deezer://<type>/<id> intent w/ installed flag
- [x] `BridgeService` — foreground service hosting server
- [x] `MainActivity` — setup buttons (notif perm, notification access, battery opt, start bridge)
- [ ] BUILD (Android Studio sync → assembleDebug) + sideload
- [ ] VERIFY: `adb shell curl http://127.0.0.1:8765/nowplaying`; transport next; shuffle; launch {track,id}

### G2 plugin (`plugin/`, Vite+TS+even-toolkit)
- [ ] Scaffold from `evenhub-templates/minimal` (degit), `npm i even-toolkit`
- [ ] READ installed `@evenrealities/even_hub_sdk` types + template files + even-toolkit exports (do not guess the display API)
- [ ] `app.json` — `network` whitelist `["http://127.0.0.1:8765"]`; no mic perms
- [ ] `src/bridge/client.ts` — typed fetch wrapper (protocol below) + SSE/poll
- [ ] `src/glasses/screens/nowplaying.ts` — title/artist/album + progress + shuffle/playing state
- [ ] `src/glasses/screens/transport.ts` — list [Play/Pause][Next][Previous][+15s][-15s][Shuffle: On|Off]
- [ ] `src/glasses/screens/lyrics.ts` — paginated plain lyrics / "Lyrics unavailable"
- [ ] `src/glasses/controller.ts` — touchpad event → active screen action map; subscribe now-playing
- [ ] `src/companion/screens/search.tsx` + `browse.tsx` — Deezer search/browse (even-toolkit)
- [ ] VERIFY: `npm run dev` + `evenhub-simulator http://localhost:5173`; now-playing renders; click=play/pause; double-click→transport; rows drive real Deezer; companion pick launches deezer://; helper down → "Bridge offline"

### Spikes (run before screen polish — may block)
- [ ] Spike Risk 1: minimal plugin `fetch http://127.0.0.1:8765` from simulator (cleartext/localhost allowed?). Fallback LAN IP → self-signed HTTPS.
- [ ] Spike Risk 2: helper PoC proves Deezer's MediaSession honors external play/pause/next/seek/shuffle. Hide any unsupported transport row.

### REST protocol (helper ↔ plugin)
```
GET  /nowplaying          → {title,artist,album,trackId,artUrl,durationMs,positionMs,isPlaying,shuffle,repeat}
GET  /nowplaying/stream   → text/event-stream
POST /transport           {action:play|pause|playPause|next|previous|seekDelta, deltaMs?:120000}
POST /shuffle             {enabled:bool}
GET  /search?q=&type=track|album|playlist → [{id,title,artist,albumName?,artUrl}]
GET  /lyrics?artist=&track= → {plain?,synced?}   (404 if none)
POST /launch              {type:track|album|playlist|radio, id}
```

## Out of scope (Phase 2)
- Voice/STT/Soniox, Deezer OAuth + personal playlists, synced LRC karaoke, volume.
