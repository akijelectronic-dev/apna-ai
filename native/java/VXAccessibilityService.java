package com.sadia.ai;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Path;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;

/** Lets Sadia press, type, scroll and read the screen when the user switches this service on. */
public class VXAccessibilityService extends AccessibilityService {
    public static volatile VXAccessibilityService instance;
    private static volatile boolean armed = false;
    private static volatile long armedAt = 0;

    public static void armAutoSend() {
        armed = true;
        armedAt = System.currentTimeMillis();
    }

    public static boolean isEnabled(Context c) {
        try {
            String s = Settings.Secure.getString(c.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if (s == null) return false;
            ComponentName cn = new ComponentName(c, VXAccessibilityService.class);
            return s.contains(cn.flattenToString()) || s.contains(cn.flattenToShortString());
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    protected void onServiceConnected() {
        instance = this;
    }

    @Override
    public boolean onUnbind(Intent intent) {
        instance = null;
        return super.onUnbind(intent);
    }

    @Override
    public void onDestroy() {
        instance = null;
        super.onDestroy();
    }

    @Override
    public void onInterrupt() {
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent e) {
        try {
            if (!armed || e == null || e.getPackageName() == null) return;
            if (System.currentTimeMillis() - armedAt > 15000) {
                armed = false;
                return;
            }
            if (!"com.whatsapp".contentEquals(e.getPackageName()) && !"com.whatsapp.w4b".contentEquals(e.getPackageName())) return;
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root == null) return;
            AccessibilityNodeInfo target = null;
            List<AccessibilityNodeInfo> byId = root.findAccessibilityNodeInfosByViewId(e.getPackageName() + ":id/send");
            if (byId != null && !byId.isEmpty()) target = byId.get(0);
            if (target == null) {
                for (String label : new String[]{"Send", "পাঠান"}) {
                    List<AccessibilityNodeInfo> l = root.findAccessibilityNodeInfosByText(label);
                    if (l != null && !l.isEmpty()) {
                        target = l.get(0);
                        break;
                    }
                }
            }
            if (target != null && clickUp(target)) armed = false;
        } catch (Exception ignored) {
        }
    }

    private boolean clickUp(AccessibilityNodeInfo n) {
        AccessibilityNodeInfo cur = n;
        int depth = 0;
        while (cur != null && depth < 6) {
            if (cur.isClickable() && cur.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true;
            cur = cur.getParent();
            depth++;
        }
        return false;
    }

    public boolean global(String action) {
        int a;
        switch (action == null ? "" : action) {
            case "back": a = GLOBAL_ACTION_BACK; break;
            case "home": a = GLOBAL_ACTION_HOME; break;
            case "recents": a = GLOBAL_ACTION_RECENTS; break;
            case "notifications": a = GLOBAL_ACTION_NOTIFICATIONS; break;
            case "quicksettings": a = GLOBAL_ACTION_QUICK_SETTINGS; break;
            case "lock":
                if (Build.VERSION.SDK_INT < 28) return false;
                a = GLOBAL_ACTION_LOCK_SCREEN;
                break;
            case "screenshot":
                if (Build.VERSION.SDK_INT < 28) return false;
                a = GLOBAL_ACTION_TAKE_SCREENSHOT;
                break;
            default: return false;
        }
        return performGlobalAction(a);
    }

    private float px(float v, int size) {
        return v <= 1f ? v * size : v;
    }

    public boolean tap(float x, float y) {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        Path p = new Path();
        p.moveTo(px(x, dm.widthPixels), px(y, dm.heightPixels));
        GestureDescription.Builder b = new GestureDescription.Builder();
        b.addStroke(new GestureDescription.StrokeDescription(p, 0, 60));
        return dispatchGesture(b.build(), null, null);
    }

    public boolean swipe(float x1, float y1, float x2, float y2, long ms) {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        Path p = new Path();
        p.moveTo(px(x1, dm.widthPixels), px(y1, dm.heightPixels));
        p.lineTo(px(x2, dm.widthPixels), px(y2, dm.heightPixels));
        GestureDescription.Builder b = new GestureDescription.Builder();
        b.addStroke(new GestureDescription.StrokeDescription(p, 0, Math.max(100, ms)));
        return dispatchGesture(b.build(), null, null);
    }

    private AccessibilityNodeInfo findEditable(AccessibilityNodeInfo n, int depth) {
        if (n == null || depth > 25) return null;
        if (n.isEditable()) return n;
        for (int i = 0; i < n.getChildCount(); i++) {
            AccessibilityNodeInfo r = findEditable(n.getChild(i), depth + 1);
            if (r != null) return r;
        }
        return null;
    }

    public boolean type(String text) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;
        AccessibilityNodeInfo f = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (f == null) f = findEditable(root, 0);
        if (f == null) return false;
        Bundle a = new Bundle();
        a.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
        return f.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, a);
    }

    public boolean clickText(String text) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null || text == null) return false;
        List<AccessibilityNodeInfo> l = root.findAccessibilityNodeInfosByText(text);
        if (l == null) return false;
        for (AccessibilityNodeInfo n : l) {
            if (clickUp(n)) return true;
        }
        return false;
    }

    private AccessibilityNodeInfo findScrollable(AccessibilityNodeInfo n, int depth) {
        if (n == null || depth > 25) return null;
        if (n.isScrollable()) return n;
        for (int i = 0; i < n.getChildCount(); i++) {
            AccessibilityNodeInfo r = findScrollable(n.getChild(i), depth + 1);
            if (r != null) return r;
        }
        return null;
    }

    public boolean scroll(String dir) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        AccessibilityNodeInfo s = findScrollable(root, 0);
        if (s == null) return false;
        int act = "up".equals(dir) ? AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD : AccessibilityNodeInfo.ACTION_SCROLL_FORWARD;
        return s.performAction(act);
    }

    private void collect(AccessibilityNodeInfo n, StringBuilder sb, int depth) {
        if (n == null || depth > 30 || sb.length() > 2500) return;
        if (!n.isPassword() && n.isVisibleToUser()) {
            CharSequence t = n.getText();
            CharSequence d = n.getContentDescription();
            if (t != null && t.length() > 0) sb.append(t).append(" | ");
            else if (d != null && d.length() > 0) sb.append(d).append(" | ");
        }
        for (int i = 0; i < n.getChildCount(); i++) collect(n.getChild(i), sb, depth + 1);
    }

    public String read() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return "";
        StringBuilder sb = new StringBuilder();
        collect(root, sb, 0);
        return sb.toString();
    }
}
