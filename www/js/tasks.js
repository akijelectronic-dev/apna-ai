/* ---------- Tasks ---------- */
let tasks = ST.get('tasks', []);
function renderT() {
  const l = $('#tlist');
  l.innerHTML = tasks.length ? tasks.map(x => '<div class="ti' + (x.done ? ' d' : '') + '" data-id="' + x.id + '"><label><input type="checkbox"' + (x.done ? ' checked' : '') + '><span>' + esc(x.t) + '</span></label><button class="tx" aria-label="মুছুন">✕</button></div>').join('') : '<small class="m">এখনো কোনো টাস্ক নেই। বলুন: "টাস্কে যোগ করো ..."</small>';
}
const saveT = () => { ST.set('tasks', tasks); renderT(); };
const findT = q => { q = bn2en(q).trim(); const n = parseInt(q); if (n > 0 && n <= tasks.length && String(n) === q) return tasks[n - 1]; return tasks.find(x => q && (x.t.includes(q) || q.includes(x.t))) || null; };
const Task = {
  add: async (t, min) => { t = String(t || '').trim(); if (!t) return 'কাজের নাম পাইনি'; tasks.push({ id: Date.now(), t, done: false }); saveT(); const m = parseFloat(bn2en(min)); if (m > 0) await Dev.remind(m, 'কাজের কথা মনে করিয়ে দিচ্ছি: ' + t); return 'টাস্কে যোগ করলাম: ' + t + (m > 0 ? '। ' + m + ' মিনিট পর মনে করাব' : ''); },
  done: q => { const x = findT(q); if (!x) return 'এই নামে টাস্ক পাইনি'; x.done = true; saveT(); return x.t + ' শেষ হিসেবে চিহ্নিত করলাম'; },
  delete: q => { const x = findT(q); if (!x) return 'এই নামে টাস্ক পাইনি'; tasks = tasks.filter(y => y !== x); saveT(); return x.t + ' মুছে দিলাম'; },
  list: () => tasks.length ? tasks.map((x, i) => (i + 1) + '. ' + (x.done ? '[শেষ] ' : '') + x.t).join('; ') : 'কোনো টাস্ক নেই'
};

