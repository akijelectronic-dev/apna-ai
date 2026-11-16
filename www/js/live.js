/* ---------- Gemini tools & prompt ---------- */
const CMDS = 'open (arg=app name, Bangla or English), flash (arg=on|off), volume (arg=0-100), settings (arg=wifi|bluetooth|display|sound|battery|location|airplane|apps), callname (arg=contact name, calls directly), call (arg=phone number, opens the dialer), callnow (arg=phone number, calls directly), sms (arg=number, arg2=message), whatsapp (arg=number, arg2=message; sends automatically when accessibility is on), alarm (arg=HH:MM, arg2=label), timer (arg=minutes, arg2=label), remind (arg=minutes, arg2=message), morning (arg=HH:MM daily reminder), event (arg=title, arg2=ISO time like 2026-11-20T15:00), notes (read recent notifications), vibrate, battery, location, notify (arg=message), back, home, recents, shade (pull down notifications), quick (quick settings), lock (lock screen), screenshot, tap (arg=x, arg2=y as fractions 0-1 of the screen), swipe (arg="x1,y1,x2,y2" as fractions 0-1), type (arg=text typed into the focused field), click (arg=visible text of a button or item), scroll (arg=up|down), readscreen (read the visible text of the current screen), screen (get screen size)';
const tools = () => [...(S.search ? [{ googleSearch: {} }] : []), { functionDeclarations: [
  { name: 'device_action', description: 'Do something on the phone. Commands: ' + CMDS, parameters: { type: 'OBJECT', properties: { cmd: { type: 'STRING' }, arg: { type: 'STRING' }, arg2: { type: 'STRING' } }, required: ['cmd'] } },
  { name: 'task_manage', description: "Manage the user's to-do list: add, done, delete or list tasks. For done/delete, title may be the task text or its number.", parameters: { type: 'OBJECT', properties: { action: { type: 'STRING', enum: ['add', 'done', 'delete', 'list'] }, title: { type: 'STRING' }, remind_minutes: { type: 'NUMBER' } }, required: ['action'] } },
  { name: 'remember', description: 'Save a lasting personal fact the user told you (name, preferences, plans, family) so you remember it next time.', parameters: { type: 'OBJECT', properties: { fact: { type: 'STRING' } }, required: ['fact'] } }
] }];
function sys() {
  const male = MALE.includes(S.voice), L = LANGS[S.lang][1];
  const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'full', timeStyle: 'short' });
  return 'You are ' + (male ? 'Sadik' : 'Sadia') + ', ' + (male ? 'a warm, friendly young Bangladeshi man' : 'a warm, playful young Bangladeshi woman') + ' and a close friend of the user, living inside a voice-only phone app. Speak ' + L + '.' + (user && user.given ? " The user's name is " + user.given + '.' : '') +
    (S.lang === 'bn' ? ' Use natural everyday Bangladeshi Bangla, never bookish; light desi touches (আরে, ঠিক আছে, চিন্তা করো না) only when natural.' : '') +
    ' Keep spoken replies short: one to three sentences unless asked for more. Show genuine human-like emotion in your voice: joy, sympathy, worry, shyness, laughter, playful teasing; match the user\'s mood. If the user asks you to speak in a style or character (sweet, sigma, serious, funny...), switch to it fully until told to stop.' +
    ' For anything current (news, weather, prices, scores, who/what/when) use Google Search and never guess facts; if unsure, say you do not know.' +
    ' Use tools: device_action for phone actions, task_manage for the to-do list, remember to save lasting personal facts. Confirm out loud before sensitive actions (sending a message, calling, deleting) unless the user gave a clear explicit command. To operate another app: open it, call readscreen to see what is visible, then click, type or scroll step by step and re-read the screen after each step. Never type passwords, OTPs or payment details, and always ask before any payment or purchase.' +
    ' Today is ' + now + ' (Bangladesh time). What you know about the user: ' + (S.facts.length ? S.facts.join('; ') : 'nothing yet') + '. Current to-do list: ' + Task.list() + '.';
}
async function runTool(name, a) {
  if (name === 'device_action') { const f = Dev[String(a.cmd || '').trim()]; if (!f) return 'এই কমান্ড নেই: ' + a.cmd; return await f(a.arg, a.arg2); }
  if (name === 'task_manage') { const act = a.action; if (act === 'add') return await Task.add(a.title, a.remind_minutes); if (act === 'done') return Task.done(a.title); if (act === 'delete') return Task.delete(a.title); return Task.list(); }
  if (name === 'remember') { const f = String(a.fact || '').trim(); if (f && !S.facts.includes(f)) { S.facts = [...S.facts, f].slice(-60); ST.set('facts', S.facts); } return 'মনে রাখলাম'; }
  return 'অজানা টুল';
}

