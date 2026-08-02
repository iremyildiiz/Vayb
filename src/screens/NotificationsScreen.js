// NotificationsScreen — takip istekleri + parıltı + his tek merkez.

import { useCallback, useState } from 'react';
import { View, Text, Image, Pressable, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../services/users';
import { getPost } from '../services/posts';
import { getPendingRequests, acceptRequest, rejectRequest } from '../services/follows';
import { getNotificationsForMe, markNotificationsRead } from '../services/notifications';

function zamanOnce(createdAt, fallback) {
  const date = createdAt?.toDate ? createdAt.toDate() : fallback ? new Date(fallback) : null;
  if (!date) return 'az önce';
  const sn = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sn < 60) return 'az önce';
  const dk = Math.floor(sn / 60);
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} sa önce`;
  const g = Math.floor(sa / 24);
  if (g < 7) return `${g} g önce`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients } = theme;
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [reqs, notifs] = await Promise.all([
        getPendingRequests(user.uid),
        getNotificationsForMe(user.uid),
      ]);

      const requestItems = await Promise.all(reqs.map(async (r) => ({
        id: `follow_${r.followerUid}`,
        kind: 'follow_request',
        createdAt: r.createdAt,
        fromUid: r.followerUid,
        profile: await getUserProfile(r.followerUid),
      })));

      const notificationItems = await Promise.all(notifs.map(async (n) => {
        const [profile, post] = await Promise.all([
          getUserProfile(n.fromUid),
          n.postId ? getPost(n.postId) : null,
        ]);
        return { ...n, id: n.id, kind: n.type, profile, post };
      }));

      const mixed = [...requestItems, ...notificationItems].sort((a, b) => {
        const bt = b.createdAt?.toMillis?.() || b.clientCreatedAt || 0;
        const at = a.createdAt?.toMillis?.() || a.clientCreatedAt || 0;
        return bt - at;
      });
      setItems(mixed);
      await markNotificationsRead(user.uid);
    } catch (e) {
      console.warn('[notifications] yüklenemedi:', e?.code || e?.message);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRequest = async (fromUid, accept) => {
    setBusy(fromUid);
    try {
      if (accept) await acceptRequest(fromUid);
      else await rejectRequest(fromUid);
      setItems((prev) => prev.filter((it) => it.fromUid !== fromUid || it.kind !== 'follow_request'));
    } catch (e) {
      /* sessiz geç */
    } finally {
      setBusy(null);
    }
  };

  const displayName = (p) => p?.username || p?.displayName || 'vayb kullanıcısı';

  const Avatar = ({ profile }) => {
    const initial = (profile?.username || profile?.displayName || '?').trim().charAt(0).toUpperCase() || '?';
    return profile?.photoURL ? (
      <Image source={{ uri: profile.photoURL }} style={{ width: 42, height: 42, borderRadius: radius.pill }} />
    ) : (
      <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.footnote, color: '#FFFFFF' }}>{initial}</Text>
      </LinearGradient>
    );
  };

  const renderItem = ({ item }) => {
    const isBusy = busy === item.fromUid;
    const name = displayName(item.profile);
    let text = `${name} anını parlattı`;
    if (item.kind === 'reaction') text = `${name} anına "${item.reaction}" bıraktı`;
    if (item.kind === 'follow_request') text = `${name} Vaybına katılmak istiyor`;

    return (
      <Pressable
        onPress={() => {
          if (item.kind === 'follow_request') navigation.navigate('UserProfile', { uid: item.fromUid });
          else if (item.post) navigation.navigate('PostDetail', { post: item.post });
        }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, opacity: pressed ? 0.65 : 1 })}
      >
        <Avatar profile={item.profile} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary, lineHeight: 20 }}>
            {text}
          </Text>
          <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginTop: 2 }}>
            {zamanOnce(item.createdAt, item.clientCreatedAt)}
          </Text>
          {item.kind === 'follow_request' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
              {isBusy ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <>
                  <Pressable onPress={() => handleRequest(item.fromUid, true)} hitSlop={6} style={{ marginRight: spacing.sm }}>
                    <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, borderRadius: radius.button }}>
                      <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: '#FFFFFF' }}>Onayla</Text>
                    </LinearGradient>
                  </Pressable>
                  <Pressable onPress={() => handleRequest(item.fromUid, false)} hitSlop={6} style={{ paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, borderRadius: radius.button, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textPrimary }}>Sil</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : null}
        </View>
        {item.post?.imageURL ? (
          <Image source={{ uri: item.post.imageURL, cache: 'force-cache' }} style={{ width: 46, height: 46, borderRadius: radius.input, backgroundColor: colors.border }} />
        ) : item.kind !== 'follow_request' ? (
          <Ionicons name="image-outline" size={22} color={colors.textMuted} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
          Bildirimler
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} colors={[colors.accent]} />}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl * 2 }}>
              <Ionicons name="notifications-outline" size={44} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginTop: spacing.sm }}>
                Şimdilik sessiz.
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}
