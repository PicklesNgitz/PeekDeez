package com.g2bridge.deezer.server

import android.content.Context
import com.g2bridge.deezer.DeezerController
import com.g2bridge.deezer.DeezerLauncher
import com.g2bridge.deezer.ErrorResponse
import com.g2bridge.deezer.HealthResponse
import com.g2bridge.deezer.LaunchRequest
import com.g2bridge.deezer.LaunchResponse
import com.g2bridge.deezer.MediaControllerRegistry
import com.g2bridge.deezer.NowPlaying
import com.g2bridge.deezer.ShuffleRequest
import com.g2bridge.deezer.TransportRequest
import com.g2bridge.deezer.deezer.DeezerApi
import com.g2bridge.deezer.deezer.LyricsApi
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCallPipeline
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.cio.CIO
import io.ktor.server.engine.ApplicationEngine
import io.ktor.server.engine.embeddedServer
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.CORS
import io.ktor.server.request.header
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.response.respondTextWriter
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.onEach
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

object LocalApiServer {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Volatile var appContext: Context? = null

    @Volatile private var engine: ApplicationEngine? = null

    fun start(port: Int) {
        if (engine != null) return
        engine = embeddedServer(CIO, port = port, host = "127.0.0.1") { module() }.also { it.start(wait = false) }
    }

    fun stop() {
        engine?.stop(1000, 2000); engine = null
    }

    private val ALLOWED_HOSTS = setOf("127.0.0.1:8765", "localhost:8765")

    private fun Application.module() {
        // Defeat DNS rebinding: reject any request whose Host header isn't the
        // loopback address. A rebinding attack sends Host: attacker.com — this
        // rejects it before any route runs. Combined with binding to 127.0.0.1,
        // this makes anyHost() CORS safe: external callers can't reach the port
        // and rebound callers are rejected here.
        intercept(ApplicationCallPipeline.Plugins) {
            val host = call.request.header(HttpHeaders.Host) ?: ""
            if (host !in ALLOWED_HOSTS) {
                call.respond(HttpStatusCode.Forbidden)
                finish()
            }
        }
        install(CORS) {
            anyHost() // Origin varies (file:// → null, dev server → LAN IP); Host check is the guard.
            allowMethod(HttpMethod.Get)
            allowMethod(HttpMethod.Post)
            allowMethod(HttpMethod.Options)
            allowHeader(HttpHeaders.ContentType)
        }
        install(ContentNegotiation) { json(this@LocalApiServer.json) }

        routing {
            get("/health") {
                val ctx = appContext
                call.respond(
                    HealthResponse(
                        ok = true,
                        deezerInstalled = ctx != null && DeezerLauncher.isDeezerInstalled(ctx),
                        deezerActive = DeezerController.isActive
                    )
                )
            }

            get("/nowplaying") {
                call.respond(MediaControllerRegistry.nowPlaying ?: NowPlaying())
            }

            get("/nowplaying/stream") {
                call.respondTextWriter(ContentType.Text.EventStream) {
                    MediaControllerRegistry.updates.onEach { np ->
                        write("data: ${json.encodeToString(np ?: NowPlaying())}\n\n")
                        flush()
                    }.collect()
                }
            }

            post("/transport") {
                val req = call.receive<TransportRequest>()
                when (req.action) {
                    "play" -> DeezerController.play()
                    "pause" -> DeezerController.pause()
                    "playPause" -> DeezerController.playPause()
                    "next" -> DeezerController.next()
                    "previous" -> DeezerController.previous()
                    "seekDelta" -> req.deltaMs?.let { DeezerController.seekDelta(it) }
                }
                call.respond(mapOf<String, String>())
            }

            post("/shuffle") {
                val req = call.receive<ShuffleRequest>()
                DeezerController.setShuffle(req.enabled)
                call.respond(req)
            }

            get("/search") {
                val q = call.request.queryParameters["q"] ?: ""
                val type = call.request.queryParameters["type"] ?: "track"
                call.respond(DeezerApi.search(q, type))
            }

            get("/lyrics") {
                val artist = call.request.queryParameters["artist"] ?: ""
                val track = call.request.queryParameters["track"] ?: ""
                val res = LyricsApi.find(artist, track)
                if (res == null) call.respond(HttpStatusCode.NotFound, ErrorResponse("no lyrics"))
                else call.respond(res)
            }

            post("/launch") {
                val req = call.receive<LaunchRequest>()
                val safeType = req.type.lowercase().trim()
                val safeId = req.id.trim()
                if (safeType !in setOf("track", "album", "playlist", "radio")) {
                    call.respond(HttpStatusCode.BadRequest, ErrorResponse("invalid type"))
                    return@post
                }
                // Try MediaController first (works from background on all Android versions).
                // Fall back to activity intent if Deezer session not active yet.
                val launched = DeezerController.playFromId(safeType, safeId)
                if (launched) {
                    call.respond(LaunchResponse(installed = true, uri = "deezer://$safeType/$safeId"))
                    return@post
                }
                val ctx = appContext
                if (ctx == null) {
                    call.respond(HttpStatusCode.InternalServerError, ErrorResponse("no context"))
                    return@post
                }
                try {
                    call.respond(DeezerLauncher.launch(ctx, safeType, safeId))
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest, ErrorResponse(e.message ?: "invalid request"))
                }
            }
        }
    }
}
