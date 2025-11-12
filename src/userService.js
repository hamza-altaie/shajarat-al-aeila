// src/userService.js
const API  = import.meta.env.VITE_API_BASE;
const AUTH = import.meta.env.VITE_AUTH_BASE;

export function getStoredAuth() {
  try { return JSON.parse(localStorage.getItem('banilam_auth') || '{}'); }
  catch { return {}; }
}
export function setStoredAuth(o) { localStorage.setItem('banilam_auth', JSON.stringify(o || {})); }
export function clearStoredAuth() { localStorage.removeItem('banilam_auth'); }

async function parseJson(r) {
  const txt = await r.text();
  try { return txt ? JSON.parse(txt) : {}; } catch { return { message: txt || '' }; }
}
function wpErrorMessage(j) {
  if (!j) return 'حدث خطأ غير متوقع';
  if (j.message) return j.message;
  if (j.data && j.data.message) return j.data.message;
  return 'تعذر تنفيذ العملية';
}

// ضمان وإدارة الـ nonce + إعادة المحاولة مرّة واحدة عند 401/403
async function ensureNonce() {
  const a = getStoredAuth();
  if (!a?.nonce) await fetchNonce();
}
async function apiFetch(url, opts = {}, retried = false) {
  await ensureNonce();
  const a = getStoredAuth();
  const h = new Headers(opts.headers || {});
  if (a?.nonce) h.set('X-WP-Nonce', a.nonce);

  const r = await fetch(url, { credentials: 'include', ...opts, headers: h });
  if ((r.status === 401 || r.status === 403) && !retried) {
    // قد يكون الـ nonce منتهيًا
    await fetchNonce();
    return apiFetch(url, opts, true);
  }
  return r;
}

/* ======================
   OTP / جلسات ووردبريس
   ====================== */

// طلب إرسال رمز
export async function requestOtp(phone) {
  const r = await fetch(`${AUTH}/otp/request`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
  if (!r.ok) {
    const j = await parseJson(r);
    throw new Error(wpErrorMessage(j) || 'تعذر إرسال الرمز');
  }
  return r.json();
}

// التحقق من الرمز وتسجيل الدخول
export async function verifyOtp(phone, code) {
  const r = await fetch(`${AUTH}/otp/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code })
  });
  if (!r.ok) {
    const j = await parseJson(r);
    throw new Error(wpErrorMessage(j) || 'رمز غير صحيح أو منتهي');
  }
  const d = await r.json(); // { nonce, user }
  setStoredAuth({ nonce: d.nonce, user: d.user });
  return d.user;
}

// جلب/تحديث nonce
export async function fetchNonce() {
  const r = await fetch(`${AUTH}/nonce`, { credentials: 'include' });
  const j = await parseJson(r);
  if (j?.nonce) setStoredAuth({ ...getStoredAuth(), nonce: j.nonce });
  return j;
}

// معلومات المستخدم الحالي من الجلسة
export async function me() {
  const r = await fetch(`${AUTH}/me`, { credentials: 'include' });
  if (!r.ok) return null; // غير مسجّل
  return r.json();
}

// تسجيل الخروج
export async function logout() {
  try {
    await fetch(`${AUTH}/logout`, { method: 'POST', credentials: 'include' });
  } finally {
    clearStoredAuth();
  }
}

/* ======================
   REST للأفراد/الشجرة
   ====================== */

function jsonHeaders() { return { 'Content-Type': 'application/json' }; }

export async function listPersons(q = '') {
  const u = q ? `${API}/persons?q=${encodeURIComponent(q)}` : `${API}/persons`;
  const r = await apiFetch(u);
  if (!r.ok) { const j = await parseJson(r); throw new Error(wpErrorMessage(j) || 'فشل جلب الأفراد'); }
  return r.json();
}

export async function createPerson(body) {
  const r = await apiFetch(`${API}/persons`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body)
  });
  if (!r.ok) { const j = await parseJson(r); throw new Error(wpErrorMessage(j) || 'فشل إنشاء العضو'); }
  return r.json();
}

export async function updatePerson(id, body) {
  const r = await apiFetch(`${API}/persons/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(body)
  });
  if (!r.ok) { const j = await parseJson(r); throw new Error(wpErrorMessage(j) || 'فشل تحديث العضو'); }
  return r.json();
}

export async function deletePerson(id) {
  const r = await apiFetch(`${API}/persons/${id}`, { method: 'DELETE' });
  if (!r.ok) { const j = await parseJson(r); throw new Error(wpErrorMessage(j) || 'فشل حذف العضو'); }
  return r.json();
}

export async function getTree(rootId = null) {
  const u = rootId ? `${API}/tree?root_id=${encodeURIComponent(rootId)}` : `${API}/tree`;
  const r = await apiFetch(u, { cache: 'no-store' });
  if (!r.ok) { const j = await parseJson(r); throw new Error(wpErrorMessage(j) || 'فشل جلب الشجرة'); }
  return r.json();
}
