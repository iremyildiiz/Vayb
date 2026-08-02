// Production username login: client never reads username -> email mappings.

const admin = require('firebase-admin');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

admin.initializeApp();

const WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyC_32mNp5s4jUgJGt6EJ8_mPGyF-fAQH5s';
const DB_ID = 'default';
const db = getFirestore(admin.app(), DB_ID);

function normalizeUsername(value = '') {
  return String(value).trim().toLowerCase().replace(/\s+/g, '');
}

function normalizeSearchText(value = '') {
  return normalizeUsername(value)
    .replace(/[ç]/g, 'c')
    .replace(/[ğ]/g, 'g')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ş]/g, 's')
    .replace(/[ü]/g, 'u');
}

function invalidLogin(reason = 'INVALID_LOGIN') {
  return new HttpsError('unauthenticated', reason);
}

function authBridgeError(code) {
  return new HttpsError('failed-precondition', code || 'AUTH_BRIDGE_FAILED');
}

// --- Kendi domaininden (@vaybapp.com) e-posta gönderimi (Resend) ---
const MAIL_FROM = 'Vayb <noreply@vaybapp.com>';

async function sendResendEmail({ to, subject, html }) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) throw new HttpsError('failed-precondition', 'RESEND_KEY_MISSING');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch (e) {}
    console.warn('[resend] gönderim başarısız', res.status, detail);
    throw new HttpsError('internal', `RESEND_${res.status}`);
  }
}

// Sıcak, sade Vayb e-posta şablonu (peach vurgu #FF7A5C).
function mailShell(title, bodyText, buttonLabel, buttonUrl) {
  return `<!DOCTYPE html><html lang="tr"><body style="margin:0;background:#FBF7F4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
      <div style="background:#ffffff;border-radius:16px;padding:32px 28px;border:1px solid #F0E6E0;">
        <div style="font-size:22px;font-weight:700;color:#1A1A1A;margin-bottom:8px;">Vayb</div>
        <h1 style="font-size:18px;color:#1A1A1A;margin:16px 0 8px;">${title}</h1>
        <div style="font-size:14px;color:#555;line-height:22px;">${bodyText}</div>
        <a href="${buttonUrl}" style="display:inline-block;margin-top:24px;background:#FF7A5C;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:12px;">${buttonLabel}</a>
        <p style="font-size:12px;color:#999;line-height:18px;margin-top:24px;">Buton çalışmazsa bu bağlantıyı tarayıcına yapıştır:<br><span style="color:#FF7A5C;word-break:break-all;">${buttonUrl}</span></p>
      </div>
      <p style="font-size:11px;color:#B0A8A2;text-align:center;margin-top:16px;">Bu e-postayı beklemiyorsan görmezden gelebilirsin.</p>
    </div>
  </body></html>`;
}

// E-posta doğrulama bağlantısını Admin SDK ile üretip @vaybapp.com'dan gönderir.
exports.sendVerificationEmail = onCall({ region: 'us-central1', secrets: ['RESEND_API_KEY'] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  const userRecord = await admin.auth().getUser(request.auth.uid);
  const email = userRecord.email;
  if (!email) throw new HttpsError('failed-precondition', 'EMAIL_NOT_FOUND');
  if (userRecord.emailVerified) return { ok: true, alreadyVerified: true };

  const link = await admin.auth().generateEmailVerificationLink(email);
  await sendResendEmail({
    to: email,
    subject: 'Vayb — e-postanı doğrula',
    html: mailShell(
      'E-postanı doğrula',
      'Vayb’ı kullanmaya başlamak için e-posta adresini doğrulaman gerekiyor. Aşağıdaki butona tıkla:',
      'E-postamı doğrula',
      link,
    ),
  });
  return { ok: true };
});

