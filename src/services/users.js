// users.js — profil verisi ve profil düzenleme.
// Anayasa §6: users/{uid}. Profil fotoğrafı Storage'da profilePhotos/{uid}/.

import {
  doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs,
  runTransaction, serverTimestamp, writeBatch, increment,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { auth, db, storage } from './firebase';

export function normalizeUsername(value) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '');
}

function normalizeSearchText(value) {
  return normalizeUsername(value)
    .replace(/[ç]/g, 'c')
    .replace(/[ğ]/g, 'g')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ş]/g, 's')
    .replace(/[ü]/g, 'u');
}

export function validateUsername(value) {
  const username = normalizeUsername(value);
  if (username.length < 3) return 'Kullanıcı adı en az 3 karakter olmalı.';
  if (!/^[a-z0-9._çğıöşü]+$/i.test(username)) return 'Kullanıcı adı sadece harf, rakam, nokta ve alt çizgi içerebilir.';
  return '';
}

export async function getUserByUsername(username) {
  const usernameLower = normalizeUsername(username);
  const usernamePlain = normalizeSearchText(username);
  if (!usernameLower) return null;

  const reserved = await getDoc(doc(db, 'usernames', usernameLower));
  if (reserved.exists()) {
    const data = reserved.data();
    if (data.uid) {
      const userSnap = await getDoc(doc(db, 'users', data.uid));
      const userData = userSnap.exists() ? userSnap.data() : {};
      return { id: data.uid, ...userData, ...data, email: data.email || userData.email };
    }
  }

  if (usernamePlain && usernamePlain !== usernameLower) {
    const plainReserved = await getDoc(doc(db, 'usernames', usernamePlain));
    if (plainReserved.exists()) {
      const data = plainReserved.data();
      if (data.uid) {
        const userSnap = await getDoc(doc(db, 'users', data.uid));
        const userData = userSnap.exists() ? userSnap.data() : {};
        return { id: data.uid, ...userData, ...data, email: data.email || userData.email };
      }
    }
  }

  const snap = await getDocs(query(collection(db, 'users'), where('usernameLower', '==', usernameLower), limit(1)));
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }

  if (usernamePlain && usernamePlain !== usernameLower) {
    const plainSnap = await getDocs(query(collection(db, 'users'), where('usernameLower', '==', usernamePlain), limit(1)));
    if (!plainSnap.empty) {
      const d = plainSnap.docs[0];
      return { id: d.id, ...d.data() };
    }
  }

  const legacySnap = await getDocs(query(collection(db, 'users'), where('username', '==', usernameLower), limit(1)));
  if (!legacySnap.empty) {
    const d = legacySnap.docs[0];
    return { id: d.id, ...d.data() };
  }

  const fallback = await getDocs(query(collection(db, 'users'), limit(100)));
  const exact = fallback.docs.find((d) => {
    const data = d.data();
    const userValue = data.username || data.usernameLower || '';
    return normalizeSearchText(userValue) === usernamePlain || normalizeUsername(userValue) === usernameLower;
  });
  return exact ? { id: exact.id, ...exact.data() } : null;
}

export async function reserveUsername(username, uid, email) {
  const usernameLower = normalizeUsername(username);
  const error = validateUsername(usernameLower);
  if (error) {
    const e = new Error(error);
    e.code = 'vayb/invalid-username';
    throw e;
  }

  try {
    await setDoc(doc(db, 'usernames', usernameLower), {
      uid,
      username: usernameLower,
      createdAt: serverTimestamp(),
    }, { merge: false });
  } catch (e) {
    const err = new Error('Bu kullanıcı adı alınmış.');
    err.code = 'vayb/username-taken';
    throw err;
  }

  return usernameLower;
}

// Yerel dosyayı gerçek RN blob'una çevir (XHR) — base64/blob(ArrayBuffer) RN'de sorunlu.
function uriToBlob(uri) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Dosya okunamadı (blob).'));
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Kullanıcının tüm postları — yalnızca eşitlik where'i (kompozit index gerekmez),
// createdAt'e göre istemci tarafında sıralanır. (Ölçek büyürse orderBy+index+sayfalama.)
export async function getUserPosts(uid) {
  const snap = await getDocs(query(collection(db, 'posts'), where('authorUid', '==', uid)));
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  posts.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  return posts;
}

