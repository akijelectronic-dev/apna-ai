/* core: helpers, settings, on-screen messages */
const CFG = window.SADIA_CONFIG || {};
const APP_VERSION = CFG.version || '2.2.0';
const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const $ = s => document.querySelector(s);
const ST = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MODEL = 'models/gemini-3.1-flash-live-preview';
const LANGS = { bn: ['বাংলা', 'Bangla'], en: ['English', 'English'], hi: ['हिन्दी', 'Hindi'], ur: ['اردو', 'Urdu'], ar: ['العربية', 'Arabic'], ms: ['Melayu', 'Malay'] };
const VOICES = [['Kore', '👩 Kore'], ['Aoede', '👩 Aoede'], ['Leda', '👩 Leda'], ['Zephyr', '👩 Zephyr'], ['Puck', '👨 Puck'], ['Charon', '👨 Charon'], ['Orus', '👨 Orus'], ['Fenrir', '👨 Fenrir']];
const MALE = ['Puck', 'Charon', 'Orus', 'Fenrir'];
const S = { lang: ST.get('lang', 'bn'), voice: ST.get('voice', 'Kore'), search: ST.get('search', true), idle: ST.get('idle', 120), facts: ST.get('facts', []), extras: ST.get('extras', true) };
const getKey = () => (localStorage.getItem('gk') || '').trim();

/* ---------- UI helpers ---------- */
let ccT, youT;
function cc(t, ms = 4500) { const c = $('#cap'); c.textContent = String(t).slice(-130); c.classList.add('show'); clearTimeout(ccT); if (ms) ccT = setTimeout(() => c.classList.remove('show'), ms); }
function youSay(t) { const y = $('#you'); y.textContent = '🎙 ' + String(t).slice(-100); y.classList.add('show'); clearTimeout(youT); youT = setTimeout(() => y.classList.remove('show'), 4000); }
function status(txt, cls) { $('#st').textContent = txt; $('#sp').className = cls || ''; }
const idleTxt = () => (getKey() ? 'মাইকে ট্যাপ করে কথা শুরু করুন' : 'প্রথমবার: ⚙ থেকে Gemini API key দিন');
window.addEventListener('error', e => cc('⚠ ' + String(e.message || 'error').slice(0, 90)));
window.addEventListener('unhandledrejection', e => cc('⚠ ' + String((e.reason && e.reason.message) || e.reason || 'error').slice(0, 90)));

