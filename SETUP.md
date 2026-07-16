# PeekDeez — Setup Guide

Two components must both be running for PeekDeez to work:

- **Helper** — Android app on your phone. Reads Deezer's media session, runs the local HTTP server.
- **Plugin** — Even Hub app on your G2 glasses. Displays now-playing, handles touchpad input.

---

## What you need

- Android phone with Deezer installed
- Even Realities G2 glasses paired to the Even Hub app
- PC with Android Studio (for building the helper APK)
- PC with Node.js 18+ (for building the plugin)
- USB cable (for installing the helper APK)

---

## Part 1 — Build & install the Helper APK

### 1.1 Install Android Studio

Download from https://developer.android.com/studio and install it.

### 1.2 Enable Developer Options on your phone

1. Open **Settings → About phone**
2. Tap **Build number** 7 times until you see "You are now a developer"
3. Go back to **Settings → Developer options**
4. Enable **USB debugging**

### 1.3 Open the helper project

1. Open Android Studio
2. Click **Open** → navigate to the `helper/` folder inside this repo → click OK
3. Wait for Gradle sync to finish (may take a few minutes first time)

### 1.4 Build the APK

1. Plug your phone into your PC via USB
2. Accept the "Allow USB debugging" prompt on your phone
3. In Android Studio, click **Run → Run 'app'** (the green play button)
4. Select your phone from the device list → click OK
5. Android Studio builds and installs the APK directly to your phone

Alternatively, build without running:
- **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- APK lands at `helper/app/build/outputs/apk/debug/app-debug.apk`
- Transfer to phone and tap to install (you may need to allow "Install unknown apps" for your file manager)

### 1.5 Grant permissions on your phone

After installing, open the **PeekDeez** app. It will prompt you through each step:

**A. Notification access (required)**
- Settings → Notification access (or Special app access → Notification access)
- Find **PeekDeez** → toggle ON
- This lets the helper read Deezer's media session

**B. Battery optimization exemption (required to stay alive)**
- Settings → Battery → Battery optimization
- Find **PeekDeez** → select "Don't optimize"
- Without this, Android will kill the helper when your screen is off

**C. Notification permission (Android 13+)**
- The app will prompt you — tap Allow
- This shows the persistent "Bridge active" notification that keeps the service alive

### 1.6 Verify the helper is running

1. Open the **PeekDeez** app — the status screen should show "Bridge active"
2. Open **Deezer** and play any track
3. Switch back to PeekDeez — it should show the current track title and artist

To verify from a PC (optional):
```
adb shell curl http://127.0.0.1:8765/health
```
Should return: `{"ok":true,"deezerInstalled":true,"deezerActive":true}`

---

## Part 2 — Build & sideload the Plugin onto G2

### 2.1 Install Node.js

Download from https://nodejs.org — install the LTS version.

### 2.2 Install plugin dependencies

Open a terminal, navigate to the `plugin/` folder:
```
cd plugin
npm install
```

### 2.3 Build the plugin

```
npm run ship
```

This runs TypeScript type-checking, builds the plugin into `dist/`, then packs it into a `.ehpk` file in the `plugin/` folder.

### 2.4 Sideload onto G2 via Even Hub app

**Method A — Dev server + QR (easiest for testing)**

1. Start the dev server:
   ```
   npm run dev
   ```
2. Open a second terminal in the `plugin/` folder and find your PC's local IP:
   - Windows: run `ipconfig` → look for IPv4 Address (e.g. `192.168.1.50`)
3. Generate a QR code:
   ```
   npx evenhub qr --ip 192.168.1.50 --port 5173 --http
   ```
4. Open the **Even Hub** app on your phone
5. Tap the **+** or **Add app** button → **Scan QR**
6. Scan the QR code in your terminal
7. The plugin loads onto your G2 glasses immediately — no publishing needed

**Method B — Install .ehpk file directly**

After `npm run ship` produces a `.ehpk` file:
1. Transfer the `.ehpk` file to your phone
2. Open the **Even Hub** app → tap **+** → **Install from file**
3. Select the `.ehpk` file

### 2.5 Verify it works on the glasses

1. Make sure the PeekDeez helper app is running on your phone (Part 1)
2. Make sure Deezer is playing a track
3. Put on your G2 — the now-playing screen should appear showing track/artist/album
4. Test controls:
   - **Single tap** → play/pause
   - **Scroll up** → transport menu
   - **Scroll down** → lyrics screen
   - **Double tap** → back to now-playing (from any screen)

---

## Troubleshooting

**"Nothing playing" on glasses but Deezer is running**
- Check PeekDeez has Notification access (Step 1.5A)
- Kill and reopen PeekDeez, then kill and reopen Deezer, then play a track

**Bridge offline / can't reach helper**
- Open PeekDeez app and confirm it shows "Bridge active"
- Make sure battery optimization is disabled for PeekDeez (Step 1.5B)

**Plugin won't load on glasses**
- Make sure phone and PC are on the same Wi-Fi network (Method A)
- Try Method B (.ehpk file) instead

**Lyrics show "No lyrics"**
- lrclib.net coverage is partial — not all tracks have lyrics
- This is expected behaviour

**Transport controls don't work (play/pause/next/etc)**
- Deezer must be the active media session
- Try tapping play/pause in Deezer first, then switching to PeekDeez

---

## Quick reference

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server (plugin) |
| `npm run build` | TypeCheck + build to dist/ |
| `npm run pack` | Pack dist/ into .ehpk |
| `npm run ship` | build + pack in one step |
| `npm run simulate` | Run glasses simulator on PC |
