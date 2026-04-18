package com.epicgym.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SkippyPlugin.class);
        super.onCreate(savedInstanceState);
        createSkippyChannel();
    }

    private void createSkippyChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm == null) return;

            // Delete any old channels to force fresh creation
            nm.deleteNotificationChannel("epic_alerts");

            NotificationChannel ch = new NotificationChannel(
                "skippy_toes_alerts", "Skippy Alerts", NotificationManager.IMPORTANCE_HIGH
            );
            ch.setDescription("Skippy Toes Q8 training alerts");
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 800});
            ch.enableLights(true);
            ch.setLightColor(0xFFFF3B30);
            ch.setShowBadge(true);

            AudioAttributes audioAttr = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            ch.setSound(Settings.System.DEFAULT_NOTIFICATION_URI, audioAttr);
            nm.createNotificationChannel(ch);
        }
    }

    // =========================================================================
    // SkippyPlugin — Same pattern as Scooter Fuel's AlarmPlugin
    // Called from JavaScript via: registerPlugin<any>('SkippyPlugin').showAlert(...)
    // =========================================================================
    @CapacitorPlugin(name = "SkippyPlugin")
    public static class SkippyPlugin extends Plugin {

        @PluginMethod
        public void showAlert(PluginCall call) {
            try {
                String title = call.getString("title", "🏆 Skippy Toes Q8");
                String body  = call.getString("body",  "لديك رسالة جديدة");

                Context ctx = getContext();

                // Tap intent — opens the app
                Intent openIntent = new Intent(ctx, MainActivity.class);
                openIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                    ctx, 1, openIntent,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                );

                // Ensure channel exists (safety net)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    NotificationManager nm = ctx.getSystemService(NotificationManager.class);
                    if (nm != null && nm.getNotificationChannel("skippy_toes_alerts") == null) {
                        NotificationChannel ch = new NotificationChannel(
                            "skippy_toes_alerts", "Skippy Alerts", NotificationManager.IMPORTANCE_HIGH
                        );
                        ch.enableVibration(true);
                        ch.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 800});
                        nm.createNotificationChannel(ch);
                    }
                }

                // Build the notification — PRIORITY_MAX = heads-up banner
                android.app.Notification notification = new NotificationCompat.Builder(ctx, "skippy_toes_alerts")
                    .setContentTitle(title)
                    .setContentText(body)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setColor(0xFFFF3B30)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setContentIntent(pendingIntent)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                    .setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_VIBRATE | NotificationCompat.DEFAULT_LIGHTS)
                    .setAutoCancel(true)
                    .build();

                // Fire it!
                NotificationManager manager = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
                if (manager != null) {
                    manager.notify((int)(System.currentTimeMillis() % 10000), notification);
                }

                // Also trigger native vibration pattern (like Scooter Fuel)
                Vibrator v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    long[] pattern = {0, 400, 200, 400, 200, 800};
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createWaveform(pattern, -1));
                    } else {
                        v.vibrate(pattern, -1);
                    }
                }

                call.resolve();
            } catch (Exception e) {
                call.reject("showAlert failed: " + e.getMessage());
            }
        }
    }
}


