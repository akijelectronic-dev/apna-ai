package com.sadia.ai;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;

public class VXReminderReceiver extends BroadcastReceiver {
    static final String CH = "vx_remind";

    public static void schedule(Context c, long at, String msg, boolean daily, int h, int m) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        Intent i = new Intent(c, VXReminderReceiver.class);
        i.putExtra("msg", msg);
        i.putExtra("daily", daily);
        i.putExtra("h", h);
        i.putExtra("m", m);
        int code = ((int) (at / 1000L)) ^ msg.hashCode();
        PendingIntent pi = PendingIntent.getBroadcast(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        if (exact) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    @Override
    public void onReceive(Context c, Intent i) {
        String msg = i.getStringExtra("msg");
        if (msg == null) msg = "মনে করিয়ে দিচ্ছি";
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CH, "রিমাইন্ডার", NotificationManager.IMPORTANCE_HIGH));
        }
        Intent launch = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        PendingIntent open = launch == null ? null : PendingIntent.getActivity(c, 0, launch, PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle("Sadia AI")
                .setContentText(msg)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(msg))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(Notification.DEFAULT_ALL);
        if (open != null) b.setContentIntent(open);
        try {
            nm.notify((int) (System.currentTimeMillis() & 0x7fffffff), b.build());
        } catch (Exception ignored) {
        }
        if (i.getBooleanExtra("daily", false)) {
            schedule(c, System.currentTimeMillis() + 86400000L, msg, true, i.getIntExtra("h", 0), i.getIntExtra("m", 0));
        }
    }
}
