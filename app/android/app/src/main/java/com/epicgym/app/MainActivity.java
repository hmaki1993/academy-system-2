package com.epicgym.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createSkippyNotificationChannel();
    }

    /**
     * 🔔 Create a MAX-importance notification channel for heads-up banners.
     * This runs natively in Java BEFORE the WebView loads, guaranteeing
     * the channel exists when FCM delivers a notification.
     */
    private void createSkippyNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            // Delete old channel if it exists (force fresh creation with correct importance)
            manager.deleteNotificationChannel("epic_alerts");

            NotificationChannel channel = new NotificationChannel(
                "skippy_toes_alerts",
                "Skippy Alerts",
                NotificationManager.IMPORTANCE_HIGH  // IMPORTANCE_HIGH = heads-up banner
            );
            channel.setDescription("Urgent training alerts for Skippy Toes Q8");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 800});
            channel.enableLights(true);
            channel.setLightColor(0xFFFF3B30); // Red alert light
            channel.setShowBadge(true);

            // Set default notification sound
            AudioAttributes audioAttr = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            channel.setSound(Settings.System.DEFAULT_NOTIFICATION_URI, audioAttr);

            manager.createNotificationChannel(channel);
        }
    }
}

