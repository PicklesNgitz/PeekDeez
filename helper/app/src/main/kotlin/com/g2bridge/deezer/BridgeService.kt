package com.g2bridge.deezer

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.g2bridge.deezer.server.LocalApiServer

/** Foreground service hosting the local HTTP server on :8765. */
class BridgeService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification())
        LocalApiServer.appContext = applicationContext
        LocalApiServer.start(PORT)
        return START_STICKY
    }

    override fun onDestroy() {
        LocalApiServer.stop()
        super.onDestroy()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java) ?: return
        val ch = NotificationChannel(CHANNEL, getString(R.string.listener_channel), NotificationManager.IMPORTANCE_LOW)
        ch.description = getString(R.string.listener_channel_desc)
        nm.createNotificationChannel(ch)
    }

    private fun buildNotification(): Notification {
        val pi = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.bridge_running))
            .setOngoing(true)
            .setContentIntent(pi)
            .build()
    }

    companion object {
        const val PORT = 8765
        const val CHANNEL = "g2_bridge"
        private const val NOTIF_ID = 1
    }
}