// Username ile prefix arama. Yeni hesaplarda usernameLower kullanılır; eski
// hesaplarda alan eksik olabileceği için küçük bir istemci tarafı fallback var.
export async function searchUsers(qStr) {
  const q = normalizeUsername(qStr);
  const qPlain = normalizeSearchText(qStr);
  if (!q) return [];
  const byId = new Map();
  const addDocs = (docs) => docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));

  const primary = await getDocs(
    query(
      collection(db, 'users'),
      orderBy('usernameLower'),
      where('usernameLower', '>=', q),
      where('usernameLower', '<=', q + ''),
      limit(20),
    ),
  );
  addDocs(primary.docs);

  // Legacy / Türkçe karakter fallback: usernameLower olmayan veya "hüseyinn"
  // gibi alanlarda aramaya takılan hesapları da küçük veri setinde bul.
  const fallback = await getDocs(query(collection(db, 'users'), limit(100)));
  addDocs(
    fallback.docs.filter((d) => {
      const data = d.data();
      const username = normalizeSearchText(data.username || data.usernameLower || '');
      const displayName = normalizeSearchText(data.displayName || '');
      return username.startsWith(qPlain) || displayName.startsWith(qPlain) || username.includes(qPlain);
    }),
  );

  return Array.from(byId.values()).slice(0, 20);
}

// Galeriden seçilen (file://) fotoğrafı Storage'a yükler, indirme URL'i döndürür.
export async function uploadProfilePhoto(localUri, uid) {
  const blob = await uriToBlob(localUri);
  const storageRef = ref(storage, `profilePhotos/${uid}/${Date.now()}.jpg`);
  try {
    const task = uploadBytesResumable(storageRef, blob, { contentType: 'image/jpeg' });
    await new Promise((resolve, reject) => task.on('state_changed', null, reject, resolve));
  } finally {
    if (blob.close) blob.close();
  }
  return getDownloadURL(storageRef);
}

// Profil güncelle. data: { displayName, username, bio, photoURL? }
// setDoc(merge) kullanılır → eski (dokümanı olmayan) kullanıcılarda da çalışır.
export async function updateUserProfile(uid, data) {
  const patch = {};
  if (data.displayName !== undefined) patch.displayName = data.displayName.trim();
  if (data.username !== undefined) {
    const usernameLower = normalizeUsername(data.username);
    const error = validateUsername(usernameLower);
    if (error) throw new Error(error);

    const current = await getDoc(doc(db, 'users', uid));
    const oldUsername = current.exists() ? current.data().usernameLower || current.data().username : null;

    await runTransaction(db, async (tx) => {
      const newRef = doc(db, 'usernames', usernameLower);
      const newSnap = await tx.get(newRef);
      if (newSnap.exists() && newSnap.data().uid !== uid) {
        const e = new Error('Bu kullanıcı adı alınmış.');
        e.code = 'vayb/username-taken';
        throw e;
      }

      if (oldUsername && oldUsername !== usernameLower) {
        tx.delete(doc(db, 'usernames', oldUsername));
      }
      tx.set(newRef, {
        uid,
        username: usernameLower,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });

    patch.username = usernameLower;
    patch.usernameLower = usernameLower;
  }
  if (data.bio !== undefined) patch.bio = data.bio.trim();
  if (data.photoURL !== undefined) patch.photoURL = data.photoURL;
  if (data.isPrivate !== undefined) patch.isPrivate = !!data.isPrivate;

  await setDoc(doc(db, 'users', uid), patch, { merge: true });

  // Auth profilini de senkron tut (displayName / photoURL)
  const authPatch = {};
  if (patch.displayName !== undefined) authPatch.displayName = patch.displayName;
  if (patch.photoURL !== undefined) authPatch.photoURL = patch.photoURL;
  if (Object.keys(authPatch).length && auth.currentUser) {
    await updateProfile(auth.currentUser, authPatch);
  }
}

async function reauthWithPassword(password) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Oturum bulunamadı.');
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  return user;
}

export async function changeCurrentUserPassword(currentPassword, newPassword) {
  if (!currentPassword || newPassword.length < 6) {
    throw new Error('Şifre en az 6 karakter olmalı.');
  }
  const user = await reauthWithPassword(currentPassword);
  await updatePassword(user, newPassword);
}

async function commitBatch(ops) {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    ops.slice(i, i + 450).forEach((op) => op(batch));
    await batch.commit();
  }
}

// Storage klasörünü (ve alt klasörlerini) sil — best-effort, hata akışı bozmaz.
async function deleteStorageFolder(path) {
  try {
    const res = await listAll(ref(storage, path));
    await Promise.all(res.items.map((item) => deleteObject(item).catch(() => {})));
    await Promise.all(res.prefixes.map((p) => deleteStorageFolder(p.fullPath)));
  } catch (e) {
    /* klasör yok / izin yok → sessiz geç */
  }
}

