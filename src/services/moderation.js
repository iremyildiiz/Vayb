// moderation.js — UGC güvenliği: engelleme (blocks) + şikayet (reports).
//
// blocks/{blockerUid}_{blockedUid} → { blockerUid, blockedUid, createdAt }
// reports/{autoId} → { reporterUid, type:'post'|'user', targetId, targetOwnerUid, reason, createdAt }

import {
  doc, getDoc, setDoc, deleteDoc, addDoc, collection, query, where, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { severFollowBothWays } from './follows';

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

// Akış/Vaybla filtresi için ÇİFT YÖNLÜ engel kümesi: benim engellediklerim +
// beni engelleyenler. Böylece beni engelleyenin gönderileri akışımda görünmez,
// benim engellediğime de benim gönderilerim görünmez (o da bu kümeyi kullanır).
// (getBlockedUids tek yönlü kalır → "Engellediklerim" listesi etkilenmez.)
export async function getBlockedSet() {
  if (blockedCache) return blockedCache;
  const me = auth.currentUser?.uid;
  if (!me) return new Set();
  const [outSnap, inSnap] = await Promise.all([
    getDocs(query(collection(db, 'blocks'), where('blockerUid', '==', me))),
    getDocs(query(collection(db, 'blocks'), where('blockedUid', '==', me))),
  ]);
  blockedCache = new Set([
    ...outSnap.docs.map((d) => d.data().blockedUid),
    ...inSnap.docs.map((d) => d.data().blockerUid),
  ].filter(Boolean));
  return blockedCache;
}

export async function isBlocked(otherUid) {
  const me = auth.currentUser?.uid;
  if (!me || !otherUid) return false;
  const s = await getDoc(doc(db, 'blocks', blockId(me, otherUid)));
  return s.exists();
}

// Karşı taraf BENİ engellemiş mi? (profil erişimini kesmek için)
export async function isBlockedByUser(otherUid) {
  const me = auth.currentUser?.uid;
  if (!me || !otherUid) return false;
  const s = await getDoc(doc(db, 'blocks', blockId(otherUid, me)));
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
  // Engelleme takip ilişkisini de koparır (her iki yön + sayaçlar).
  await severFollowBothWays(otherUid);
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
