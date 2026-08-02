// FollowRequestsScreen — gizli hesabıma gelen takip isteklerini yönet (Faz 6A).

import { useState, useCallback } from 'react';
import { View, Text, Image, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../services/users';
import { getPendingRequests, acceptRequest, rejectRequest } from '../services/follows';

export default function FollowRequestsScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients } = theme;
  const { user } = useAuth();

  const [items, setItems] = useState([]); // { followerUid, profile }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // işlenen followerUid

  const load = useCallback(async () => {
    try {
      const reqs = await getPendingRequests(user.uid);
      const withProfiles = await Promise.all(
        reqs.map(async (r) => ({ followerUid: r.followerUid, profile: await getUserProfile(r.followerUid) })),
      );
      setItems(withProfiles);
    } catch (e) {
      /* sessiz geç */
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handle = async (followerUid, accept) => {
    setBusy(followerUid);
    try {
      if (accept) await acceptRequest(followerUid);
      else await rejectRequest(followerUid);
      setItems((prev) => prev.filter((it) => it.followerUid !== followerUid));
    } catch (e) {
      /* sessiz geç */
    } finally {
      setBusy(null);
    }
  };

  const renderItem = ({ item }) => {
    const p = item.profile || {};
    const uname = p.username || p.displayName || 'vayb kullanıcısı';
    const initial = (p.username || p.displayName || '?').trim().charAt(0).toUpperCase() || '?';
    const isBusy = busy === item.followerUid;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }}>
        <Pressable onPress={() => navigation.navigate('UserProfile', { uid: item.followerUid })}>
          {p.photoURL ? (
            <Image source={{ uri: p.photoURL }} style={{ width: 44, height: 44, borderRadius: radius.pill }} />
          ) : (
            <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.body, color: '#FFFFFF' }}>{initial}</Text>
            </LinearGradient>
          )}
        </Pressable>

        <Pressable style={{ flex: 1, marginHorizontal: spacing.md }} onPress={() => navigation.navigate('UserProfile', { uid: item.followerUid })}>
          <Text numberOfLines={1} style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
            {uname}
          </Text>
          {p.displayName && p.username ? (
            <Text numberOfLines={1} style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted }}>
              {p.displayName}
            </Text>
          ) : null}
        </Pressable>

        {isBusy ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => handle(item.followerUid, true)} hitSlop={6} style={{ marginRight: spacing.sm }}>
              <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, borderRadius: radius.button }}>
                <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: '#FFFFFF' }}>Onayla</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => handle(item.followerUid, false)} hitSlop={6} style={{ paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, borderRadius: radius.button, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textPrimary }}>Sil</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
          Takip istekleri
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
          keyExtractor={(it) => it.followerUid}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl * 2 }}>
              <Ionicons name="checkmark-done-outline" size={44} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginTop: spacing.sm }}>
                Bekleyen istek yok.
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}
