package com.g2bridge.deezer

import android.content.Context
import android.content.Intent
import android.net.Uri

object DeezerLauncher {
    private const val DEEZER_PKG = "com.deezer.android"

    fun isDeezerInstalled(ctx: Context): Boolean = try {
        ctx.packageManager.getPackageInfo(DEEZER_PKG, 0); true
    } catch (e: Exception) { false }

    /** Launches a track/album/playlist/radio in the Deezer app via deep link. */
    fun launch(ctx: Context, type: String, id: String): LaunchResponse {
        val uri = "deezer://$type/$id"
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val resolved = ctx.packageManager.resolveActivity(intent, 0)
        return if (resolved != null) {
            ctx.startActivity(intent)
            LaunchResponse(installed = true, uri = uri)
        } else LaunchResponse(installed = false, uri = uri)
    }
}
