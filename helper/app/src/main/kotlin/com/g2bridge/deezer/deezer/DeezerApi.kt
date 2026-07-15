package com.g2bridge.deezer.deezer

import com.g2bridge.deezer.Http
import com.g2bridge.deezer.SearchResult
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

/** Deezer public API (no auth). Server-side, so no browser CORS. */
object DeezerApi {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }
    private const val BASE = "https://api.deezer.com"

    suspend fun search(q: String, type: String): List<SearchResult> = withContext(Dispatchers.IO) {
        val ep = when (type) {
            "album" -> "$BASE/search/album"
            "playlist" -> "$BASE/search/playlist"
            else -> "$BASE/search"
        }
        val url = ep.toHttpUrl().newBuilder()
            .addQueryParameter("q", q)
            .addQueryParameter("order", "RANKING")
            .addQueryParameter("limit", "30")
            .build()
        val body = get(url.toString()) ?: return@withContext emptyList()
        val data = runCatching {
            json.parseToJsonElement(body).jsonObject["data"]?.jsonArray
        }.getOrNull() ?: return@withContext emptyList()
        val t = type.ifBlank { "track" }
        data.mapNotNull { el -> el.jsonObject }.mapNotNull { o -> mapItem(o, t) }
    }

    private fun mapItem(o: JsonObject, type: String): SearchResult? = when (type) {
        "album" -> SearchResult(
            id = o["id"]?.jsonPrimitive?.longOrNull?.toString() ?: return null,
            type = "album",
            title = o["title"]?.jsonPrimitive?.contentOrNull ?: return null,
            artist = o["artist"]?.jsonObject?.get("name")?.jsonPrimitive?.contentOrNull ?: "",
            artUrl = o["cover_small"]?.jsonPrimitive?.contentOrNull
        )
        "playlist" -> SearchResult(
            id = o["id"]?.jsonPrimitive?.longOrNull?.toString() ?: return null,
            type = "playlist",
            title = o["title"]?.jsonPrimitive?.contentOrNull ?: return null,
            artist = o["user"]?.jsonObject?.get("name")?.jsonPrimitive?.contentOrNull ?: "",
            artUrl = o["picture_small"]?.jsonPrimitive?.contentOrNull
        )
        else -> SearchResult(
            id = o["id"]?.jsonPrimitive?.longOrNull?.toString() ?: return null,
            type = "track",
            title = o["title"]?.jsonPrimitive?.contentOrNull ?: return null,
            artist = o["artist"]?.jsonObject?.get("name")?.jsonPrimitive?.contentOrNull ?: "",
            albumName = o["album"]?.jsonObject?.get("title")?.jsonPrimitive?.contentOrNull,
            artUrl = o["album"]?.jsonObject?.get("cover_small")?.jsonPrimitive?.contentOrNull
        )
    }

    private fun get(url: String): String? {
        Http.client.newCall(Request.Builder().url(url).build()).execute().use { resp ->
            if (!resp.isSuccessful) return null
            return resp.body?.string()
        }
    }
}
