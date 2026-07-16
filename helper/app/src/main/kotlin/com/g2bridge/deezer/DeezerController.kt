package com.g2bridge.deezer

import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.PlaybackState
import android.os.SystemClock

object DeezerController {
    private const val DEEZER_PKG = "deezer.android.app"

    @Volatile private var current: MediaController? = null
    private var callback: MediaController.Callback? = null
    private val lock = Any()

    fun onSessionsChanged(controllers: List<MediaController>) {
        val deezer = controllers.firstOrNull { it.packageName == DEEZER_PKG }
        synchronized(lock) {
            if (deezer != null && deezer.sessionToken == current?.sessionToken) {
                recomputeAndEmit(); return
            }
            callback?.let { current?.unregisterCallback(it) }
            current = deezer
            if (deezer != null) {
                val cb = createCallback()
                callback = cb
                deezer.registerCallback(cb)
            } else {
                callback = null
            }
        }
        recomputeAndEmit()
    }

    private fun createCallback() = object : MediaController.Callback() {
        override fun onMetadataChanged(metadata: MediaMetadata?) { recomputeAndEmit() }
        override fun onPlaybackStateChanged(state: PlaybackState?) { recomputeAndEmit() }
        override fun onSessionDestroyed() {
            synchronized(lock) {
                callback?.let { current?.unregisterCallback(it) }
                current = null; callback = null
            }
            MediaControllerRegistry.emit(null)
        }
    }

    @Synchronized
    private fun recomputeAndEmit() {
        val c = current ?: run { MediaControllerRegistry.emit(null); return }
        MediaControllerRegistry.emit(buildNowPlaying(c))
    }

    fun buildNowPlaying(c: MediaController): NowPlaying {
        val state = c.playbackState
        val md = c.metadata
        val isPlaying = state?.state == PlaybackState.STATE_PLAYING
        // android.media.session.MediaController has no shuffleMode/repeatMode property.
        // Read from PlaybackState extras if Deezer sets them; default to false/off.
        val extras = state?.extras
        val shuffleMode = extras?.getInt("android.media.extra.SHUFFLE_MODE", 0) ?: 0
        val repeatMode  = extras?.getInt("android.media.extra.REPEAT_MODE",  0) ?: 0
        return NowPlaying(
            title     = md?.getString(MediaMetadata.METADATA_KEY_TITLE).orEmpty(),
            artist    = md?.getString(MediaMetadata.METADATA_KEY_ARTIST).orEmpty(),
            album     = md?.getString(MediaMetadata.METADATA_KEY_ALBUM).orEmpty(),
            trackId   = md?.getString(MediaMetadata.METADATA_KEY_MEDIA_ID).orEmpty(),
            artUrl    = md?.getString(MediaMetadata.METADATA_KEY_ART_URI),
            durationMs = md?.getLong(MediaMetadata.METADATA_KEY_DURATION) ?: -1L,
            positionMs = computePosition(state),
            isPlaying  = isPlaying,
            shuffle    = shuffleMode != 0,
            repeat     = repeatStr(repeatMode),
            timestampMs = System.currentTimeMillis()
        )
    }

    fun computePosition(state: PlaybackState?): Long {
        if (state == null) return 0L
        return if (state.state == PlaybackState.STATE_PLAYING)
            (state.position + (SystemClock.elapsedRealtime() - state.lastPositionUpdateTime)).coerceAtLeast(0)
        else state.position
    }

    private fun repeatStr(mode: Int) = when (mode) {
        1    -> "one"
        2, 3 -> "all"
        else -> "off"
    }

    private fun controls() = current?.transportControls
    val isActive get() = current != null

    fun play()     = controls()?.play()
    fun pause()    = controls()?.pause()
    fun next()     = controls()?.skipToNext()
    fun previous() = controls()?.skipToPrevious()

    fun playPause() {
        val c = current ?: return
        if (c.playbackState?.state == PlaybackState.STATE_PLAYING) c.transportControls.pause()
        else c.transportControls.play()
    }

    fun seekDelta(deltaMs: Long) {
        val c   = current ?: return
        val dur = c.metadata?.getLong(MediaMetadata.METADATA_KEY_DURATION) ?: -1L
        var to  = (computePosition(c.playbackState) + deltaMs).coerceAtLeast(0)
        if (dur > 0) to = to.coerceAtMost(dur)
        c.transportControls.seekTo(to)
        recomputeAndEmit()
    }

    fun setShuffle(enabled: Boolean) {
        // TransportControls.setShuffleMode is not on the framework API.
        // Send a custom action that Deezer may honour; best-effort only.
        val mode = if (enabled) 1 else 0
        controls()?.sendCustomAction("android.media.action.SET_SHUFFLE_MODE",
            android.os.Bundle().apply { putInt("android.media.extra.SHUFFLE_MODE", mode) })
        recomputeAndEmit()
    }
}
