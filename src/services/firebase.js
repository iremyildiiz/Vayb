// firebase.js — Vayb Firebase kurulumu (JS SDK)
// Auth (React Native kalıcılığı ile) + Firestore + Storage.
//
// ============================================================
//  ⬇️  ANAHTARLARINI BURAYA YAPIŞTIR  ⬇️
//  Firebase Console → Proje ayarları → "Web uygulaması" (</>) →
//  "SDK kurulumu ve yapılandırması" → firebaseConfig nesnesini kopyala.
// ============================================================
const firebaseConfig = {
  apiKey: 'AIzaSyC_32mNp5s4jUgJGt6EJ8_mPGyF-fAQH5s',
  authDomain: 'vayb-b96c6.firebaseapp.com',
  projectId: 'vayb-b96c6',
  storageBucket: 'vayb-b96c6.firebasestorage.app',
  messagingSenderId: '723243668330',
  appId: '1:723243668330:web:32428c9e65aedba6cf0b13',
  measurementId: 'G-2504K6KGRP',
};
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Fast Refresh sırasında tekrar init'i önle (getApps kontrolü)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth: oturum AsyncStorage'da kalıcı olsun (uygulama kapanınca çıkış olmasın)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore bağlantısı.
// ÖNEMLİ: Bu projenin veritabanı ID'si `(default)` DEĞİL, düz `default`.
// SDK varsayılan olarak `(default)`'a bağlanır → 3. argümanla ID'yi veriyoruz.
// Ayrıca RN'de WebChannel takılabildiği için long polling'i zorluyoruz.
// Fast Refresh'te iki kez init edilirse hata atar → getFirestore'a düş.
const DB_ID = 'default';
function initDb() {
  try {
    const d = initializeFirestore(app, { experimentalForceLongPolling: true }, DB_ID);
    console.log('[firebase] Firestore initialized — db:', DB_ID, '| longPolling: ON');
    return d;
  } catch (e) {
    console.log('[firebase] Firestore zaten init edilmiş, getFirestore kullanılıyor');
    return getFirestore(app, DB_ID);
  }
}

export const db = initDb();
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Config yapıştırıldı mı? (placeholder kaldıysa uyarı için)
export const isFirebaseConfigured = !firebaseConfig.apiKey.startsWith('BURAYA');

export default app;
