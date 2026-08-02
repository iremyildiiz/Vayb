// chats.js — birebir, sade sohbet MVP'si.
//
// conversations/{uidA_uidB}
//   participantIds, participantKey, lastMessage, lastMessageAt, lastMessageSenderUid,
//   unreadBy, createdAt, updatedAt
// conversations/{conversationId}/messages/{messageId}
//   senderUid, text, createdAt, readBy

import {
  addDoc,
  arrayRemove,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export function conversationIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

export async function createOrGetConversation(otherUid) {
  const me = auth.currentUser?.uid;
  if (!me || !otherUid || me === otherUid) return null;

  const id = conversationIdFor(me, otherUid);
  const ref = doc(db, 'conversations', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participantIds: [me, otherUid],
      participantKey: id,
      lastMessage: '',
      lastMessageAt: null,
      lastMessageSenderUid: null,
      unreadBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return id;
}

export async function getConversations(uid) {
  const snap = await getDocs(query(collection(db, 'conversations'), where('participantIds', 'array-contains', uid)));
  const items = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    // Kişiye özel "Sohbeti sil": kullanıcı temizlediyse ve sonrasında YENİ mesaj
    // gelmemişse listeden gizle. Yeni mesaj gelince (lastMessageAt > clearedAt) döner.
    .filter((c) => {
      const clearedMs = c.clearedAt?.[uid]?.toMillis?.() || 0;
      if (!clearedMs) return true;
      const lastMs = c.lastMessageAt?.toMillis?.() || 0;
      return lastMs > clearedMs;
    });
  items.sort((a, b) => {
    const at = a.lastMessageAt?.toMillis?.() || a.updatedAt?.toMillis?.() || 0;
    const bt = b.lastMessageAt?.toMillis?.() || b.updatedAt?.toMillis?.() || 0;
    return bt - at;
  });
  return items;
}

// Kişiye özel sohbeti sil: yalnızca bu kullanıcının listesinden kaldırır.
// Karşı taraf ve mesaj geçmişi ETKİLENMEZ (sadece clearedAt damgası).
export async function clearConversation(conversationId, uid) {
  if (!conversationId || !uid) return;
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`clearedAt.${uid}`]: serverTimestamp(),
  });
}

export function subscribeMessages(conversationId, onNext, onError) {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export async function sendMessage(conversationId, text) {
  const me = auth.currentUser?.uid;
  const clean = (text || '').trim();
  if (!me || !conversationId || !clean) return;

  const convRef = doc(db, 'conversations', conversationId);
  const convSnap = await getDoc(convRef);
  if (!convSnap.exists()) return;

  const participantIds = convSnap.data().participantIds || [];
  const others = participantIds.filter((uid) => uid !== me);
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderUid: me,
    text: clean,
    createdAt: serverTimestamp(),
    readBy: [me],
  });
  await setDoc(convRef, {
    lastMessage: clean,
    lastMessageAt: serverTimestamp(),
    lastMessageSenderUid: me,
    unreadBy: others,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function markConversationRead(conversationId, uid) {
  if (!conversationId || !uid) return;
  await updateDoc(doc(db, 'conversations', conversationId), {
    unreadBy: arrayRemove(uid),
  });
}

export async function getUnreadConversationCount(uid) {
  const conversations = await getConversations(uid);
  return conversations.filter((c) => (c.unreadBy || []).includes(uid)).length;
}
