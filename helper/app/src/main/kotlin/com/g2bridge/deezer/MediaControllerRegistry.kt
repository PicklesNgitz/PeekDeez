package com.g2bridge.deezer

import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow

/**
 * Process-wide holder of the active Deezer now-playing state.
 * The [DeezerListenerService] (a NotificationListenerService) populates this via
 * [DeezerController]; the local HTTP server ([com.g2bridge.deezer.server.LocalApiServer])
 * reads it and streams updates (SSE) to the G2 plugin.
 */
object MediaControllerRegistry {

    @Volatile
    var nowPlaying: NowPlaying? = null
        private set

    /** Streaming updates the plugin can attach to over `/nowplaying/stream`. */
    val updates: MutableSharedFlow<NowPlaying?> =
        MutableSharedFlow(
            replay = 1,
            extraBufferCapacity = 32,
            onBufferOverflow = BufferOverflow.DROP_OLDEST
        )

    fun emit(np: NowPlaying?) {
        nowPlaying = np
        updates.tryEmit(np)
    }
}
