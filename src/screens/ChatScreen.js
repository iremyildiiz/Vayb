// ChatScreen — birebir sade metin sohbeti.

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import Screen from '../components/Screen';
import ModerationSheet from '../components/ModerationSheet';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createOrGetConversation, markConversationRead, sendMessage, subscribeMessages } from '../services/chats';
import { getUserProfile } from '../services/users';
import { isBlocked, isBlockedEitherWay, blockUser, unblockUser, reportUser } from '../services/moderation';

function displayUser(info) {
  if (!info) return 'vayb kullanıcısı';
  return info.username || info.displayName || 'vayb kullanıcısı';
}

function messageTime(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date) return '';
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients, sunset } = theme;
  const { user } = useAuth();
  const initialConversationId = route?.params?.conversationId || null;
  const otherUid = route?.params?.otherUid;

  const [conversationId, setConversationId] = useState(initialConversationId);
  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [modOpen, setModOpen] = useState(false);
  const [iBlocked, setIBlocked] = useState(false); // ben mi engelledim
  const [blockedEither, setBlockedEither] = useState(false); // her iki yön (DM engeli)

  const loadBlockState = useCallback(async () => {
    if (!otherUid) return;
    try {
      const [mine, either] = await Promise.all([isBlocked(otherUid), isBlockedEitherWay(otherUid)]);
      setIBlocked(mine);
      setBlockedEither(either);
    } catch (e) { /* sessiz geç */ }
  }, [otherUid]);

  useEffect(() => { loadBlockState(); }, [loadBlockState]);

  const onBlockToggle = async () => {
    setModOpen(false);
    try {
      if (iBlocked) await unblockUser(otherUid);
      else await blockUser(otherUid);
      await loadBlockState();
    } catch (e) {
      Alert.alert('İşlem başarısız', 'Engelleme güncellenemedi. Bağlantını kontrol edip tekrar dene.');
    }
  };

  const onReport = async (reason) => {
    setModOpen(false);
    try {
      await reportUser(otherUid, reason);
      Alert.alert('Bildirin alındı', 'İncelenmek üzere iletildi. Teşekkürler.');
    } catch (e) {
      Alert.alert('Gönderilemedi', 'Şikayet iletilemedi. Tekrar dene.');
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (otherUid) {
          const profile = await getUserProfile(otherUid);
          if (alive) setOther(profile);
        }
        if (!conversationId && otherUid) {
          const id = await createOrGetConversation(otherUid);
          if (alive) setConversationId(id);
        }
      } catch (e) {
        /* sessiz geç */
      } finally {
        if (alive && !otherUid && !conversationId) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [conversationId, otherUid]);

  useEffect(() => {
    if (!conversationId) return undefined;
    setLoading(true);
    const unsub = subscribeMessages(
      conversationId,
      async (rows) => {
        setMessages(rows);
        setLoading(false);
        try { await markConversationRead(conversationId, user.uid); } catch (e) {}
      },
      (e) => {
        console.warn('[chat] mesajlar yüklenemedi:', e?.code || e?.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [conversationId, user.uid]);

  const onSend = useCallback(async () => {
    if (!conversationId || sending || !text.trim()) return;
    if (blockedEither) {
      Alert.alert('Mesaj gönderilemedi', 'Engel nedeniyle bu kullanıcıyla mesajlaşamazsın.');
      return;
    }
    const next = text;
    setText('');
    setSending(true);
    try {
      await sendMessage(conversationId, next);
    } catch (e) {
      console.warn('[chat] mesaj gönderilemedi:', e?.code || e?.message);
      setText(next);
    } finally {
      setSending(false);
    }
  }, [conversationId, sending, text, blockedEither]);

  const initial = displayUser(other).trim().charAt(0).toUpperCase() || '?';

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => otherUid && navigation.navigate('UserProfile', { uid: otherUid })}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.sm }}
            hitSlop={6}
          >
            {other?.photoURL ? (
              <Image source={{ uri: other.photoURL }} style={{ width: 30, height: 30, borderRadius: radius.pill }} />
            ) : (
              <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 30, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.caption, color: '#FFFFFF' }}>{initial}</Text>
              </LinearGradient>
            )}
            <Text numberOfLines={1} style={{ marginLeft: spacing.sm, fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
              {displayUser(other)}
            </Text>
          </Pressable>
          {otherUid ? (
            <Pressable onPress={() => setModOpen(true)} hitSlop={8} style={{ width: 26, alignItems: 'flex-end' }}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, flexGrow: 1, justifyContent: messages.length ? 'flex-end' : 'center' }}
          >
            {messages.length ? (
              messages.map((message) => {
                const mine = message.senderUid === user.uid;
                return (
                  <View key={message.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: spacing.sm }}>
                    <View
                      style={{
                        maxWidth: '78%',
                        borderRadius: radius.input,
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.md,
                        backgroundColor: mine ? 'rgba(255,122,92,0.14)' : colors.surface,
                        borderWidth: 1,
                        borderColor: mine ? 'rgba(255,122,92,0.20)' : colors.border,
                      }}
                    >
                      <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.body, color: colors.textPrimary, lineHeight: 20 }}>
                        {message.text}
                      </Text>
                    </View>
                    {messageTime(message.createdAt) ? (
                      <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginTop: 3, marginHorizontal: spacing.xs }}>
                        {messageTime(message.createdAt)}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl }}>
                <Ionicons name="paper-plane-outline" size={38} color={colors.textMuted} />
                <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }}>
                  İlk mesajı sen gönder.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {blockedEither ? (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.bg }}>
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, textAlign: 'center' }}>
              {iBlocked ? 'Bu kullanıcıyı engelledin. Mesaj gönderemezsin.' : 'Engel nedeniyle bu kullanıcıyla mesajlaşamazsın.'}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, backgroundColor: colors.bg }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Mesaj yaz..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              style={{ flex: 1, maxHeight: 96, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontFamily: typography.fontBody, fontSize: typography.size.body, color: colors.textPrimary, backgroundColor: colors.surface }}
            />
            <Pressable
              onPress={onSend}
              disabled={!text.trim() || sending}
              style={{ width: 40, height: 40, borderRadius: radius.pill, marginLeft: spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() ? sunset.orange : colors.border, opacity: sending ? 0.6 : 1 }}
              hitSlop={6}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        )}

        <ModerationSheet
          visible={modOpen}
          onClose={() => setModOpen(false)}
          targetLabel={displayUser(other)}
          reportLabel="Kullanıcıyı şikayet et"
          showBlock
          blocked={iBlocked}
          onBlockToggle={onBlockToggle}
          onReport={onReport}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
