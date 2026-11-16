/* First-run permission screen: ask everything once, then guide the special switches. */
const RUNTIME = [['mic', '🎙 মাইক', 'কথা শুনতে'], ['camera', '📷 ক্যামেরা', 'দেখতে'], ['contacts', '👥 কন্টাক্ট', 'নাম ধরে কল করতে'], ['phone', '📞 ফোন', 'কল করতে'], ['sms', '💬 এসএমএস', 'বার্তা পাঠাতে'], ['calendar', '📅 ক্যালেন্ডার', 'ইভেন্ট রাখতে'], ['location', '📍 লোকেশন', 'অবস্থান বলতে'], ['notifications', '🔔 নোটিফিকেশন', 'মনে করিয়ে দিতে']];
const SPECIAL = [['a11y', '♿ ফোন নিয়ন্ত্রণ (Accessibility)', 'অন্য অ্যাপে ট্যাপ, স্ক্রল, টাইপ করতে'], ['notif', '📨 নোটিফিকেশন পড়া', 'নোটিফিকেশন পড়ে শোনাতে'], ['battery', '🔋 ব্যাটারি সীমাহীন', 'ব্যাকগ্রাউন্ডে চলতে'], ['alarm', '⏰ সঠিক সময়ের অ্যালার্ম', 'ঠিক সময়ে মনে করাতে'], ['install', '⬇ অ্যাপ ইনস্টল', 'নিজে আপডেট করতে']];
const prow = (k, n, d, ok, sp) => '<div class="pr"><div><b>' + n + '</b><br><small class="m">' + d + '</small></div><span>' + (ok ? '✅' : '⬜') + '</span>' + (sp && !ok ? '<button data-sp="' + k + '">চালু করুন</button>' : '') + '</div>';
async function permRender() {
  const box = $('#pmlist'), p = VX();
  if (!p) { box.innerHTML = '<small class="m">এই অনুমতিগুলো শুধু অ্যাপে (APK) লাগে।</small>'; return; }
  try {
    const s = await p.permStatus();
    box.innerHTML = '<h4>সাধারণ অনুমতি</h4>' + RUNTIME.map(r => prow(r[0], r[1], r[2], s[r[0]], false)).join('') + '<h4>বিশেষ অনুমতি (সেটিংসে একবার চালু করতে হয়)</h4>' + SPECIAL.map(r => prow(r[0], r[1], r[2], s[r[0]], true)).join('');
  } catch (e) { box.textContent = 'অনুমতির অবস্থা পড়া যায়নি: ' + e.message; }
}
function openPerms() { $('#pmsheet').hidden = false; permRender(); }
$('#pmall').onclick = async () => { try { await need().requestAll(); } catch (e) { cc('⚠ ' + e.message, 5000); } permRender(); };
$('#pmdone').onclick = () => { ST.set('onboarded', true); $('#pmsheet').hidden = true; };
$('#pmopen').onclick = () => { $('#sheet').hidden = true; openPerms(); };
$('#pmlist').onclick = async e => { const b = e.target.closest('[data-sp]'); if (!b) return; try { await need().openSpecial({ which: b.dataset.sp }); } catch (er) { cc('⚠ ' + er.message, 5000); } };
document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('#pmsheet').hidden) permRender(); });
