package com.g2bridge.deezer.deezer

import com.g2bridge.deezer.Http
import com.g2bridge.deezer.LyricsResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Request

/** Best-effort lyrics via lrclib.net (free, no key). Returns null when nothing matches. */
object LyricsApi {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }
    private const val BASE = "https://lrclib.net/api"

    suspend fun find(artist: String, track: String): LyricsResponse? = withContext(Dispatchers.IO) {
        val url = "$BASE/search".toHttpUrl().newBuilder()
            .addQueryParameter("artist_name", artist)
            .addQueryParameter("track_name", track)
            .build()
        val body = get(url.toString()) ?: return@withContext null
        val arr = runCatching { json.parseToJsonElement(body).jsonArray }.getOrNull()
            ?: return@withContext null
        val items = arr.mapNotNull { it as? JsonObject }
        val hit = items.firstOrNull { o ->
            o["plainLyrics"]?.jsonPrimitive?.contentOrNull?.isNotEmpty() == true
        } ?: return@withContext null
        LyricsResponse(
            artist = artist,
            track = track,
            plain = hit["plainLyrics"]?.jsonPrimitive?.contentOrNull,
            synced = hit["syncedLyrics"]?.jsonPrimitive?.contentOrNull?.takeIf { it.isNotEmpty() },
            albumName = hit["albumName"]?.jsonPrimitive?.contentOrNull,
            durationMs = hit["duration"]?.jsonPrimitive?.longOrNull?.times(1000)
        )
    }

    private fun get(url: String): String? {
        Http.client.newCall(Request.Builder().url(url).build()).execute().use { resp ->
            if (!resp.isSuccessful) return null
            return resp.body?.string()
        }
    }
}
