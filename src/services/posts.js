// posts.js — gönderi oluşturma (Storage yükleme + Firestore kaydı).
// Anayasa §6 veri modeli: posts/{postId} → authorUid, imageURL, caption,
// createdAt, location, likesCount.

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, storage } from './firebase';

// Yerel dosyayı gerçek bir RN blob'una çevir (XHR). uploadString/base64 RN'de
// "Creating blobs from ArrayBuffer" hatası verdiği için bu yol gerekli.
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

// Yerel dosyayı Storage'a yükler, indirilebilir URL döndürür.
async function uploadImageAsync(localUri, uid) {
  if (localUri.startsWith('ph://') || localUri.startsWith('assets-library')) {
    throw new Error('Fotoğrafın dosya yolu çözülemedi (ph://). Tekrar seçip dene.');
  }

  console.log('[upload] A. blob oluşturuluyor, uri:', localUri.slice(0, 40));
  const blob = await uriToBlob(localUri);
  console.log('[upload] B. blob hazır, boyut:', blob?.size, 'tip:', blob?.type);

  const storageRef = ref(storage, `posts/${uid}/${Date.now()}.jpg`);
  try {
    console.log('[upload] C. uploadBytesResumable başlıyor…');
    const task = uploadBytesResumable(storageRef, blob, { contentType: 'image/jpeg' });
    await new Promise((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => console.log('[upload] … ilerleme:', snap.bytesTransferred, '/', snap.totalBytes),
        (err) => { console.warn('[upload] X. upload hata:', err?.code); reject(err); },
        () => { console.log('[upload] D. upload TAMAM'); resolve(); },
      );
    });
  } finally {
    if (blob.close) blob.close();
  }

  console.log('[upload] E. downloadURL alınıyor…');
  const url = await getDownloadURL(storageRef);
  console.log('[upload] F. downloadURL alındı ✓');
  return url;
}

// Yeni gönderi oluştur. { uri, caption, locationName, width, height } alır.
export async function createPost({ uri, caption, locationName, width, height }) {
  const user = auth.currentUser;
  if (!user) throw new Error('Oturum yok.');
  if (!uri) throw new Error('Fotoğraf seçilmedi.');

  const imageURL = await uploadImageAsync(uri, user.uid);
  console.log('[post] G. Firestore posts dokümanı yazılıyor…');

  const post = {
    authorUid: user.uid,
    authorName: user.displayName || '',
    imageURL,
    // Masonry ızgarada doğru en-boy oranı için (opsiyonel)
    imageWidth: width || null,
    imageHeight: height || null,
    caption: (caption || '').trim(),
    location: locationName?.trim() ? { name: locationName.trim(), lat: null, lng: null } : null,
    createdAt: serverTimestamp(),
    pariltiCount: 0, // "parıltı" sayacı (beğeni değil)
  };

  const docRef = await addDoc(collection(db, 'posts'), post);
  console.log('[post] H. posts dokümanı yazıldı ✓ id:', docRef.id);
  return { id: docRef.id, ...post };
}

export async function getPost(postId) {
  const snap = await getDoc(doc(db, 'posts', postId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function deletePost(postId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Oturum yok.');

  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) return;
  if (postSnap.data().authorUid !== user.uid) throw new Error('Bu anı yalnızca sahibi silebilir.');

  const [likesSnap, reactionsSnap, savesSnap, notificationsSnap] = await Promise.all([
    getDocs(query(collection(db, 'likes'), where('postId', '==', postId))),
    getDocs(query(collection(db, 'reactions'), where('postId', '==', postId))),
    getDocs(query(collection(db, 'saves'), where('postId', '==', postId))),
    getDocs(query(collection(db, 'notifications'), where('postId', '==', postId))),
  ]);

  const refs = [
    postRef,
    ...likesSnap.docs.map((d) => d.ref),
    ...reactionsSnap.docs.map((d) => d.ref),
    ...savesSnap.docs.map((d) => d.ref),
    ...notificationsSnap.docs.map((d) => d.ref),
  ];
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db);
    refs.slice(i, i + 450).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}
