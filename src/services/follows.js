// follows.js — takip sistemi (koşullu onay) + sayaçlar.
// Anayasa §6: follows/{followerUid}_{followedUid} → { followerUid, followedUid,
//   status: 'pending'|'accepted', createdAt }.
//
// Sayaçlar: şimdilik CLIENT-SIDE, writeBatch + increment() ile (Cloud Function
// yerine — MVP için yeterli). Mevcut gevşek kurallar (if request.auth != null)
// başka kullanıcının users dokümanına yazmaya izin veriyor. Faz 7'de kurallar
// sıkılaşınca sayaçlar Cloud Function'a taşınmalı.

import {
  doc, getDoc, deleteDoc, collection, query, where, getDocs,
  serverTimestamp, writeBatch, increment,
} from 'firebase/firestore';
import { db, auth } from './firebase';

const fid = (a, b) => `${a}_${b}`;

// İlişki durumu: null | 'pending' | 'accepted'
export async function getFollowStatus(followerUid, followedUid) {
  const snap = await getDoc(doc(db, 'follows', fid(followerUid, followedUid)));
  return snap.exists() ? snap.data().status || null : null;
}

// Takip et / (gizliyse) istek gönder. Dönen: yeni status.
export async function follow(followedUid, targetIsPrivate) {
  const me = auth.currentUser.uid;
  const status = targetIsPrivate ? 'pending' : 'accepted';
  const batch = writeBatch(db);
  batch.set(doc(db, 'follows', fid(me, followedUid)), {
    followerUid: me,
    followedUid,
    status,
    createdAt: serverTimestamp(),
  });
  // Sayaç sadece kabul edilen (public) takipte artar.
  if (status === 'accepted') {
    batch.set(doc(db, 'users', followedUid), { followersCount: increment(1) }, { merge: true });
    batch.set(doc(db, 'users', me), { followingCount: increment(1) }, { merge: true });
  }
  await batch.commit();
  return status;
}

// Takibi bırak / bekleyen isteği geri çek.
export async function unfollow(followedUid) {
  const me = auth.currentUser.uid;
  const ref = doc(db, 'follows', fid(me, followedUid));
  const snap = await getDoc(ref);
  const wasAccepted = snap.exists() && snap.data().status === 'accepted';
  const batch = writeBatch(db);
  batch.delete(ref);
  if (wasAccepted) {
    batch.set(doc(db, 'users', followedUid), { followersCount: increment(-1) }, { merge: true });
    batch.set(doc(db, 'users', me), { followingCount: increment(-1) }, { merge: true });
  }
  await batch.commit();
}

// Engelleme sırasında iki yönlü takip ilişkisini koparır + sayaçları düzeltir.
// (Bekleyen istekler sayacı etkilemediğinden yalnızca 'accepted' olanlar düşülür.)
export async function severFollowBothWays(otherUid) {
  const me = auth.currentUser?.uid;
  if (!me || !otherUid) return;
  const meToOther = doc(db, 'follows', fid(me, otherUid));
  const otherToMe = doc(db, 'follows', fid(otherUid, me));
  const [a, b] = await Promise.all([getDoc(meToOther), getDoc(otherToMe)]);
  if (!a.exists() && !b.exists()) return;

  const batch = writeBatch(db);
  if (a.exists()) {
    batch.delete(meToOther);
    if (a.data().status === 'accepted') {
      batch.set(doc(db, 'users', otherUid), { followersCount: increment(-1) }, { merge: true });
      batch.set(doc(db, 'users', me), { followingCount: increment(-1) }, { merge: true });
    }
  }
  if (b.exists()) {
    batch.delete(otherToMe);
    if (b.data().status === 'accepted') {
      batch.set(doc(db, 'users', me), { followersCount: increment(-1) }, { merge: true });
      batch.set(doc(db, 'users', otherUid), { followingCount: increment(-1) }, { merge: true });
    }
  }
  await batch.commit();
}

// Bana gelen bekleyen istekler (tek eşitlik where → kompozit index gerekmez,
// status istemcide filtrelenir).
export async function getPendingRequests(uid) {
  const snap = await getDocs(query(collection(db, 'follows'), where('followedUid', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((f) => f.status === 'pending');
}

// Takip ettiğim (kabul edilmiş) kullanıcıların uid listesi — feed filtresi için.
export async function getFollowingUids(uid) {
  const snap = await getDocs(query(collection(db, 'follows'), where('followerUid', '==', uid)));
  return snap.docs
    .map((d) => d.data())
    .filter((f) => f.status === 'accepted')
    .map((f) => f.followedUid);
}

export async function getFollowerUids(uid) {
  const snap = await getDocs(query(collection(db, 'follows'), where('followedUid', '==', uid)));
  return snap.docs
    .map((d) => d.data())
    .filter((f) => f.status === 'accepted')
    .map((f) => f.followerUid);
}

// Gelen isteği onayla (followerUid → beni takip ediyor).
export async function acceptRequest(followerUid) {
  const me = auth.currentUser.uid;
  const batch = writeBatch(db);
  batch.set(doc(db, 'follows', fid(followerUid, me)), { status: 'accepted' }, { merge: true });
  batch.set(doc(db, 'users', me), { followersCount: increment(1) }, { merge: true });
  batch.set(doc(db, 'users', followerUid), { followingCount: increment(1) }, { merge: true });
  await batch.commit();
}

// Gelen isteği reddet (dokümanı sil).
export async function rejectRequest(followerUid) {
  const me = auth.currentUser.uid;
  await deleteDoc(doc(db, 'follows', fid(followerUid, me)));
}
