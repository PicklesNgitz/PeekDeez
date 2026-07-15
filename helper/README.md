# G2 ↔ Deezer Bridge (Android helper)

Native Android app that the Even Realities G2 plugin talks to over local HTTP.
It reads Deezer's now-playing metadata + transport state via Android's
MediaSession, sends transport commands (play/pause/next/prev/seek), toggles
shuffle, launches a track/album/playlist/radio in the Deezer app, searches the
Deezer public API, and fetches lyrics from lrclib.

It exists because the Even Hub SDK plugins run in a WebView and expose **no**
media-session / now-playing / intents APIs.

## Build
Open `helper/` in **Android Studio** (Koala+), let it generate the Gradle
wrapper, sync, then `Build → Build APK` *or* `./gradlew assembleDebug`.

Requirements: Android Studio with AGP 8.7, Kotlin 2.0.21, JDK 17. min SDK 26
(Android 8.0), target SDK 33.

## Install & enable (one time)
1. Sideload the debug APK onto the phone.
2. App → **Enable notification access** button → toggle on the *G2 Deezer Bridge*
   listener. (Required: the app finds Deezer's MediaSession via
   `MediaSessionManager.getActiveSessions(listenerComponent)`.)
3. Allow **Ignore battery optimization** for the app (keeps the foreground service
   alive while you use the Deezer app).
4. Grant **Post notifications** (Android 13+) so the foreground-service notification
   can show.
5. Make sure the **Deezer** app (`com.deezer.android`) is installed and logged in.

## Run check / verify (Risk 2 spike)
```bash
adb shell curl http://127.0.0.1:8765/health
# play a track in Deezer, then:
adb shell curl http://127.0.0.1:8765/nowplaying
adb shell curl -X POST http://127.0.0.1:8765/transport  -H 'Content-Type: application/json' -d '{"action":"next"}'
adb shell curl -X POST http://127.0.0.1:8765/shuffle   -H 'Content-Type: application/json' -d '{"enabled":true}'
adb shell curl -X POST http://127.0.0.1:8765/launch    -H 'Content-Type: application/json' -d '{"type":"track","id":"3154743"}'
```
If any transport row does nothing in the Deezer app, that control is unsupported
by Deezer's MediaSession — the G2 plugin hides that row.

## REST API
```
GET  /health
GET  /nowplaying            -> NowPlaying JSON (idle fields blank when no Deezer session)
GET  /nowplaying/stream     -> text/event-stream of NowPlaying on every change
POST /transport             {action:"play|pause|playPause|next|previous|seekDelta", deltaMs?:120000}
POST /shuffle               {enabled:bool}
GET  /search?q=&type=track|album|playlist  -> [{id,title,artist,albumName?,artUrl?}]
GET  /lyrics?artist=&track=  -> {artist,track,plain?,synced?,albumName?,durationMs?}   (404 if none)
POST /launch                {type:"track|album|playlist|radio", id}
```
CORS: `Access-Control-Allow-Origin` reflects the request Origin (any host) so the
Even Hub WebView can call it.
