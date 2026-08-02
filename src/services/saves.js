// saves.js — kullanıcının sessiz, kişisel "Seçtiklerim" listesi.

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { getPost } from './posts';

const idOf = (postId, uid) => `${postId}_${uid}`;

export async function getMySave(postId, uid) {
  const snap = await getDoc(doc(db, 'saves', idOf(postId, uid)));
  return snap.exists();
}

export async function toggleSave(post) {
  const me = auth.currentUser.uid;
  const ref = doc(db, 'saves', idOf(post.id, me));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, {
    postId: post.id,
    uid: me,
    authorUid: post.authorUid,
    clientCreatedAt: Date.now(),
    createdAt: serverTimestamp(),
  });
  return true;
}

export async function getSavedPosts(pageSize = 60) {
  const me = auth.currentUser.uid;
  const snap = await getDocs(
    query(
      collection(db, 'saves'),
      where('uid', '==', me),
      limit(pageSize),
    ),
  );

  const saves = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const bTime = b.createdAt?.toMillis?.() || b.clientCreatedAt || 0;
      const aTime = a.createdAt?.toMillis?.() || a.clientCreatedAt || 0;
      return bTime - aTime;
    });

  const posts = [];
  for (const data of saves) {
    try {
      const post = await getPost(data.postId);
      if (post) posts.push(post);
    } catch (e) {
      /* silinmiş/erişilemeyen post sessizce düşer */
    }
  }
  return posts;
}
