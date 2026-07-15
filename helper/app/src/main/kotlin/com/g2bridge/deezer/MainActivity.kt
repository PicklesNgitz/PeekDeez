package com.g2bridge.deezer

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Tiny launcher/setup activity. Buttons:
 *  - grant POST_NOTIFICATIONS (Android 13+)
 *  - open Settings → Notification access (enable the listener — REQUIRED)
 *  - ignore battery optimization (keeps the foreground service alive)
 *  - start the bridge now
 */
class MainActivity : ComponentActivity() {
    private val notifPerm =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    Setup(onGrantNotifications = {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
                            notifPerm.launch(android.Manifest.permission.POST_NOTIFICATIONS)
                    }, onNotificationAccess = {
                        startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                    }, onBatteryOpt = {
                        startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
                    }, onStartBridge = {
                        startForegroundService<Intent>(Intent(this@MainActivity, BridgeService::class.java))
                    })
                }
            }
        }
    }

    private inline fun <reified T : android.content.Service> startForegroundService(intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(intent)
        else startService(intent)
    }
}

@Composable
private fun Setup(
    onGrantNotifications: () -> Unit,
    onNotificationAccess: () -> Unit,
    onBatteryOpt: () -> Unit,
    onStartBridge: () -> Unit
) {
    Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("G2 ↔ Deezer Bridge", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(8.dp))
        Text("Local server on 127.0.0.1:8765.", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(16.dp))
        Button(onGrantNotifications, Modifier.width(280.dp)) { Text("Grant notifications") }
        Button(onNotificationAccess, Modifier.width(280.dp)) { Text("Enable notification access") }
        Button(onBatteryOpt, Modifier.width(280.dp)) { Text("Ignore battery optimization") }
        Button(onStartBridge, Modifier.width(280.dp)) { Text("Start bridge") }
        Spacer(Modifier.height(12.dp))
        Text(
            "Enable notification access for this app so it can find Deezer's media session.",
            style = MaterialTheme.typography.bodySmall
        )
    }
}