export async function deleteCurrentUserAccount(currentPassword) {
  const user = await reauthWithPassword(currentPassword);
  const uid = user.uid;
  const userSnap = await getDoc(doc(db, 'users', uid));
  const usernameLower = userSnap.exists() ? userSnap.data().usernameLower || userSnap.data().username : null;

  const [postsSnap, myLikesSnap, myReactionsSnap, mySavesSnap, sentNotificationsSnap, receivedNotificationsSnap, followingSnap, followersSnap, myBlocksSnap, blockedMeSnap] = await Promise.all([
    getDocs(query(collection(db, 'posts'), where('authorUid', '==', uid))),
    getDocs(query(collection(db, 'likes'), where('uid', '==', uid))),
    getDocs(query(collection(db, 'reactions'), where('uid', '==', uid))),
    getDocs(query(collection(db, 'saves'), where('uid', '==', uid))),
    getDocs(query(collection(db, 'notifications'), where('fromUid', '==', uid))),
    getDocs(query(collection(db, 'notifications'), where('toUid', '==', uid))),
    getDocs(query(collection(db, 'follows'), where('followerUid', '==', uid))),
    getDocs(query(collection(db, 'follows'), where('followedUid', '==', uid))),
    getDocs(query(collection(db, 'blocks'), where('blockerUid', '==', uid))),
    getDocs(query(collection(db, 'blocks'), where('blockedUid', '==', uid))),
  ]);

  const ownedPostIds = postsSnap.docs.map((d) => d.id);
  const ownedPostLikes = [];
  const ownedPostReactions = [];
  const ownedPostSaves = [];
  for (const postId of ownedPostIds) {
    const [likesSnap, reactionsSnap, savesSnap] = await Promise.all([
      getDocs(query(collection(db, 'likes'), where('postId', '==', postId))),
      getDocs(query(collection(db, 'reactions'), where('postId', '==', postId))),
      getDocs(query(collection(db, 'saves'), where('postId', '==', postId))),
    ]);
    ownedPostLikes.push(...likesSnap.docs);
    ownedPostReactions.push(...reactionsSnap.docs);
    ownedPostSaves.push(...savesSnap.docs);
  }

  const ops = [];
  const deletedPaths = new Set();
  const addDelete = (refToDelete) => {
    if (deletedPaths.has(refToDelete.path)) return;
    deletedPaths.add(refToDelete.path);
    ops.push((batch) => batch.delete(refToDelete));
  };

  followingSnap.docs.forEach((d) => {
    const follow = d.data();
    addDelete(d.ref);
    if (follow.status === 'accepted' && follow.followedUid) {
      ops.push((batch) => batch.set(doc(db, 'users', follow.followedUid), { followersCount: increment(-1) }, { merge: true }));
    }
  });
  followersSnap.docs.forEach((d) => {
    const follow = d.data();
    addDelete(d.ref);
    if (follow.status === 'accepted' && follow.followerUid) {
      ops.push((batch) => batch.set(doc(db, 'users', follow.followerUid), { followingCount: increment(-1) }, { merge: true }));
    }
  });
  postsSnap.docs.forEach((d) => addDelete(d.ref));
  myLikesSnap.docs.forEach((d) => addDelete(d.ref));
  myReactionsSnap.docs.forEach((d) => addDelete(d.ref));
  mySavesSnap.docs.forEach((d) => addDelete(d.ref));
  sentNotificationsSnap.docs.forEach((d) => addDelete(d.ref));
  receivedNotificationsSnap.docs.forEach((d) => addDelete(d.ref));
  ownedPostLikes.forEach((d) => addDelete(d.ref));
  ownedPostReactions.forEach((d) => addDelete(d.ref));
  ownedPostSaves.forEach((d) => addDelete(d.ref));
  myBlocksSnap.docs.forEach((d) => addDelete(d.ref));
  blockedMeSnap.docs.forEach((d) => addDelete(d.ref));
  if (usernameLower) addDelete(doc(db, 'usernames', usernameLower));
  addDelete(doc(db, 'users', uid));
  addDelete(doc(db, 'userPrivate', uid));

  await commitBatch(ops);

  // Storage: kullanıcının post ve profil fotoğrafları (auth silinmeden ÖNCE).
  await Promise.all([
    deleteStorageFolder(`posts/${uid}`),
    deleteStorageFolder(`profilePhotos/${uid}`),
  ]);

  await deleteUser(user);
}
