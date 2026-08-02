// AuthContext — Vayb kimlik durumu.
// Firebase Auth oturumunu dinler; kayıt / giriş / çıkış fonksiyonlarını sunar.
// Kayıtta Firestore'da users/{uid} dokümanı oluşturulur (anayasa §6 veri modeli).

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  deleteUser,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, functions } from '../services/firebase';
import {
  getUserByUsername,
  normalizeUsername,
  reserveUsername,
  validateUsername,
} from '../services/users';

const AuthContext = createContext(null);

// Firebase hata kodlarını Türkçe, kullanıcı dostu mesajlara çevir.
function mesajCevir(code) {
  switch (code) {
    case 'vayb/invalid-login':
      return 'Kullanıcı adı veya şifre hatalı.';
    case 'vayb/invalid-username':
      return 'Kullanıcı adı en az 3 karakter olmalı; harf, rakam, nokta ve alt çizgi kullan.';
    case 'vayb/username-taken':
      return 'Bu kullanıcı adı alınmış.';
    case 'vayb/username-lookup-denied':
      return 'Kullanıcı adı girişi şu an doğrulanamadı. Biraz sonra tekrar dene.';
    case 'vayb/auth-bridge-failed':
      return 'Kullanıcı adı girişi için Firebase Function ayarı eksik. Mail girişi çalışır.';
    case 'vayb/USERNAME_NOT_FOUND':
      return 'Bu kullanıcı adı eşleşmesi bulunamadı. Mail ile bir kez giriş yapıp tekrar dene.';
    case 'vayb/EMAIL_NOT_FOUND':
      return 'Bu hesabın mail eşleşmesi eksik. Mail ile bir kez giriş yapıp tekrar dene.';
    case 'vayb/PASSWORD_VERIFY_FAILED':
    case 'vayb/AUTH_UID_MISMATCH':
    case 'vayb/INVALID_INPUT':
      return 'Kullanıcı adı veya şifre hatalı.';
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.';
    case 'auth/email-already-in-use':
      return 'Bu e-posta zaten kullanımda.';
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalı.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Kullanıcı adı veya şifre hatalı.';
    case 'auth/too-many-requests':
      return 'Çok fazla deneme. Biraz sonra tekrar dene.';
    case 'auth/network-request-failed':
      return 'Ağ hatası. İnternet bağlantını kontrol et.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Firebase yapılandırması eksik (anahtarlar). firebase.js dosyasını kontrol et.';
    default:
      return 'Bir şeyler ters gitti. Tekrar dene.';
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  // users/{uid} dokümanı (photoURL, username, bio…) — tab ikonu + profil paylaşır.
  const [profile, setProfile] = useState(null);
  // E-posta doğrulama durumu — ana uygulamaya girişi kapılar.
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setEmailVerified(!!u?.emailVerified);
      setInitializing(false);
    });
    return unsub;
  }, []);

  // Auth e-postası değiştiğinde kullanıcı adıyla giriş köprüsünü güncel tut.
  const syncPrivateEmail = useCallback(async (authUser) => {
    if (!authUser?.uid || !authUser.email) return;
    await setDoc(doc(db, 'userPrivate', authUser.uid), {
      email: authUser.email.trim().toLowerCase(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, []);

  // Firebase user'ı yenile + token claim'ini tazele → emailVerified güncel.
  const reloadUser = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) { setEmailVerified(false); return false; }
    try { await u.reload(); } catch (e) { /* sessiz geç */ }
    const v = !!auth.currentUser?.emailVerified;
    if (v) {
      try { await auth.currentUser.getIdToken(true); } catch (e) {}
      try { await syncPrivateEmail(auth.currentUser); } catch (e) {}
    }
    setEmailVerified(v);
    return v;
  }, [syncPrivateEmail]);

  const resendVerification = useCallback(async () => {
    if (!auth.currentUser) return;
    auth.languageCode = 'tr'; // Türkçe doğrulama e-postası
    await sendEmailVerification(auth.currentUser);
  }, []);

  // Doğrulanmamış/yanlış e-posta girilmiş hesaplar için kurtarma yolu.
  // E-posta değişimi bağlantısı yeni adrese gider; kullanıcı adı görünmezliğini korur.
  const changeUnverifiedEmail = useCallback(async ({ currentPassword, newEmail }) => {
    const user = auth.currentUser;
    const email = newEmail.trim().toLowerCase();
    if (!user?.email) throw new Error('Oturum bulunamadı.');
    if (!currentPassword) throw new Error('Mevcut şifren gerekli.');
    if (!email) throw new Error('Yeni e-posta adresini gir.');

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    auth.languageCode = 'tr';
    await verifyBeforeUpdateEmail(user, email);
  }, []);

  // Kullanıcı adıyla şifre sıfırlama: e-posta yalnızca güvenli Function içinde çözülür.
  const requestPasswordReset = useCallback(async (username) => {
    const resetForUsername = httpsCallable(functions, 'sendPasswordResetForUsername');
    await resetForUsername({ username });
  }, []);

  // Firestore profil dokümanını yükle/yenile (giriş yapan kullanıcı için).
  const refreshProfile = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) { setProfile(null); return; }
    try {
      const snap = await getDoc(doc(db, 'users', u.uid));
      setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    } catch (e) {
      /* profil çekilemezse sessiz geç */
    }
  }, []);

  useEffect(() => {
    if (user) refreshProfile();
    else setProfile(null);
  }, [user, refreshProfile]);

  const repairUsernameLoginIndex = useCallback(async (authUser) => {
    if (!authUser?.uid || !authUser.email) return;
    try {
      const userRef = doc(db, 'users', authUser.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const usernameLower = normalizeUsername(data.usernameLower || data.username);
      if (!usernameLower) return;
      await setDoc(doc(db, 'userPrivate', authUser.uid), {
        email: authUser.email.trim().toLowerCase(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await setDoc(doc(db, 'usernames', usernameLower), {
        uid: authUser.uid,
        username: usernameLower,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      if (!data.usernameLower || data.usernameLower !== usernameLower) {
        await setDoc(userRef, { usernameLower, username: usernameLower }, { merge: true });
      }
    } catch (e) {
      console.warn('[signIn] username index onarılamadı:', e?.code || e?.message);
    }
  }, []);

  const signUp = useCallback(async ({ email, password, displayName, username }) => {
    const emailClean = email.trim().toLowerCase();
    const usernameLower = normalizeUsername(username);
    const usernameError = validateUsername(usernameLower);
    if (usernameError) {
      const e = new Error(usernameError);
      e.code = 'vayb/invalid-username';
      throw e;
    }

    console.log('[signUp] 1. createUser çağrılıyor…');
    const cred = await createUserWithEmailAndPassword(auth, emailClean, password);
    console.log('[signUp] 2. auth user oluştu:', cred.user.uid);

    try {
      try {
        const existing = await getUserByUsername(usernameLower);
        if (existing && existing.id !== cred.user.uid) {
          const e = new Error('Bu kullanıcı adı alınmış.');
          e.code = 'vayb/username-taken';
          throw e;
        }
      } catch (e) {
        if (e.code === 'vayb/username-taken') throw e;
      }

      await reserveUsername(usernameLower, cred.user.uid, emailClean);
      console.log('[signUp] 3. username rezerve edildi');

      await updateProfile(cred.user, { displayName: displayName?.trim() || '' });
      console.log('[signUp] 4. profil adı yazıldı');

      console.log('[signUp] 5. Firestore users dokümanı YAZILIYOR…');
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: displayName?.trim() || '',
        username: usernameLower,
        usernameLower,
        bio: '',
        photoURL: null,
        createdAt: serverTimestamp(),
        followersCount: 0,
        followingCount: 0,
        // Yasal onay kaydı (kabul edilmeden kayıt zaten engelli).
        termsAcceptedAt: serverTimestamp(),
        privacyAcceptedAt: serverTimestamp(),
        legalVersion: '1.0',
      });
      await setDoc(doc(db, 'userPrivate', cred.user.uid), {
        email: emailClean,
        createdAt: serverTimestamp(),
      });
      console.log('[signUp] 6. users dokümanı YAZILDI ✓');
    } catch (e) {
      console.warn('[signUp] profil/username yazılamadı:', e.code || e.message);
      try { await deleteDoc(doc(db, 'usernames', usernameLower)); } catch (_) {}
      try { await deleteDoc(doc(db, 'users', cred.user.uid)); } catch (_) {}
      try { await deleteDoc(doc(db, 'userPrivate', cred.user.uid)); } catch (_) {}
      try { await deleteUser(cred.user); } catch (_) {}
      throw e;
    }

    // Doğrulama e-postası (Türkçe). Başarısız olsa da kayıt geçerli kalsın.
    try {
      auth.languageCode = 'tr';
      await sendEmailVerification(cred.user);
    } catch (e) {
      console.warn('[signUp] doğrulama e-postası gönderilemedi:', e?.code || e?.message);
    }
    return cred.user;
  }, []);

  const signIn = useCallback(async ({ username, password }) => {
    try {
      if (username.includes('@')) {
        const cred = await signInWithEmailAndPassword(auth, username.trim().toLowerCase(), password);
        await repairUsernameLoginIndex(cred.user);
        try {
          const repairMyUsernameIndex = httpsCallable(functions, 'repairMyUsernameIndex');
          await repairMyUsernameIndex();
        } catch (e) {
          console.warn('[signIn] backend username index onarılamadı:', e?.code || e?.message, e?.message);
        }
        try { await cred.user.reload(); } catch (e) {}
        setEmailVerified(!!auth.currentUser?.emailVerified);
        return cred.user;
      }
      const usernameSignIn = httpsCallable(functions, 'usernameSignIn');
      const res = await usernameSignIn({ username, password });
      const token = res?.data?.customToken;
      if (!token) {
        const e = new Error('Kullanıcı adı veya şifre hatalı.');
        e.code = 'vayb/invalid-login';
        throw e;
      }
      const cred = await signInWithCustomToken(auth, token);
      try { await cred.user.reload(); } catch (e) {}
      setEmailVerified(!!auth.currentUser?.emailVerified);
      return cred.user;
    } catch (e) {
      console.warn('[signIn] hata:', e?.code || e?.message, e?.message);
      if (e.code === 'permission-denied' || e.code === 'firestore/permission-denied') {
        const err = new Error('Kullanıcı adı eşlemesi okunamadı.');
        err.code = 'vayb/username-lookup-denied';
        throw err;
      }
      if (e.code === 'functions/failed-precondition') {
        const err = new Error(e.message);
        err.code = 'vayb/auth-bridge-failed';
        throw err;
      }
      if (e.code === 'functions/unauthenticated') {
        const err = new Error(e.message);
        err.code = `vayb/${e.message || 'invalid-login'}`;
        throw err;
      }
      if (e.code === 'vayb/invalid-login' || e.code === 'auth/network-request-failed' || e.code === 'functions/unavailable') throw e;
      const err = new Error('Kullanıcı adı veya şifre hatalı.');
      err.code = 'vayb/invalid-login';
      throw err;
    }
  }, []);

  const signOut = useCallback(() => fbSignOut(auth), []);

  return (
    <AuthContext.Provider
      value={{ user, profile, refreshProfile, initializing, emailVerified, reloadUser, resendVerification, changeUnverifiedEmail, requestPasswordReset, signUp, signIn, signOut, mesajCevir }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  return ctx;
}
