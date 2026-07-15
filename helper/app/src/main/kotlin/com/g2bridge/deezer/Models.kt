package com.g2bridge.deezer

import kotlinx.serialization.Serializable

/** Now-playing snapshot pushed to the G2 plugin and rendered on the glasses. */
@Serializable
data class NowPlaying(
    val title: String = "",
    val artist: String = "",
    val album: String = "",
    val trackId: String = "",
    val albumId: String? = null,
    val artUrl: String? = null,
    val durationMs: Long = -1L,
    val positionMs: Long = 0L,
    val isPlaying: Boolean = false,
    val shuffle: Boolean = false,
    val repeat: String = "off",
    val source: String = "deezer",
    val timestampMs: Long = 0L
)

@Serializable
data class TransportRequest(
    val action: String,            // play | pause | playPause | next | previous | seekDelta
    val deltaMs: Long? = null      // used by seekDelta (can be negative)
)

@Serializable
data class ShuffleRequest(val enabled: Boolean)

@Serializable
data class LaunchRequest(val type: String, val id: String)   // type: track|album|playlist|radio

@Serializable
data class LaunchResponse(val installed: Boolean, val uri: String)

@Serializable
data class LyricsResponse(
    val artist: String,
    val track: String,
    val plain: String? = null,
    val synced: String? = null,
    val albumName: String? = null,
    val durationMs: Long? = null
)

@Serializable
data class SearchResult(
    val id: String,
    val type: String,
    val title: String,
    val artist: String = "",
    val albumName: String? = null,
    val artUrl: String? = null
)

@Serializable
data class ErrorResponse(val error: String)

@Serializable
data class HealthResponse(
    val ok: Boolean = true,
    val deezerInstalled: Boolean = false,
    val deezerActive: Boolean = false
)
