// Runs after `npx cap add android`: copies the native Sadia code and patches the Android project.
const fs = require('fs');
const path = require('path');

const PKG = 'com.sadia.ai';
const A = path.join(process.cwd(), 'android');
const javaDir = path.join(A, 'app', 'src', 'main', 'java', ...PKG.split('.'));
const resDir = path.join(A, 'app', 'src', 'main', 'res');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
copyDir(path.join('native', 'java'), javaDir);
copyDir(path.join('native', 'res', 'xml'), path.join(resDir, 'xml'));
copyDir(path.join('native', 'res', 'values'), path.join(resDir, 'values'));

const PERMS = [
  'INTERNET', 'RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS', 'CAMERA', 'READ_CONTACTS', 'CALL_PHONE', 'SEND_SMS',
  'READ_CALENDAR', 'WRITE_CALENDAR', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'POST_NOTIFICATIONS',
  'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_MICROPHONE', 'WAKE_LOCK', 'VIBRATE', 'SCHEDULE_EXACT_ALARM',
  'REQUEST_INSTALL_PACKAGES', 'REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', 'RECEIVE_BOOT_COMPLETED'
].map(p => `    <uses-permission android:name="android.permission.${p}" />`).join('\n') +
  '\n    <uses-permission android:name="com.android.alarm.permission.SET_ALARM" />' +
  '\n    <uses-feature android:name="android.hardware.camera" android:required="false" />' +
  '\n    <uses-feature android:name="android.hardware.telephony" android:required="false" />' +
  '\n    <queries><intent><action android:name="android.intent.action.MAIN" /><category android:name="android.intent.category.LAUNCHER" /></intent></queries>';

const COMPONENTS = `
        <service android:name=".VXAccessibilityService" android:exported="true" android:label="Sadia AI ফোন নিয়ন্ত্রণ"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
            <intent-filter><action android:name="android.accessibilityservice.AccessibilityService" /></intent-filter>
            <meta-data android:name="android.accessibilityservice" android:resource="@xml/vx_accessibility_config" />
        </service>
        <service android:name=".VXNotificationListener" android:exported="true" android:label="Sadia AI নোটিফিকেশন"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
            <intent-filter><action android:name="android.service.notification.NotificationListenerService" /></intent-filter>
        </service>
        <service android:name=".VXKeepAliveService" android:exported="false" android:foregroundServiceType="microphone" />
        <receiver android:name=".VXReminderReceiver" android:exported="false" />
        <provider android:name=".VXFileProvider" android:authorities="\${applicationId}.vxprovider" android:exported="false" android:grantUriPermissions="true">
            <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/vx_file_paths" />
        </provider>
`;

const mf = path.join(A, 'app', 'src', 'main', 'AndroidManifest.xml');
let x = fs.readFileSync(mf, 'utf8');
if (!x.includes('VXAccessibilityService')) {
  x = x.replace('</application>', COMPONENTS + '    </application>');
  x = x.replace('</manifest>', PERMS + '\n</manifest>');
  fs.writeFileSync(mf, x);
}

const vg = path.join(A, 'variables.gradle');
let v = fs.readFileSync(vg, 'utf8');
v = v.replace(/minSdkVersion = \d+/, 'minSdkVersion = 24');
fs.writeFileSync(vg, v);

const bg = path.join(A, 'app', 'build.gradle');
let g = fs.readFileSync(bg, 'utf8');
g = g.replace(/versionCode \d+/, 'versionCode ' + (process.env.VERSION_CODE || '1'))
     .replace(/versionName "[^"]*"/, 'versionName "' + (process.env.VERSION_NAME || '1.0.0') + '"');
fs.writeFileSync(bg, g);
console.log('Android project patched');
