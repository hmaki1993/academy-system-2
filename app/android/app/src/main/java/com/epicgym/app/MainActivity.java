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
        createSkippyChannel(this);
        // 🔥 Visual proof that the new native code is running
        android.widget.Toast.makeText(this, "Skippy Native Engine V2 Loaded ✅", android.widget.Toast.LENGTH_LONG).show();
    }

    public static void createSkippyChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // 1. Alert Channel (HIGH) - For Mission Popups (V5 to break cache)
            NotificationChannel alertCh = new NotificationChannel(
                "skippy_toes_alerts_v5", "Skippy Alerts Premium", NotificationManager.IMPORTANCE_HIGH
            );
            alertCh.setDescription("Skippy Toes Q8 Priority Alerts");
            alertCh.enableVibration(true);
            alertCh.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 800});
            alertCh.enableLights(true);
            alertCh.setLightColor(0xFFFF3B30);
            alertCh.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            AudioAttributes audioAttr = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build();
            alertCh.setSound(Settings.System.DEFAULT_NOTIFICATION_URI, audioAttr);
            nm.createNotificationChannel(alertCh);

            // 2. Watchdog Channel (LOW) - For Persistent Tracker
            NotificationChannel watchdogCh = new NotificationChannel(
                "SkippyWatchdogChannel_v5", "Skippy Monitoring", NotificationManager.IMPORTANCE_LOW
            );
            watchdogCh.setDescription("Turn this OFF to hide the background icon.");
            watchdogCh.setShowBadge(false);
            nm.createNotificationChannel(watchdogCh);
        }
    }

    public static void showBrandedNotification(Context ctx, String title, String body) {
        try {
            // Tap intent — opens the app
            Intent openIntent = new Intent(ctx, MainActivity.class);
            openIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            
            int pendingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S 
                ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT 
                : PendingIntent.FLAG_UPDATE_CURRENT;

            PendingIntent pendingIntent = PendingIntent.getActivity(
                ctx, (int) (System.currentTimeMillis() % 10000), openIntent, pendingFlags
            );

            // Build the notification — PRIORITY_MAX = heads-up banner
            android.app.Notification notification = new NotificationCompat.Builder(ctx, "skippy_toes_alerts_v5")
                .setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(R.mipmap.ic_launcher) // Branded Logo!
                .setColor(0xFFFF3B30)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_VIBRATE | NotificationCompat.DEFAULT_LIGHTS)
                .setAutoCancel(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build();

            // Fire it!
            NotificationManager manager = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.notify((int)(System.currentTimeMillis() % 100000), notification);
            }

            // Also trigger native vibration pattern
            Vibrator v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) {
                long[] pattern = {0, 400, 200, 400, 200, 800};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    v.vibrate(pattern, -1);
                }
            }
        } catch (Exception e) {
            android.util.Log.e("SkippyNative", "Error showing notification: " + e.getMessage());
        }
    }

    @CapacitorPlugin(name = "SkippyPlugin")
    public static class SkippyPlugin extends Plugin {

        @PluginMethod
        public void showAlert(PluginCall call) {
            try {
                String title = call.getString("title", "🚀 Skippy Toes Q8");
                String body  = call.getString("body",  "You have a new mission!");
                showBrandedNotification(getContext(), title, body);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void startWatchdog(PluginCall call) {
            try {
                String coachName = call.getString("coachName", "Maryam");
                Context ctx = getContext();
                Intent intent = new Intent(ctx, SkippyWatchdogService.class);
                intent.putExtra("coach_name", coachName);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ctx.startForegroundService(intent);
                } else {
                    ctx.startService(intent);
                }
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void stopWatchdog(PluginCall call) {
            try {
                Context ctx = getContext();
                Intent intent = new Intent(ctx, SkippyWatchdogService.class);
                ctx.stopService(intent);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }
    }
}
