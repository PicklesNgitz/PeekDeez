package com.g2bridge.deezer

import android.content.ComponentName
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.service.notification.NotificationListenerService
import android.util.Log

/**
 * NotificationListenerService (user must enable it in Settings → Notification access).
 * Its [ComponentName] is the credential [MediaSessionManager.getActiveSessions]
 * needs (no permission); it hands sessions off to [DeezerController].
 */
class DeezerListenerService : NotificationListenerService() {

    private val sessionListener =
        MediaSessionManager.OnActiveSessionsChangedListener { controllers ->
            DeezerController.onSessionsChanged(controllers ?: emptyList())
        }

    override fun onListenerConnected() {
        super.onListenerConnected()
        val msm = getSystemService(MediaSessionManager::class.java) ?: run {
            Log.e(TAG, "MediaSessionManager unavailable"); return
        }
        val component = ComponentName(this, DeezerListenerService::class.java)
        val sessions = msm.getActiveSessions(component)
        DeezerController.onSessionsChanged(sessions)
        msm.addOnActiveSessionsChangedListener(sessionListener, component, null)
        Log.i(TAG, "listener connected; active sessions: ${sessions.size}")
    }

    override fun onListenerDisconnected() {
        try {
            getSystemService(MediaSessionManager::class.java)
                ?.removeOnActiveSessionsChangedListener(sessionListener)
        } catch (t: Throwable) { Log.w(TAG, "remove listener failed", t) }
        DeezerController.onSessionsChanged(emptyList())
        super.onListenerDisconnected()
    }

    companion object { private const val TAG = "G2Bridge-Listener" }
}
