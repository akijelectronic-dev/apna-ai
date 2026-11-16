package com.sadia.ai;

import android.app.Notification;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;

/** Remembers the latest notifications so Sadia can read them out when asked. */
public class VXNotificationListener extends NotificationListenerService {
    private static final LinkedList<String> RECENT = new LinkedList<>();

    public static List<String> recent() {
        synchronized (RECENT) {
            return new ArrayList<>(RECENT);
        }
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            if (sbn == null || getPackageName().equals(sbn.getPackageName())) return;
            Notification n = sbn.getNotification();
            if (n == null || n.extras == null) return;
            Bundle ex = n.extras;
            CharSequence title = ex.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence text = ex.getCharSequence(Notification.EXTRA_TEXT);
            if (title == null && text == null) return;
            String app = sbn.getPackageName();
            try {
                PackageManager pm = getPackageManager();
                app = String.valueOf(pm.getApplicationLabel(pm.getApplicationInfo(sbn.getPackageName(), 0)));
            } catch (Exception ignored) {
            }
            String line = app + ": " + (title == null ? "" : title) + (text == null ? "" : " - " + text);
            synchronized (RECENT) {
                RECENT.addFirst(line);
                while (RECENT.size() > 30) RECENT.removeLast();
            }
        } catch (Exception ignored) {
        }
    }
}
