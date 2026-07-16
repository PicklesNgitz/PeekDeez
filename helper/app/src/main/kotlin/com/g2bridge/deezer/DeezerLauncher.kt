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
        val uri = "deezer://$safeType/$id"
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val resolved = ctx.packageManager.resolveActivity(intent, 0)
        return if (resolved != null) {
            ctx.startActivity(intent)
            LaunchResponse(installed = true, uri = uri)
        } else LaunchResponse(installed = false, uri = uri)
    }
}
