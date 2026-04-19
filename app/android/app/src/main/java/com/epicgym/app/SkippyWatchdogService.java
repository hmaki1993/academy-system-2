package com.epicgym.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.IBinder;
import android.os.SystemClock;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class SkippyWatchdogService extends Service {

    private static final String CHANNEL_ID = "SkippyWatchdogChannel_v5";
    private static final int NOTIFICATION_ID = 9988;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not binding, just a started service
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Ensure channel exists
        MainActivity.createSkippyChannel(this);

        String coachName = "Mission Control";
        if (intent != null && intent.hasExtra("coach_name")) {
            coachName = intent.getStringExtra("coach_name");
        }
        String message = "🛡️ " + coachName + " is monitoring readiness...";

        // Intent to open app if they tap the watchdog
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Skippy Toes Q8")
            .setContentText(message)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW) // LOW so it doesn't constantly vibrate, but keeps process alive
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();

        startForeground(NOTIFICATION_ID, notification);

        return START_STICKY; // Restart automatically if killed
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // 🔥 THE KEY: When user swipes app away, we reschedule ourselves to restart automatically!
        Intent restartServiceIntent = new Intent(getApplicationContext(), SkippyWatchdogService.class);
        restartServiceIntent.setPackage(getPackageName());

        int flags = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S
            ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_ONE_SHOT
            : PendingIntent.FLAG_ONE_SHOT;

        PendingIntent restartPendingIntent = PendingIntent.getService(
            getApplicationContext(), 1, restartServiceIntent, flags
        );

        AlarmManager alarmService = (AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
        if (alarmService != null) {
            // Restart after 2 seconds
            alarmService.set(
                AlarmManager.ELAPSED_REALTIME,
                SystemClock.elapsedRealtime() + 2000,
                restartPendingIntent
            );
        }

        super.onTaskRemoved(rootIntent);
    }
}