async function getUserByUsername(username) {
  const usernameLower = normalizeUsername(username);
  const usernamePlain = normalizeSearchText(username);
  if (!usernameLower || usernameLower.includes('@')) return null;

  const reserved = await db.collection('usernames').doc(usernameLower).get();
  if (reserved.exists && reserved.data().uid) {
    const userSnap = await db.collection('users').doc(reserved.data().uid).get();
    return userSnap.exists ? { id: userSnap.id, ...userSnap.data() } : { id: reserved.data().uid };
  }

  if (usernamePlain && usernamePlain !== usernameLower) {
    const plainReserved = await db.collection('usernames').doc(usernamePlain).get();
    if (plainReserved.exists && plainReserved.data().uid) {
      const userSnap = await db.collection('users').doc(plainReserved.data().uid).get();
      return userSnap.exists ? { id: userSnap.id, ...userSnap.data() } : { id: plainReserved.data().uid };
    }
  }

  const direct = await db.collection('users').where('usernameLower', '==', usernameLower).limit(1).get();
  if (!direct.empty) {
    const doc = direct.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  const legacy = await db.collection('users').where('username', '==', usernameLower).limit(1).get();
  if (!legacy.empty) {
    const doc = legacy.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  const fallback = await db.collection('users').limit(100).get();
  const exact = fallback.docs.find((doc) => {
    const data = doc.data();
    const userValue = data.username || data.usernameLower || '';
    return normalizeSearchText(userValue) === usernamePlain || normalizeUsername(userValue) === usernameLower;
  });
  return exact ? { id: exact.id, ...exact.data() } : null;
}

async function getPrivateEmail(uid, legacyEmail) {
  // Auth, e-posta değişiminde kaynağın doğrusu. Böylece kullanıcı doğrulama
  // bağlantısından sonra uygulamaya dönmese bile sonraki username girişinde
  // eski userPrivate e-postasına takılmaz.
  try {
    const authUser = await admin.auth().getUser(uid);
    if (authUser.email) return authUser.email;
  } catch (e) {
    // Eski kayıtlar için userPrivate / legacy eşleşmesine geri düş.
  }
  const snap = await db.collection('userPrivate').doc(uid).get();
  if (snap.exists && snap.data().email) return snap.data().email;
  if (legacyEmail) return legacyEmail;
  return null;
}

async function verifyPassword(email, password) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });
  if (!res.ok) {
    let details = null;
    try { details = await res.json(); } catch (e) {}
    const code = details?.error?.message || 'unknown';
    console.warn('[usernameSignIn] password verification failed', {
      status: res.status,
      code,
    });
    if (
      code.includes('API_KEY') ||
      code.includes('PROJECT_DISABLED') ||
      code.includes('CONFIGURATION_NOT_FOUND') ||
      code.includes('SERVICE_DISABLED')
    ) {
      throw authBridgeError(code);
    }
    throw invalidLogin('PASSWORD_VERIFY_FAILED');
  }
  const data = await res.json();
  return data.localId;
}

exports.usernameSignIn = onCall({ region: 'us-central1' }, async (request) => {
  const username = normalizeUsername(request.data?.username);
  const password = String(request.data?.password || '');
  if (username.length < 3 || password.length < 6) {
    console.warn('[usernameSignIn] invalid input length', { usernameLength: username.length, passwordLength: password.length });
    throw invalidLogin('INVALID_INPUT');
  }

  const found = await getUserByUsername(username);
  const email = found?.id ? await getPrivateEmail(found.id, found.email) : null;
  if (!found?.id || !email) {
    console.warn('[usernameSignIn] username/email not found', {
      username,
      hasUser: !!found?.id,
      hasEmail: !!email,
    });
    throw invalidLogin(!found?.id ? 'USERNAME_NOT_FOUND' : 'EMAIL_NOT_FOUND');
  }

  const uid = await verifyPassword(email, password);
  if (uid !== found.id) {
    console.warn('[usernameSignIn] auth uid mismatch', { foundUid: found.id, authUid: uid });
    throw invalidLogin('AUTH_UID_MISMATCH');
  }

  const customToken = await admin.auth().createCustomToken(uid);
  return { customToken };
});

