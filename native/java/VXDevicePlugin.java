package com.sadia.ai;

import android.Manifest;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.AlarmClock;
import android.provider.CalendarContract;
import android.provider.ContactsContract;
import android.provider.Settings;
import android.telephony.SmsManager;
import android.util.DisplayMetrics;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@CapacitorPlugin(
    name = "VXDevice",
    permissions = {
        @Permission(strings = {Manifest.permission.RECORD_AUDIO}, alias = "mic"),
        @Permission(strings = {Manifest.permission.CAMERA}, alias = "camera"),
        @Permission(strings = {Manifest.permission.READ_CONTACTS}, alias = "contacts"),
        @Permission(strings = {Manifest.permission.CALL_PHONE}, alias = "phone"),
        @Permission(strings = {Manifest.permission.SEND_SMS}, alias = "sms"),
        @Permission(strings = {Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR}, alias = "calendar"),
        @Permission(strings = {Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, alias = "location")
    }
)
public class VXDevicePlugin extends Plugin {

    private static final Map<String, String> ALIAS = new HashMap<>();
    static {
        ALIAS.put("ইউটিউব", "youtube"); ALIAS.put("হোয়াটসঅ্যাপ", "whatsapp"); ALIAS.put("ফেসবুক", "facebook");
        ALIAS.put("ক্যামেরা", "camera"); ALIAS.put("গ্যালারি", "gallery"); ALIAS.put("ক্রোম", "chrome");
        ALIAS.put("গুগল", "google"); ALIAS.put("ম্যাপ", "maps"); ALIAS.put("জিমেইল", "gmail");
        ALIAS.put("ক্যালকুলেটর", "calculator"); ALIAS.put("মেসেজ", "messages"); ALIAS.put("ফোন", "phone");
        ALIAS.put("সেটিংস", "settings"); ALIAS.put("টেলিগ্রাম", "telegram"); ALIAS.put("মেসেঞ্জার", "messenger");
        ALIAS.put("ইনস্টাগ্রাম", "instagram"); ALIAS.put("টিকটক", "tiktok"); ALIAS.put("বিকাশ", "bkash"); ALIAS.put("নগদ", "nagad");
    }

    private Context ctx() {
        return getContext();
    }

    private boolean granted(String p) {
        return ContextCompat.checkSelfPermission(ctx(), p) == PackageManager.PERMISSION_GRANTED;
    }

    private JSObject ok() {
        JSObject o = new JSObject();
        o.put("ok", true);
        return o;
    }

    private void startAct(Intent i) {
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx().startActivity(i);
    }

    /* ---------- permissions ---------- */

    private JSObject status() {
        JSObject s = new JSObject();
        Context c = ctx();
        s.put("mic", granted(Manifest.permission.RECORD_AUDIO));
        s.put("camera", granted(Manifest.permission.CAMERA));
        s.put("contacts", granted(Manifest.permission.READ_CONTACTS));
        s.put("phone", granted(Manifest.permission.CALL_PHONE));
        s.put("sms", granted(Manifest.permission.SEND_SMS));
        s.put("calendar", granted(Manifest.permission.READ_CALENDAR) && granted(Manifest.permission.WRITE_CALENDAR));
        s.put("location", granted(Manifest.permission.ACCESS_FINE_LOCATION) || granted(Manifest.permission.ACCESS_COARSE_LOCATION));
        s.put("notifications", Build.VERSION.SDK_INT < 33 || granted(Manifest.permission.POST_NOTIFICATIONS));
        s.put("a11y", VXAccessibilityService.isEnabled(c));
        boolean notif = false;
        try {
            notif = NotificationManagerCompat.getEnabledListenerPackages(c).contains(c.getPackageName());
        } catch (Exception ignored) {
        }
        s.put("notif", notif);
        PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
        s.put("battery", pm != null && pm.isIgnoringBatteryOptimizations(c.getPackageName()));
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        s.put("alarm", Build.VERSION.SDK_INT < 31 || (am != null && am.canScheduleExactAlarms()));
        s.put("install", Build.VERSION.SDK_INT < 26 || c.getPackageManager().canRequestPackageInstalls());
        return s;
    }

    @PluginMethod
    public void permStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void requestAll(PluginCall call) {
        requestPermissionForAliases(new String[]{"mic", "camera", "contacts", "phone", "sms", "calendar", "location"}, call, "allDone");
    }

    @PermissionCallback
    private void allDone(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && !granted(Manifest.permission.POST_NOTIFICATIONS) && getActivity() != null) {
            ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7001);
        }
        call.resolve(status());
    }

    @PluginMethod
    public void openSpecial(PluginCall call) {
        String w = call.getString("which", "");
        String pkg = ctx().getPackageName();
        Intent i;
        switch (w) {
            case "a11y": i = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS); break;
            case "notif": i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS); break;
            case "battery":
                i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + pkg));
                break;
            case "alarm":
                i = Build.VERSION.SDK_INT >= 31
                        ? new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + pkg))
                        : new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
                break;
            case "install":
                i = Build.VERSION.SDK_INT >= 26
                        ? new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + pkg))
                        : new Intent(Settings.ACTION_SECURITY_SETTINGS);
                break;
            default: i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
        }
        try {
            startAct(i);
            call.resolve(ok());
        } catch (Exception e) {
            call.reject("সেটিংস খোলা যায়নি: " + e.getMessage());
        }
    }

    /* ---------- everyday actions ---------- */

    private String norm(String s) {
        String t = s == null ? "" : s.trim().toLowerCase(Locale.ROOT);
        String a = ALIAS.get(t);
        return a != null ? a : t;
    }

    @PluginMethod
    public void launchApp(PluginCall call) {
        String name = norm(call.getString("name", ""));
        PackageManager pm = ctx().getPackageManager();
        Intent main = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> list = pm.queryIntentActivities(main, 0);
        ResolveInfo best = null;
        for (ResolveInfo r : list) {
            String label = String.valueOf(r.loadLabel(pm)).toLowerCase(Locale.ROOT);
            if (label.equals(name)) { best = r; break; }
            if (best == null && !name.isEmpty() && (label.contains(name) || r.activityInfo.packageName.toLowerCase(Locale.ROOT).contains(name))) best = r;
        }
        JSObject o = new JSObject();
        if (best == null) {
            o.put("ok", false);
            call.resolve(o);
            return;
        }
        Intent li = pm.getLaunchIntentForPackage(best.activityInfo.packageName);
        if (li == null) {
            o.put("ok", false);
            call.resolve(o);
            return;
        }
        startAct(li);
        o.put("ok", true);
        o.put("label", String.valueOf(best.loadLabel(pm)));
        call.resolve(o);
    }

    @PluginMethod
    public void flashlight(PluginCall call) {
        boolean on = call.getBoolean("on", true);
        try {
            CameraManager cm = (CameraManager) ctx().getSystemService(Context.CAMERA_SERVICE);
            for (String id : cm.getCameraIdList()) {
                CameraCharacteristics c = cm.getCameraCharacteristics(id);
                Boolean f = c.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                if (f != null && f) {
                    cm.setTorchMode(id, on);
                    call.resolve(ok());
                    return;
                }
            }
            call.reject("ফ্ল্যাশ পাইনি");
        } catch (CameraAccessException e) {
            call.reject("ফ্ল্যাশ চালানো যায়নি: " + e.getMessage());
        }
    }

    @PluginMethod
    public void volume(PluginCall call) {
        int level = call.getInt("level", 50);
        AudioManager am = (AudioManager) ctx().getSystemService(Context.AUDIO_SERVICE);
        int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        int idx = Math.round(Math.max(0, Math.min(100, level)) / 100f * max);
        am.setStreamVolume(AudioManager.STREAM_MUSIC, idx, AudioManager.FLAG_SHOW_UI);
        call.resolve(ok());
    }

    @PluginMethod
    public void settings(PluginCall call) {
        String p = call.getString("page", "");
        String a;
        switch (p) {
            case "wifi": a = Settings.ACTION_WIFI_SETTINGS; break;
            case "bluetooth": a = Settings.ACTION_BLUETOOTH_SETTINGS; break;
            case "display": a = Settings.ACTION_DISPLAY_SETTINGS; break;
            case "sound": a = Settings.ACTION_SOUND_SETTINGS; break;
            case "battery": a = Settings.ACTION_BATTERY_SAVER_SETTINGS; break;
            case "location": a = Settings.ACTION_LOCATION_SOURCE_SETTINGS; break;
            case "airplane": a = Settings.ACTION_AIRPLANE_MODE_SETTINGS; break;
            case "apps": a = Settings.ACTION_APPLICATION_SETTINGS; break;
            default: a = Settings.ACTION_SETTINGS;
        }
        try {
            startAct(new Intent(a));
            call.resolve(ok());
        } catch (Exception e) {
            call.reject("সেটিংস খোলা যায়নি");
        }
    }

    @PluginMethod
    public void dial(PluginCall call) {
        try {
            startAct(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(call.getString("number", "")))));
            call.resolve(ok());
        } catch (Exception e) {
            call.reject("ডায়াল করা যায়নি");
        }
    }

    @PluginMethod
    public void callNow(PluginCall call) {
        String n = call.getString("number", "");
        try {
            String action = granted(Manifest.permission.CALL_PHONE) ? Intent.ACTION_CALL : Intent.ACTION_DIAL;
            startAct(new Intent(action, Uri.parse("tel:" + Uri.encode(n))));
            call.resolve(ok());
        } catch (Exception e) {
            call.reject("কল করা যায়নি: " + e.getMessage());
        }
    }

    @PluginMethod
    public void findContact(PluginCall call) {
        String name = call.getString("name", "");
        JSObject o = new JSObject();
        if (!granted(Manifest.permission.READ_CONTACTS)) {
            call.reject("কন্টাক্টের অনুমতি নেই");
            return;
        }
        Cursor c = null;
        try {
            c = ctx().getContentResolver().query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    new String[]{ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER},
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ?",
                    new String[]{"%" + name + "%"}, null);
            if (c != null && c.moveToFirst()) {
                o.put("name", c.getString(0));
                o.put("number", c.getString(1));
            }
        } catch (Exception e) {
            call.reject("কন্টাক্ট পড়া যায়নি");
            return;
        } finally {
            if (c != null) c.close();
        }
        call.resolve(o);
    }

    @PluginMethod
    public void sendSms(PluginCall call) {
        String num = call.getString("number", "");
        String text = call.getString("text", "");
        if (!granted(Manifest.permission.SEND_SMS)) {
            call.reject("এসএমএসের অনুমতি নেই");
            return;
        }
        try {
            SmsManager sm = Build.VERSION.SDK_INT >= 31 ? ctx().getSystemService(SmsManager.class) : SmsManager.getDefault();
            ArrayList<String> parts = sm.divideMessage(text);
            sm.sendMultipartTextMessage(num, null, parts, null, null);
            call.resolve(ok());
        } catch (Exception e) {
            call.reject("এসএমএস পাঠানো যায়নি: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openWhatsApp(PluginCall call) {
        String num = call.getString("number", "").replaceAll("[^0-9]", "");
        String text = call.getString("text", "");
        if (num.length() == 11 && num.startsWith("01")) num = "88" + num;
        else if (num.length() == 10 && num.startsWith("1")) num = "880" + num;
        Uri u = Uri.parse("https://wa.me/" + num + "?text=" + Uri.encode(text));
        boolean auto = !text.isEmpty() && VXAccessibilityService.instance != null;
        try {
            if (auto) VXAccessibilityService.armAutoSend();
            Intent i = new Intent(Intent.ACTION_VIEW, u);
            i.setPackage("com.whatsapp");
            try {
                startAct(i);
            } catch (Exception e1) {
                startAct(new Intent(Intent.ACTION_VIEW, u));
            }
            JSObject o = ok();
            o.put("auto", auto);
            call.resolve(o);
        } catch (Exception e) {
            call.reject("হোয়াটসঅ্যাপ খোলা যায়নি");
        }
    }

    @PluginMethod
    public void setAlarm(PluginCall call) {
        try {
            Intent i = new Intent(AlarmClock.ACTION_SET_ALARM);
            i.putExtra(AlarmClock.EXTRA_HOUR, call.getInt("hour", 7));
            i.putExtra(AlarmClock.EXTRA_MINUTES, call.getInt("minute", 0));
            i.putExtra(AlarmClock.EXTRA_MESSAGE, call.getString("message", "সাদিয়া"));
            i.putExtra(AlarmClock.EXTRA_SKIP_UI, true);
            startAct(i);
            call.resolve(ok());
        } catch (Exception e) {
            call.reject("অ্যালার্ম সেট করা যায়নি");
        }
    }

    @PluginMethod
    public void setTimer(PluginCall call) {
        try {
            Intent i = new Intent(AlarmClock.ACTION_SET_TIMER);
            i.putExtra(AlarmClock.EXTRA_LENGTH, call.getInt("seconds", 60));
            i.putExtra(AlarmClock.EXTRA_MESSAGE, call.getString("message", "টাইমার"));
            i.putExtra(AlarmClock.EXTRA_SKIP_UI, true);
            startAct(i);
            call.resolve(ok());
        } catch (Exception e) {
            call.reject("টাইমার সেট করা যায়নি");
        }
    }

    @PluginMethod
    public void scheduleReminder(PluginCall call) {
        long at = System.currentTimeMillis() + call.getInt("seconds", 60) * 1000L;
        VXReminderReceiver.schedule(ctx(), at, call.getString("message", "মনে করিয়ে দিচ্ছি"), false, 0, 0);
        call.resolve(ok());
    }

    @PluginMethod
    public void scheduleDaily(PluginCall call) {
        int h = call.getInt("hour", 7), m = call.getInt("minute", 0);
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, h);
        cal.set(Calendar.MINUTE, m);
        cal.set(Calendar.SECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) cal.add(Calendar.DAY_OF_YEAR, 1);
        VXReminderReceiver.schedule(ctx(), cal.getTimeInMillis(), call.getString("message", "সুপ্রভাত"), true, h, m);
        call.resolve(ok());
    }

    @PluginMethod
    public void addEvent(PluginCall call) {
        try {
            long start = call.getData().optLong("startMillis", System.currentTimeMillis());
            Intent i = new Intent(Intent.ACTION_INSERT).setData(CalendarContract.Events.CONTENT_URI);
            i.putExtra(CalendarContract.Events.TITLE, call.getString("title", "ইভেন্ট"));
            i.putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, start);
            i.putExtra(CalendarContract.EXTRA_EVENT_END_TIME, start + 3600000L);
            startAct(i);
            call.resolve(ok());
        } catch (Exception e) {
            call.reject("ক্যালেন্ডার খোলা যায়নি");
        }
    }

    @PluginMethod
    public void readNotifications(PluginCall call) {
        JSArray arr = new JSArray();
        for (String s : VXNotificationListener.recent()) arr.put(s);
        JSObject o = new JSObject();
        o.put("items", arr);
        call.resolve(o);
    }

    @PluginMethod
    public void keepAlive(PluginCall call) {
        boolean on = call.getBoolean("on", true);
        try {
            Intent i = new Intent(ctx(), VXKeepAliveService.class);
            if (on) ContextCompat.startForegroundService(ctx(), i);
            else ctx().stopService(i);
            call.resolve(ok());
        } catch (Exception e) {
            call.resolve(ok());
        }
    }

    /* ---------- phone control (Accessibility) ---------- */

    private VXAccessibilityService svc(PluginCall call) {
        VXAccessibilityService s = VXAccessibilityService.instance;
        if (s == null) call.reject("Accessibility চালু নেই");
        return s;
    }

    private JSObject res(boolean v) {
        JSObject o = new JSObject();
        o.put("ok", v);
        return o;
    }

    @PluginMethod
    public void a11yGlobal(PluginCall call) {
        VXAccessibilityService s = svc(call);
        if (s != null) call.resolve(res(s.global(call.getString("action", ""))));
    }

    @PluginMethod
    public void a11yTap(PluginCall call) {
        VXAccessibilityService s = svc(call);
        if (s != null) call.resolve(res(s.tap(call.getFloat("x", 0.5f), call.getFloat("y", 0.5f))));
    }

    @PluginMethod
    public void a11ySwipe(PluginCall call) {
        VXAccessibilityService s = svc(call);
        if (s != null) {
            call.resolve(res(s.swipe(call.getFloat("x1", 0.5f), call.getFloat("y1", 0.7f), call.getFloat("x2", 0.5f), call.getFloat("y2", 0.3f), call.getInt("ms", 350))));
        }
    }

    @PluginMethod
    public void a11yType(PluginCall call) {
        VXAccessibilityService s = svc(call);
        if (s != null) call.resolve(res(s.type(call.getString("text", ""))));
    }

    @PluginMethod
    public void a11yClick(PluginCall call) {
        VXAccessibilityService s = svc(call);
        if (s != null) call.resolve(res(s.clickText(call.getString("text", ""))));
    }

    @PluginMethod
    public void a11yScroll(PluginCall call) {
        VXAccessibilityService s = svc(call);
        if (s != null) call.resolve(res(s.scroll(call.getString("dir", "down"))));
    }

    @PluginMethod
    public void a11yRead(PluginCall call) {
        VXAccessibilityService s = svc(call);
        if (s != null) {
            JSObject o = new JSObject();
            o.put("text", s.read());
            call.resolve(o);
        }
    }

    @PluginMethod
    public void screenSize(PluginCall call) {
        DisplayMetrics dm = ctx().getResources().getDisplayMetrics();
        JSObject o = new JSObject();
        o.put("w", dm.widthPixels);
        o.put("h", dm.heightPixels);
        call.resolve(o);
    }

    /* ---------- in-app update ---------- */

    @PluginMethod
    public void appInfo(PluginCall call) {
        try {
            PackageInfo pi = ctx().getPackageManager().getPackageInfo(ctx().getPackageName(), 0);
            JSObject o = new JSObject();
            o.put("versionName", pi.versionName);
            call.resolve(o);
        } catch (Exception e) {
            call.reject("সংস্করণ পড়া যায়নি");
        }
    }

    @PluginMethod
    public void downloadAndInstall(final PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("url নেই");
            return;
        }
        if (Build.VERSION.SDK_INT >= 26 && !ctx().getPackageManager().canRequestPackageInstalls()) {
            try {
                startAct(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx().getPackageName())));
            } catch (Exception ignored) {
            }
            call.reject("আগে \"অ্যাপ ইনস্টল\" অনুমতি চালু করুন, তারপর আবার চাপুন");
            return;
        }
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    File dir = new File(ctx().getCacheDir(), "apk");
                    dir.mkdirs();
                    File f = new File(dir, "update.apk");
                    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                    c.setInstanceFollowRedirects(true);
                    c.setConnectTimeout(15000);
                    c.setReadTimeout(60000);
                    InputStream in = c.getInputStream();
                    FileOutputStream out = new FileOutputStream(f);
                    byte[] buf = new byte[16384];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    out.close();
                    in.close();
                    Uri uri = FileProvider.getUriForFile(ctx(), ctx().getPackageName() + ".vxprovider", f);
                    Intent i = new Intent(Intent.ACTION_VIEW);
                    i.setDataAndType(uri, "application/vnd.android.package-archive");
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    ctx().startActivity(i);
                    call.resolve(ok());
                } catch (Exception e) {
                    call.reject("নামানো যায়নি: " + e.getMessage());
                }
            }
        }).start();
    }
}
