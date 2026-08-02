// ConversationsScreen — sade sohbet listesi.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getConversations, clearConversation } from '../services/chats';
import { getUserProfile } from '../services/users';

function displayUser(info) {
  if (!info) return 'vayb kullanıcısı';
  return info.username || info.displayName || 'vayb kullanıcısı';
}

function timeText(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date) return '';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function ConversationsScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients } = theme;
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const conversations = await getConversations(user.uid);
      const rows = await Promise.all(
        conversations.map(async (conversation) => {
          const otherUid = (conversation.participantIds || []).find((uid) => uid !== user.uid);
          let profile = null;
          try { profile = await getUserProfile(otherUid); } catch (e) {}
          return { conversation, otherUid, profile };
        }),
      );
      setItems(rows.filter((row) => row.otherUid));
    } catch (e) {
      console.warn('[chats] sohbetler yüklenemedi:', e?.code || e?.message);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDeleteConversation = useCallback((conversationId) => {
    Alert.alert(
      'Sohbeti sil',
      'Bu sohbet listenden kaldırılacak. Yeni mesaj gelirse tekrar görünür.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sohbeti sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearConversation(conversationId, user.uid);
              setItems((prev) => prev.filter((row) => row.conversation.id !== conversationId));
            } catch (e) {
              console.warn('[chats] sohbet silinemedi:', e?.code || e?.message);
            }
          },
        },
      ],
    );
  }, [user.uid]);

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
          Sohbet
        </Text>
        <Pressable onPress={() => navigation.navigate('NewChat')} accessibilityLabel="Yeni sohbet" hitSlop={8} style={{ width: 26, alignItems: 'flex-end' }}>
          <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} colors={[colors.accent]} />}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 }}
        >
          {items.length ? (
            <View style={{ gap: spacing.md }}>
              {items.map(({ conversation, otherUid, profile }) => {
                const unread = (conversation.unreadBy || []).includes(user.uid);
                const initial = displayUser(profile).trim().charAt(0).toUpperCase() || '?';
                return (
                  <Pressable
                    key={conversation.id}
                    onPress={() => navigation.navigate('Chat', { conversationId: conversation.id, otherUid })}
                    onLongPress={() => onDeleteConversation(conversation.id)}
                    delayLongPress={300}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs }}
                    hitSlop={6}
                  >
                    {profile?.photoURL ? (
                      <Image source={{ uri: profile.photoURL }} style={{ width: 46, height: 46, borderRadius: radius.pill }} />
                    ) : (
                      <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.body, color: '#FFFFFF' }}>{initial}</Text>
                      </LinearGradient>
                    )}
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text numberOfLines={1} style={{ flex: 1, fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
                          {displayUser(profile)}
                        </Text>
                        <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginLeft: spacing.sm }}>
                          {timeText(conversation.lastMessageAt)}
                        </Text>
                      </View>
                      <Text numberOfLines={1} style={{ fontFamily: unread ? typography.fontBodyMedium : typography.fontBody, fontSize: typography.size.footnote, color: unread ? colors.textPrimary : colors.textMuted, marginTop: 3 }}>
                        {conversation.lastMessage || 'Sohbet başladı'}
                      </Text>
                    </View>
                    {unread ? <View style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.accent, marginLeft: spacing.sm }} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xxl }}>
              <Ionicons name="paper-plane-outline" size={42} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary, marginTop: spacing.md }}>
                Henüz sohbet yok
              </Text>
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 260, lineHeight: 20 }}>
                Sağ üstten kullanıcı arayıp sohbet başlatabilirsin.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