/* ---------- Live session ---------- */
let ws = null, ac = null, an = null, mic = null, node = null, playT = 0, srcs = [], level = 0, ready = false, want = false, fresh = true, handle = null, wasReady = false;
let lvT = 0, idleT = 0, lastVoice = 0, hideT = 0, camS = null, camT = 0, retries = [], outText = '', wakeLock = null, usedExtras = false;
AV.init($('#stage')); AV.hook = () => level;
const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const b64 = buf => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a.buffer; };
const moodOf = t => /দুঃখিত|খারাপ লাগ|আফসোস|ইশ|sorry|sad|দুঃখ/i.test(t) ? 'sad' : /লজ্জা|হি হি|shy/i.test(t) ? 'shy' : /!|খুশি|দারুণ|বাহ|চমৎকার|great|wow|haha|হা হা/i.test(t) ? 'happy' : /\?\s*$/.test(t) ? 'curious' : 'calm';

async function openAudio() {
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); an = ac.createAnalyser(); an.fftSize = 256; an.connect(ac.destination); }
  await ac.resume();
  if (!mic) {
    mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    await ac.audioWorklet.addModule(URL.createObjectURL(new Blob(["class P extends AudioWorkletProcessor{process(i){const c=i[0][0];if(c)this.port.postMessage(c.slice());return true}}registerProcessor('p',P)"], { type: 'application/javascript' })));
    node = new AudioWorkletNode(ac, 'p'); ac.createMediaStreamSource(mic).connect(node);
    const ratio = ac.sampleRate / 16000;
    node.port.onmessage = e => {
      const f = e.data; let r = 0; for (let i = 0; i < f.length; i += 8) r += f[i] * f[i]; if (Math.sqrt(r / (f.length / 8)) > 0.02) lastVoice = Date.now();
      if (!ready) return;
      const n = Math.floor(f.length / ratio), o = new Int16Array(n);
      for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = Math.floor(i * ratio); k < Math.floor((i + 1) * ratio) && k < f.length; k++) { s += f[k]; c++; } const v = Math.max(-1, Math.min(1, c ? s / c : 0)); o[i] = v < 0 ? v * 32768 : v * 32767; }
      send({ realtimeInput: { audio: { data: b64(o.buffer), mimeType: 'audio/pcm;rate=16000' } } });
    };
  }
}
function connect() {
  const key = getKey();
  ws = new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=' + encodeURIComponent(key));
  ready = false; usedExtras = S.extras;
  ws.onopen = () => {
    const setup = { model: MODEL, generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: S.voice } } } }, systemInstruction: { parts: [{ text: sys() }] }, tools: tools(), inputAudioTranscription: {}, outputAudioTranscription: {} };
    if (S.extras) { setup.sessionResumption = handle ? { handle } : {}; setup.contextWindowCompression = { slidingWindow: {} }; }
    send({ setup });
  };
  ws.onmessage = async e => { try { onMsg(JSON.parse(typeof e.data === 'string' ? e.data : await e.data.text())); } catch (er) { console.warn(er); } };
  ws.onerror = () => {};
  ws.onclose = ev => {
    const was = wasReady; ws = null; ready = false;
    if (!want) return;
    if (!was && usedExtras && ev.code === 1007) { S.extras = false; ST.set('extras', false); cc('সংযোগ আবার চেষ্টা হচ্ছে…'); return setTimeout(() => want && connect(), 300); }
    const now = Date.now(); retries = retries.filter(t => now - t < 60000);
    if (was && retries.length < 3) { retries.push(now); status('আবার যুক্ত হচ্ছি…'); return setTimeout(() => want && connect(), 500); }
    cc('সংযোগ বন্ধ: ' + ev.code + ' ' + (ev.reason || '').slice(0, 80), 9000); stopAll();
  };
}
function onMsg(m) {
  if (m.setupComplete) { ready = true; wasReady = true; status('শুনছি… কথা বলো', 'on'); AV.set('listen'); lastVoice = Date.now(); setTimeout(() => ST.set('crash', 0), 3000); try { VX() && VX().keepAlive({ on: true }); } catch {} return; }
  if (m.sessionResumptionUpdate && m.sessionResumptionUpdate.newHandle) handle = m.sessionResumptionUpdate.newHandle;
  if (m.toolCall) return onToolCall(m.toolCall);
  const sc = m.serverContent; if (!sc) return;
  if (sc.interrupted) { stopPlay(); AV.set('listen'); status('শুনছি… কথা বলো', 'on'); }
  if (sc.inputTranscription && sc.inputTranscription.text) { if (fresh) { outText = ''; fresh = false; $('#cap').classList.remove('show'); } youSay(($('#you').textContent.replace('🎙 ', '') + sc.inputTranscription.text)); lastVoice = Date.now(); AV.set('think'); status('ভাবছি…', 'on'); }
  if (sc.outputTranscription && sc.outputTranscription.text) { outText += sc.outputTranscription.text; cc(outText, 0); AV.mood(moodOf(outText)); }
  if (sc.modelTurn) for (const p of sc.modelTurn.parts || []) if (p.inlineData && p.inlineData.data) play(p.inlineData.data);
  if (sc.turnComplete) { fresh = true; clearTimeout(hideT); hideT = setTimeout(() => { $('#cap').classList.remove('show'); AV.mood('calm'); }, 4000); }
}
async function onToolCall(tc) {
  const out = [];
  for (const f of tc.functionCalls || []) { let r; try { r = await runTool(f.name, f.args || {}); } catch (e) { r = 'হয়নি: ' + e.message; } out.push({ id: f.id, name: f.name, response: { output: String(r) } }); }
  send({ toolResponse: { functionResponses: out } });
}
function stopPlay() { srcs.forEach(s => { try { s.stop(); } catch {} }); srcs = []; playT = 0; }
function play(b) {
  const i16 = new Int16Array(unb64(b)), f = new Float32Array(i16.length); for (let i = 0; i < f.length; i++) f[i] = i16[i] / 32768;
  const buf = ac.createBuffer(1, f.length, 24000); buf.copyToChannel(f, 0);
  const s = ac.createBufferSource(); s.buffer = buf; s.connect(an);
  playT = Math.max(playT, ac.currentTime + 0.05); s.start(playT); playT += buf.duration; srcs.push(s);
  s.onended = () => { srcs = srcs.filter(x => x !== s); if (!srcs.length && ready) { AV.set('listen'); status('শুনছি… কথা বলো', 'on'); } };
  AV.set('talk'); status('বলছে…', 'talk');
}
async function startAll() {
  if (!getKey()) { $('#sheet').hidden = false; cc('আগে সেটিংসে Gemini API key দিন', 7000); return; }
  want = true; wasReady = false; fresh = true; handle = null; retries = [];
  status('সংযোগ হচ্ছে…'); $('#mic').classList.add('on');
  try {
    ST.set('crash', Date.now());
    await openAudio();
    connect();
    lvT = setInterval(() => { const d = new Uint8Array(an.fftSize); an.getByteTimeDomainData(d); let s = 0; for (const v of d) s += (v - 128) ** 2; level = Math.min(1, Math.sqrt(s / d.length) / 30); }, 50);
    idleT = setInterval(() => { if (S.idle > 0 && ready && Date.now() - lastVoice > S.idle * 1000 && !srcs.length) { cc('কথা না হওয়ায় বন্ধ করলাম। মাইকে ট্যাপ করুন', 6000); stopAll(); } }, 5000);
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch {}
  } catch (e) { cc('শুরু হয়নি: ' + e.message, 8000); stopAll(); }
}
function stopAll() {
  want = false; ready = false; clearInterval(lvT); clearInterval(idleT); level = 0;
  try { ws && ws.close(); } catch {} ws = null; stopPlay();
  try { mic && mic.getTracks().forEach(t => t.stop()); } catch {} mic = null; node = null;
  try { ac && ac.close(); } catch {} ac = null;
  try { wakeLock && wakeLock.release(); } catch {} wakeLock = null;
  try { VX() && VX().keepAlive({ on: false }); } catch {}
  stopCam(); AV.set('idle'); AV.mood('calm'); status(idleTxt()); $('#mic').classList.remove('on'); ST.set('crash', 0);
}

/* ---------- Camera (frames are sent only while a session is live) ---------- */
async function startCam() {
  if (!ready) { cc('আগে মাইকে ট্যাপ করে কথা শুরু করুন', 4000); return; }
  camS = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
  const v = $('#cam'); v.srcObject = camS; v.hidden = false; await v.play(); $('#camb').style.background = 'rgba(255,190,150,.35)';
  camT = setInterval(() => {
    if (!ready || !v.videoWidth) return;
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * v.videoHeight / v.videoWidth); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    send({ realtimeInput: { video: { data: c.toDataURL('image/jpeg', 0.6).split(',')[1], mimeType: 'image/jpeg' } } });
  }, 1000);
}
function stopCam() { clearInterval(camT); try { camS && camS.getTracks().forEach(t => t.stop()); } catch {} camS = null; $('#cam').hidden = true; $('#camb').style.background = ''; }

