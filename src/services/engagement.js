// engagement.js — Parıltı (beğeni değil) + kısa tepki (yorum değil). Faz 6B.
//
// Parıltı: likes/{postId}_{uid} → { postId, uid, createdAt }. Toggle.
//   Sayaç posts/{postId}.pariltiCount, TRANSACTION ile güvenilir tutulur
//   (Cloud Function yerine — MVP için yeterli; kural sıkılaşınca CF'ye taşınabilir).
// Kısa tepki: reactions/{postId}_{uid} → { postId, uid, reaction, createdAt }.
//   Bir kullanıcı bir posta bir tepki (değiştirebilir/geri alabilir).

import {
  doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs,
  serverTimestamp, runTransaction, increment,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { createNotification } from './notifications';

const idOf = (postId, uid) => `${postId}_${uid}`;

// Vayb kelimeleri — kullanıcıya "vayb" olarak görünür (kısa atmosfer sözcükleri).
// Not: bu değerler Firestore'da reaction alanının DEĞERİdir (alan adı değişmez).
export const REACTIONS = ['Sakin', 'Sıcak', 'Nostaljik', 'Özgür', 'Huzurlu', 'Büyüleyici'];

// --- Parıltı ---
export async function getMyParilti(postId, uid) {
  const s = await getDoc(doc(db, 'likes', idOf(postId, uid)));
  return s.exists();
}

export async function getPariltiUsers(postId) {
  const snap = await getDocs(query(collection(db, 'likes'), where('postId', '==', postId)));
  return snap.docs.map((d) => d.data().uid).filter(Boolean);
}

// Parlat / geri al (toggle). Dönen: yeni durum (true = parlatıldı).
export async function toggleParilti(postId) {
  const me = auth.currentUser.uid;
  const likeRef = doc(db, 'likes', idOf(postId, me));
  const postRef = doc(db, 'posts', postId);
  let liked;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(likeRef);
    if (snap.exists()) {
      tx.delete(likeRef);
      tx.update(postRef, { pariltiCount: increment(-1) });
      liked = false;
    } else {
      tx.set(likeRef, { postId, uid: me, createdAt: serverTimestamp() });
      tx.update(postRef, { pariltiCount: increment(1) });
      liked = true;
    }
  });
  if (liked) {
    try {
      const postSnap = await getDoc(postRef);
      const authorUid = postSnap.exists() ? postSnap.data().authorUid : null;
      await createNotification({ toUid: authorUid, fromUid: me, type: 'parilti', postId });
    } catch (e) {}
  }
  return liked;
}

// --- Kısa tepki ---
export async function getMyReaction(postId, uid) {
  const s = await getDoc(doc(db, 'reactions', idOf(postId, uid)));
  return s.exists() ? s.data().reaction : null;
}

export async function setReaction(postId, reaction) {
  const me = auth.currentUser.uid;
  await setDoc(doc(db, 'reactions', idOf(postId, me)), {
    postId,
    uid: me,
    reaction,
    createdAt: serverTimestamp(),
  });
  try {
    const postSnap = await getDoc(doc(db, 'posts', postId));
    const authorUid = postSnap.exists() ? postSnap.data().authorUid : null;
    await createNotification({ toUid: authorUid, fromUid: me, type: 'reaction', postId, reaction });
  } catch (e) {}
}

export async function removeReaction(postId) {
  const me = auth.currentUser.uid;
  await deleteDoc(doc(db, 'reactions', idOf(postId, me)));
}

// Bir postun tüm tepkileri → { kelime: [uid, ...] } (tek eşitlik where, index yok).
export async function getReactionSummary(postId) {
  const snap = await getDocs(query(collection(db, 'reactions'), where('postId', '==', postId)));
  const map = {};
  snap.docs.forEach((d) => {
    const r = d.data();
    if (!map[r.reaction]) map[r.reaction] = [];
    map[r.reaction].push(r.uid);
  });
  return map;
}
