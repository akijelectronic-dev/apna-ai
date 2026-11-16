/* Device actions. Everything here talks to the native "VXDevice" plugin that ships inside the APK. */
const VX = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VXDevice;
const need = () => { const p = VX(); if (!p) throw new Error('এই কাজ শুধু অ্যাপে (APK) চলে'); return p; };
const go = url => { window.open(url, '_blank'); };
const notify = t => { try { if (Notification.permission === 'granted') new Notification('Sadia', { body: t }); } catch {} };
const bn2en = s => String(s ?? '').replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
async function a11y(method, args) {
  const p = need();
  if (!(await p.permStatus()).a11y) { openPerms(); throw new Error('ফোন নিয়ন্ত্রণ (Accessibility) চালু নেই। অনুমতি স্ক্রিন থেকে চালু করুন'); }
  return p[method](args || {});
}
const frac = v => { v = parseFloat(bn2en(v)); return isNaN(v) ? 0.5 : v; };
const Dev = {
  open: async a => { const p = VX(); if (p) { try { const r = await p.launchApp({ name: String(a) }); if (r.ok) return r.label + ' চালু করলাম'; } catch {} } go('https://www.google.com/search?q=' + encodeURIComponent(a)); return a + ' খুলছি'; },
  flash: async on => { await need().flashlight({ on: on !== 'off' }); return on === 'off' ? 'ফ্ল্যাশ বন্ধ' : 'ফ্ল্যাশ চালু'; },
  volume: async v => { await need().volume({ level: +bn2en(v) }); return 'ভলিউম ' + v + '%'; },
  settings: async p => { await need().settings({ page: String(p) }); return 'সেটিংস খুলছি'; },
  call: async n => { await need().dial({ number: String(n) }); return 'ডায়াল স্ক্রিন খুলছি'; },
  callnow: async n => { await need().callNow({ number: String(n) }); return 'কল করছি'; },
  callname: async name => { const r = await need().findContact({ name: String(name || '') }); if (!r.number) return name + ' নামে কন্টাক্ট পাইনি'; await need().callNow({ number: r.number }); return r.name + ' কে কল করছি'; },
  sms: async (num, text) => { await need().sendSms({ number: String(num || ''), text: String(text || '') }); return 'এসএমএস পাঠানো হয়েছে'; },
  whatsapp: async (num, text) => { const r = await need().openWhatsApp({ number: String(num || ''), text: String(text || '') }); return r.auto ? 'হোয়াটসঅ্যাপে বার্তা পাঠাচ্ছি' : 'হোয়াটসঅ্যাপে বার্তা প্রস্তুত, পাঠান চাপুন'; },
  alarm: async (hm, label) => { const [h, m] = String(hm || '').split(':').map(Number); await need().setAlarm({ hour: h || 0, minute: m || 0, message: String(label || 'সাদিয়া') }); return 'অ্যালার্ম সেট: ' + hm; },
  timer: async (min, label) => { const m = parseFloat(bn2en(min)) || 1; await need().setTimer({ seconds: Math.round(m * 60), message: String(label || 'টাইমার') }); return m + ' মিনিটের টাইমার সেট'; },
  remind: async (min, msg) => { const m = parseFloat(bn2en(min)) || 1, p = VX(); if (!p) { setTimeout(() => { notify(msg); cc('⏰ ' + msg, 10000); }, m * 60000); return m + ' মিনিট পর মনে করিয়ে দেব (অ্যাপ খোলা থাকলে)'; } await p.scheduleReminder({ seconds: Math.round(m * 60), message: String(msg || 'মনে করিয়ে দিচ্ছি') }); return m + ' মিনিট পর মনে করিয়ে দেব'; },
  morning: async hm => { const [h, m] = String(hm || '07:00').split(':').map(Number); await need().scheduleDaily({ hour: h || 0, minute: m || 0, message: 'সুপ্রভাত! আজকের কাজ দেখুন' }); return 'প্রতিদিন ' + String(hm || '07:00') + ' এ সকালের মনে করানো সেট'; },
  event: async (title, when) => { await need().addEvent({ title: String(title || 'ইভেন্ট'), startMillis: Date.parse(when) || Date.now() }); return 'ক্যালেন্ডার খুলছি, সেভ চাপুন'; },
  notes: async () => { const r = await need().readNotifications(); const l = r.items || []; return l.length ? 'সর্বশেষ নোটিফিকেশন: ' + l.slice(0, 6).join('; ') : 'কোনো নোটিফিকেশন পাইনি (নোটিফিকেশন পড়ার অনুমতি চালু আছে কি?)'; },
  vibrate: () => (navigator.vibrate && navigator.vibrate([200, 100, 200]), 'ভাইব্রেট করলাম'),
  battery: async () => Math.round((await navigator.getBattery()).level * 100) + '% ব্যাটারি',
  location: () => new Promise(r => navigator.geolocation.getCurrentPosition(p => r('অক্ষাংশ ' + p.coords.latitude.toFixed(4) + ', দ্রাঘিমাংশ ' + p.coords.longitude.toFixed(4)), () => r('লোকেশন পাইনি'))),
  notify: t => (notify(t), 'নোটিফিকেশন দিলাম'),
  /* full phone control (needs the Accessibility permission) */
  back: async () => (await a11y('a11yGlobal', { action: 'back' }), 'পেছনে গেলাম'),
  home: async () => (await a11y('a11yGlobal', { action: 'home' }), 'হোমে গেলাম'),
  recents: async () => (await a11y('a11yGlobal', { action: 'recents' }), 'সাম্প্রতিক অ্যাপ খুললাম'),
  shade: async () => (await a11y('a11yGlobal', { action: 'notifications' }), 'নোটিফিকেশন প্যানেল নামালাম'),
  quick: async () => (await a11y('a11yGlobal', { action: 'quicksettings' }), 'কুইক সেটিংস খুললাম'),
  lock: async () => (await a11y('a11yGlobal', { action: 'lock' }), 'স্ক্রিন লক করলাম'),
  screenshot: async () => (await a11y('a11yGlobal', { action: 'screenshot' }), 'স্ক্রিনশট নিলাম'),
  tap: async (x, y) => { await a11y('a11yTap', { x: frac(x), y: frac(y) }); return 'ট্যাপ করলাম'; },
  swipe: async s => { const [x1, y1, x2, y2] = String(s).split(',').map(frac); await a11y('a11ySwipe', { x1, y1, x2, y2, ms: 350 }); return 'সোয়াইপ করলাম'; },
  type: async t => { const r = await a11y('a11yType', { text: String(t || '') }); return r.ok ? 'লিখলাম' : 'লেখার ঘর পাইনি'; },
  click: async t => { const r = await a11y('a11yClick', { text: String(t || '') }); return r.ok ? '"' + t + '" চাপলাম' : '"' + t + '" পাইনি'; },
  scroll: async d => { const r = await a11y('a11yScroll', { dir: String(d || 'down') }); return r.ok ? 'স্ক্রল করলাম' : 'স্ক্রল করার জায়গা পাইনি'; },
  readscreen: async () => { const r = await a11y('a11yRead'); return r.text || 'স্ক্রিনে কিছু পাইনি'; },
  screen: async () => { const r = await need().screenSize(); return 'স্ক্রিন ' + r.w + '×' + r.h + ' পিক্সেল'; }
};
