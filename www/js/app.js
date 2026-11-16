/* ---------- Wiring ---------- */
$('#mic').onclick = () => (want ? stopAll() : startAll());
$('#camb').onclick = () => (camS ? stopCam() : startCam().catch(e => cc('ক্যামেরা পাইনি: ' + e.message, 6000)));
$('#gear').onclick = () => { $('#sheet').hidden = !$('#sheet').hidden; };
$('#sclose').onclick = () => { $('#sheet').hidden = true; };
$('#tasksb').onclick = () => { renderT(); $('#tsheet').hidden = !$('#tsheet').hidden; };
$('#tclose').onclick = () => { $('#tsheet').hidden = true; };
const addT = () => { const v = $('#tin').value.trim(); if (v) { Task.add(v); $('#tin').value = ''; } };
$('#tadd').onclick = addT; $('#tin').onkeydown = e => { if (e.key === 'Enter') addT(); };
$('#tlist').onclick = e => { const row = e.target.closest('.ti'); if (!row) return; const x = tasks.find(y => String(y.id) === row.dataset.id); if (!x) return; if (e.target.classList.contains('tx')) { tasks = tasks.filter(y => y !== x); saveT(); } else if (e.target.type === 'checkbox') { x.done = e.target.checked; saveT(); } };
// language list
const lsh = $('#langsheet');
function setLang(k) { S.lang = k; ST.set('lang', k); $('#langb').textContent = k.toUpperCase(); $('#lang').value = k; lsh.querySelectorAll('[data-l]').forEach(b => b.classList.toggle('on', b.dataset.l === k)); }
lsh.innerHTML = '<h3>ভাষা বেছে নিন</h3>' + Object.entries(LANGS).map(([k, v]) => '<button data-l="' + k + '">' + v[0] + '</button>').join('');
$('#lang').innerHTML = Object.entries(LANGS).map(([k, v]) => '<option value="' + k + '">' + v[0] + '</option>').join('');
$('#voice').innerHTML = VOICES.map(([k, n]) => '<option value="' + k + '">' + n + '</option>').join('');
const restartIfLive = why => { if (want) { cc(why, 3000); const k = getKey(); stopAll(); setTimeout(startAll, 400); } };
$('#langb').onclick = () => { lsh.hidden = !lsh.hidden; };
lsh.onclick = e => { const b = e.target.closest('[data-l]'); if (!b) return; setLang(b.dataset.l); lsh.hidden = true; restartIfLive('ভাষা বদলাচ্ছি…'); };
$('#lang').onchange = e => { setLang(e.target.value); restartIfLive('ভাষা বদলাচ্ছি…'); };
$('#voice').onchange = e => { S.voice = e.target.value; ST.set('voice', S.voice); restartIfLive('কণ্ঠ বদলাচ্ছি…'); };
$('#gs').onchange = e => { S.search = e.target.checked; ST.set('search', S.search); };
$('#idle').onchange = e => { S.idle = +e.target.value; ST.set('idle', S.idle); };
$('#ksave').onclick = () => { localStorage.setItem('gk', $('#key').value.trim()); cc('সেভ হয়েছে', 2500); $('#sheet').hidden = true; status(idleTxt()); initAuth(); };
$('#restart').onclick = () => { handle = null; $('#sheet').hidden = true; if (want) { stopAll(); setTimeout(startAll, 400); } };
$('#clearf').onclick = () => { S.facts = []; ST.set('facts', []); cc('মনে রাখা তথ্য মুছে ফেলেছি', 3000); };
$('#key').value = getKey(); $('#voice').value = S.voice; $('#lang').value = S.lang; $('#gs').checked = S.search; $('#idle').value = String(S.idle);
$('#ver').textContent = 'Sadia AI v' + APP_VERSION + ' · মডেল: ' + MODEL.replace('models/', '');
setLang(S.lang); renderT(); initAuth();
setInterval(() => { $('#gl').textContent = greeting(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && want && ac) ac.resume(); });
if (ST.get('crash', 0)) { ST.set('crash', 0); setTimeout(() => cc('⚠ গতবার মাইক চালু করার সময় অ্যাপ বন্ধ হয়েছিল। আবার হলে আমাকে জানান', 8000), 1200); }
status(idleTxt());

/* ---------- In-app update (APK) ---------- */
const verArr = a => String(a).replace(/^v/, '').split('.').map(n => parseInt(n) || 0);
const isNewer = (a, b) => { const x = verArr(a), y = verArr(b); for (let k = 0; k < 3; k++) { if ((x[k] || 0) !== (y[k] || 0)) return (x[k] || 0) > (y[k] || 0); } return false; };
async function checkUpdate() {
  if (!isNative() || !CFG.repo || CFG.repo.indexOf('__') >= 0 || !VX()) return;
  try {
    const cur = (await VX().appInfo()).versionName;
    const r = await (await fetch('https://api.github.com/repos/' + CFG.repo + '/releases/latest')).json();
    const asset = (r.assets || []).find(a => /\.apk$/i.test(a.name));
    if (r.tag_name && asset && isNewer(r.tag_name, cur)) {
      const u = $('#upd'); u.textContent = '⬆️ নতুন সংস্করণ ' + r.tag_name + ' আছে, আপডেট করুন'; u.hidden = false;
      u.onclick = async () => { u.textContent = 'নামানো হচ্ছে…'; try { await VX().downloadAndInstall({ url: asset.browser_download_url }); u.hidden = true; } catch (e) { u.textContent = '⬆️ আবার চেষ্টা করুন'; cc('আপডেট ব্যর্থ: ' + e.message, 7000); } };
    }
  } catch (e) { console.warn(e); }
}
checkUpdate();
if (isNative() && !ST.get('onboarded', false)) setTimeout(() => { openPerms(); }, 900);