exports.repairMyUsernameIndex = onCall({ region: 'us-central1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');

  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) throw new HttpsError('failed-precondition', 'USER_DOC_NOT_FOUND');

  const userData = userSnap.data();
  const username = normalizeUsername(userData.usernameLower || userData.username);
  if (!username) throw new HttpsError('failed-precondition', 'USERNAME_NOT_FOUND');

  const usernameRef = db.collection('usernames').doc(username);
  const usernameSnap = await usernameRef.get();
  if (usernameSnap.exists && usernameSnap.data().uid && usernameSnap.data().uid !== uid) {
    throw new HttpsError('failed-precondition', 'USERNAME_OWNED_BY_OTHER');
  }

  const authUser = await admin.auth().getUser(uid);
  if (!authUser.email) throw new HttpsError('failed-precondition', 'EMAIL_NOT_FOUND');

  const batch = db.batch();
  batch.set(usernameRef, {
    uid,
    username,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(db.collection('userPrivate').doc(uid), {
    email: authUser.email.trim().toLowerCase(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(db.collection('users').doc(uid), {
    username,
    usernameLower: username,
  }, { merge: true });
  await batch.commit();

  return { ok: true, username };
});

// Kullanıcı adıyla şifre yenileme. E-posta istemciye hiç dönmez; kullanıcı
// bulunamadığında da aynı başarı yanıtı verilir ki hesap varlığı anlaşılmasın.
exports.sendPasswordResetForUsername = onCall({ region: 'us-central1', secrets: ['RESEND_API_KEY'] }, async (request) => {
  const rawInput = String(request.data?.username || '').trim();
  if (rawInput.length < 3) return { ok: true };
  const isEmail = rawInput.includes('@');

  try {
    let email = null;
    if (isEmail) {
      // Kullanıcı e-posta yazdıysa doğrudan ona sıfırlama gönder (format geçerliyse).
      const candidate = rawInput.toLowerCase();
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(candidate)) email = candidate;
    } else {
      const found = await getUserByUsername(normalizeUsername(rawInput));
      email = found?.id ? await getPrivateEmail(found.id, found.email) : null;
    }
    // Teşhis: e-posta değeri LOGLANMAZ, sadece hangi dal + sonuç.
    console.log('[passwordReset] lookup', { via: isEmail ? 'email' : 'username', hasEmail: !!email });
    if (!email) return { ok: true };

    // Sıfırlama bağlantısını Admin SDK üretir, @vaybapp.com'dan Resend ile gönderilir.
    const link = await admin.auth().generatePasswordResetLink(email);
    await sendResendEmail({
      to: email,
      subject: 'Vayb — şifreni sıfırla',
      html: mailShell(
        'Şifreni sıfırla',
        'Vayb hesabının şifresini yenilemek için aşağıdaki butona tıkla. Bu isteği sen yapmadıysan bu e-postayı yok say; şifren değişmez.',
        'Şifremi sıfırla',
        link,
      ),
    });
    console.log('[passwordReset] resend ok');
  } catch (e) {
    console.warn('[passwordReset] gönderilemedi', e?.code || e?.message);
  }

  return { ok: true };
});

// Google Places (New) Autocomplete proxy — API key client'a hiç gitmez.
// Secret GOOGLE_PLACES_KEY runtime'da process.env'de. Türkiye + Türkçe odaklı.
exports.placesAutocomplete = onCall({ region: 'us-central1', secrets: ['GOOGLE_PLACES_KEY'] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
  const input = String(request.data?.input || '').trim();
  if (input.length < 2) return { suggestions: [] };
  const sessionToken = request.data?.sessionToken;

  // Secret'ta görünmez boşluk/newline sık görülür → trim. Teşhis: değeri LOGLAMA,
  // sadece var mı + uzunluk (geçici debug).
  const apiKey = (process.env.GOOGLE_PLACES_KEY || '').trim();
  console.log('[placesAutocomplete] key present:', !!apiKey, 'len:', apiKey.length);
  if (!apiKey) throw new HttpsError('failed-precondition', 'PLACES_KEY_MISSING');

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify({
      // Tip/şehir filtresi YOK → cafe, müze, restoran, işletme, adres hepsi gelir.
      input,
      languageCode: 'tr',
      includedRegionCodes: ['tr'], // bölge odağı (tip filtresi değil)
      includeQueryPredictions: true, // "yakındaki cafe" tarzı sorgu önerileri de
      ...(sessionToken ? { sessionToken } : {}),
    }),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch (e) {}
    let reason = 'PLACES_FAILED';
    try { reason = JSON.parse(detail)?.error?.status || JSON.parse(detail)?.error?.message || reason; } catch (e) {}
    console.warn('[placesAutocomplete] http error', res.status, detail);
    throw new HttpsError('internal', `PLACES_${res.status}: ${reason}`);
  }

  const data = await res.json();
  const raw = data.suggestions || [];
  // Mekanlar (cafe/müze/restoran/işletme/adres) ÖNCE, sorgu önerileri sonra.
  // Instagram tarzı KISA isim: structuredFormat.mainText (mekan adı). Açık adres
  // ayrı "secondary" alanında döner (öneri listesinde alt satır olarak gösterilir,
  // gönderide saklanmaz).
  const mapPred = (p) => {
    const sf = p.structuredFormat || {};
    const main = (sf.mainText && sf.mainText.text) || (p.text && p.text.text) || '';
    const secondary = (sf.secondaryText && sf.secondaryText.text) || '';
    return { text: main, secondary };
  };
  const places = raw
    .filter((s) => s.placePrediction)
    .map((s) => ({ placeId: s.placePrediction.placeId || null, ...mapPred(s.placePrediction) }));
  const queries = raw
    .filter((s) => s.queryPrediction && !s.placePrediction)
    .map((s) => ({ placeId: null, ...mapPred(s.queryPrediction) }));
  const suggestions = [...places, ...queries].filter((s) => s.text);

  return { suggestions };
});
