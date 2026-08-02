// notifications.js — Bildirimler merkezi: parıltı + his.
// Takip istekleri follows koleksiyonundan aynı ekrana karıştırılır.

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

const nid = ({ type, toUid, fromUid, postId }) => `${type}_${toUid}_${fromUid}_${postId || 'none'}`;

export async function createNotification({ toUid, fromUid, type, postId = null, reaction = null }) {
  if (!toUid || !fromUid || toUid === fromUid) return;
  const ref = doc(db, 'notifications', nid({ type, toUid, fromUid, postId }));
  await setDoc(ref, {
    toUid,
    fromUid,
    type,
    postId,
    reaction,
    read: false,
    createdAt: serverTimestamp(),
    clientCreatedAt: Date.now(),
  }, { merge: true });
}

export async function getNotificationsForMe(uid, pageSize = 80) {
  const snap = await getDocs(query(collection(db, 'notifications'), where('toUid', '==', uid)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const bt = b.createdAt?.toMillis?.() || b.clientCreatedAt || 0;
      const at = a.createdAt?.toMillis?.() || a.clientCreatedAt || 0;
      return bt - at;
    })
    .slice(0, pageSize);
}

export async function getUnreadNotificationCount(uid) {
  const snap = await getDocs(query(collection(db, 'notifications'), where('toUid', '==', uid)));
  return snap.docs.filter((d) => d.data().read !== true).length;
}

export async function markNotificationsRead(uid) {
  const snap = await getDocs(query(collection(db, 'notifications'), where('toUid', '==', uid)));
  const unread = snap.docs.filter((d) => d.data().read !== true);
  for (let i = 0; i < unread.length; i += 450) {
    const batch = writeBatch(db);
    unread.slice(i, i + 450).forEach((d) => batch.set(d.ref, { read: true }, { merge: true }));
    await batch.commit();
  }
}
