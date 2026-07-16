package com.g2bridge.deezer

import android.content.Context
import android.content.Intent
import android.net.Uri

object DeezerLauncher {
    private const val DEEZER_PKG = "deezer.android.app"

    fun isDeezerInstalled(ctx: Context): Boolean = try {
        ctx.packageManager.getPackageInfo(DEEZER_PKG, 0); true
    } catch (e: Exception) { false }

    private val ALLOWED_TYPES = setOf("track", "album", "playlist", "radio")

    /** Launches a track/album/playlist/radio in the Deezer app via deep link. */
    fun launch(ctx: Context, type: String, id: String): LaunchResponse {
        val safeType = type.lowercase().trim()
        require(safeType in ALLOWED_TYPES) { "Invalid launch type: $type" }
        require(id.isNotEmpty() && id.all { it.isLetterOrDigit() || it == '-' || it == '_' }) {
            "Invalid launch id: $id"
        }
        if (!isDeezerInstalled(ctx)) return LaunchResponse(installed = false, uri = "")

        // HTTPS App Link is the most reliable trigger for Deezer playback.
        val uri = "https://www.deezer.com/$safeType/$id"
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
            .setPackage(DEEZER_PKG)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        return try {
            ctx.startActivity(intent)
            LaunchResponse(installed = true, uri = uri)
        } catch (e: Exception) {
            LaunchResponse(installed = false, uri = uri)
        }
    }
}
