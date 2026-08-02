// moderation.js — UGC güvenliği: engelleme (blocks) + şikayet (reports).
//
// blocks/{blockerUid}_{blockedUid} → { blockerUid, blockedUid, createdAt }
// reports/{autoId} → { reporterUid, type:'post'|'user', targetId, targetOwnerUid, reason, createdAt }

import {
  doc, getDoc, setDoc, deleteDoc, addDoc, collection, query, where, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';

const blockId = (a, b) => `${a}_${b}`;

// Engellediğim uid'lerin oturum önbelleği (feed/Vaybla filtresi için).
let blockedCache = null;
export function clearBlockCache() { blockedCache = null; }

export async function getBlockedUids() {
  const me = auth.currentUser?.uid;
  if (!me) return [];
  const snap = await getDocs(query(collection(db, 'blocks'), where('blockerUid', '==', me)));
  return snap.docs.map((d) => d.data().blockedUid).filter(Boolean);
}

export async function getBlockedSet() {
  if (blockedCache) return blockedCache;
  blockedCache = new Set(await getBlockedUids());
  return blockedCache;
}

export async function isBlocked(otherUid) {
  const me = auth.currentUser?.uid;
  if (!me || !otherUid) return false;
  const s = await getDoc(doc(db, 'blocks', blockId(me, otherUid)));
  return s.exists();
}

// Her iki yön: ben onu YA DA o beni engellemişse (DM engeli için).
export async function isBlockedEitherWay(otherUid) {
  const me = auth.currentUser?.uid;
  if (!me || !otherUid) return false;
  const [a, b] = await Promise.all([
    getDoc(doc(db, 'blocks', blockId(me, otherUid))),
    getDoc(doc(db, 'blocks', blockId(otherUid, me))),
  ]);
  return a.exists() || b.exists();
}

export async function blockUser(otherUid) {
  const me = auth.currentUser?.uid;
  if (!me || !otherUid || me === otherUid) return;
  await setDoc(doc(db, 'blocks', blockId(me, otherUid)), {
    blockerUid: me,
    blockedUid: otherUid,
    createdAt: serverTimestamp(),
  });
  clearBlockCache();
}

export async function unblockUser(otherUid) {
  const me = auth.currentUser?.uid;
  if (!me || !otherUid) return;
  await deleteDoc(doc(db, 'blocks', blockId(me, otherUid)));
  clearBlockCache();
}

export async function reportPost(post, reason) {
  const me = auth.currentUser?.uid;
  if (!me || !post?.id) return;
  await addDoc(collection(db, 'reports'), {
    reporterUid: me,
    type: 'post',
    targetId: post.id,
    targetOwnerUid: post.authorUid || null,
    reason: reason || 'unspecified',
    createdAt: serverTimestamp(),
  });
}

export async function reportUser(otherUid, reason) {
  const me = auth.currentUser?.uid;
  if (!me || !otherUid) return;
  await addDoc(collection(db, 'reports'), {
    reporterUid: me,
    type: 'user',
    targetId: otherUid,
    targetOwnerUid: otherUid,
    reason: reason || 'unspecified',
    createdAt: serverTimestamp(),
  });
}
