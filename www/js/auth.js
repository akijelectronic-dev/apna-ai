/* Simple local profile: the app asks for a name once and remembers it on this phone only. */
let user = ST.get('user', null);
function greeting() {
  const h = +new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', hour: 'numeric', hour12: false }) % 24;
  const [e, w] = h >= 4 && h < 12 ? ['🌅', 'শুভ সকাল'] : h >= 12 && h < 15 ? ['☀️', 'শুভ দুপুর'] : h >= 15 && h < 18 ? ['🌤️', 'শুভ বিকেল'] : h >= 18 && h < 20 ? ['🌆', 'শুভ সন্ধ্যা'] : ['🌙', 'শুভ রাত্রি'];
  return e + ' ' + w + (user && user.given ? ', ' + user.given : '');
}
function applyUser() {
  $('#gl').textContent = greeting();
  const pf = $('#prof'); pf.style.backgroundImage = ''; pf.textContent = user ? (user.given || '👤').charAt(0).toUpperCase() : '👤';
  $('#pinfo').innerHTML = user ? '<div class="who"><div class="logo"></div><div><b>' + esc(user.name) + '</b></div></div>' : '<small class="m">নাম দেওয়া নেই। নাম দিলে সাদিয়া তোমার নাম ধরে ডাকবে।</small>';
  $('#signout').hidden = !user; $('#gbtn2').hidden = !!user;
}
function setName(n) {
  n = String(n || '').trim();
  user = n ? { name: n, given: n.split(' ')[0] } : null;
  ST.set('user', user); applyUser();
  $('#login').hidden = !!user || !!sessionStorage.getItem('guest');
  if (user) $('#psheet').hidden = true;
}
function renderName(box) {
  box.innerHTML = '<div class="row"><input type="text" maxlength="30" placeholder="তোমার নাম"><button class="pri">সেভ</button></div>';
  const inp = box.querySelector('input'), btn = box.querySelector('button');
  const save = () => { const n = inp.value.trim(); if (!n) return; setName(n); cc('স্বাগতম, ' + n, 3000); };
  btn.onclick = save; inp.onkeydown = e => { if (e.key === 'Enter') save(); };
}
function initAuth() {
  applyUser();
  $('#lp').textContent = 'তোমার কণ্ঠের সঙ্গী। তোমার নামটা বলো, সাদিয়া নাম ধরে ডাকবে।';
  $('#login').hidden = !!user || !!sessionStorage.getItem('guest');
  renderName($('#gbtn')); renderName($('#gbtn2'));
}
$('#guest').onclick = () => { sessionStorage.setItem('guest', '1'); $('#login').hidden = true; };
$('#prof').onclick = () => { $('#psheet').hidden = !$('#psheet').hidden; };
$('#pclose').onclick = () => { $('#psheet').hidden = true; };
$('#signout').onclick = () => { setName(''); initAuth(); };
