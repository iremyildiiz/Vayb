// feed.js — Ana akış (takip filtreli) + Keşfet (açık hesaplar). Faz 6.5.

import {
  collection, query, orderBy, limit, startAfter, where, getDocs, doc, getDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { getBlockedSet } from './moderation';

// --- Ana akış: yalnızca takip ettiklerim (accepted) ---
// followingUids boşsa boş döner (FeedScreen o durumda "önerilen"e / Keşfet'e düşer).
// NOT: where('authorUid','in',...) + orderBy('createdAt') KOMPOZİT INDEX ister
//   (authorUid + createdAt). İlk çalıştırmada Firestore konsol linki verir → 1 tık.
// NOT: Firestore 'in' en fazla 30 uid alır. 30'dan fazla takip → şimdilik ilk 30;
//   ölçek büyürse fan-out (feeds/{uid}/items) desenine geçilecek.
export async function getFeedPosts({ followingUids, pageSize = 10, lastDoc = null }) {
  if (!followingUids || !followingUids.length) return { posts: [], lastDoc: null, empty: true };

  const uids = followingUids.slice(0, 30);
  const constraints = [where('authorUid', 'in', uids), orderBy('createdAt', 'desc')];
  if (lastDoc) constraints.push(startAfter(lastDoc));
  constraints.push(limit(pageSize));

  const snap = await getDocs(query(collection(db, 'posts'), ...constraints));
  const blocked = await getBlockedSet();
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !blocked.has(p.authorUid));
  const newLastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
  return { posts, lastDoc: newLastDoc, empty: false };
}

// Yazar gizlilik önbelleği (Keşfet'te gizli hesap postu ASLA görünmesin).
// Gizliliği anlık kullanıcı dokümanından okur → gizlilik değişirse doğru davranır.
const authorPublicCache = new Map();
async function isAuthorPublic(uid) {
  if (authorPublicCache.has(uid)) return authorPublicCache.get(uid);
  let pub = true;
  try {
    const s = await getDoc(doc(db, 'users', uid));
    pub = !(s.exists() && s.data().isPrivate === true);
  } catch (e) {
    pub = true;
  }
  authorPublicCache.set(uid, pub);
  return pub;
}

// --- Keşfet / önerilen: sadece AÇIK (isPrivate=false) hesapların postları ---
// Global kronolojik (tek alan orderBy → index yok), gizli hesaplar + kendim
// istemcide elenir. lastDoc ham son dokümandır (sayfalama filtrelemeden bağımsız).
export async function getExplorePosts(pageSize = 20, lastDoc = null) {
  const me = auth.currentUser?.uid;
  const constraints = [orderBy('createdAt', 'desc')];
  if (lastDoc) constraints.push(startAfter(lastDoc));
  constraints.push(limit(pageSize));

  const snap = await getDocs(query(collection(db, 'posts'), ...constraints));
  const raw = snap.docs;
  const newLastDoc = raw.length ? raw[raw.length - 1] : null;
  const blocked = await getBlockedSet();

  const posts = [];
  for (const d of raw) {
    const data = { id: d.id, ...d.data() };
    if (data.authorUid === me) continue; // kendi postlarını Keşfet'te gösterme
    if (blocked.has(data.authorUid)) continue; // engellediklerim görünmesin
    if (await isAuthorPublic(data.authorUid)) posts.push(data);
  }
  return { posts, lastDoc: newLastDoc };
}
